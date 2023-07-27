const express = require('express');
const cors = require('cors');
const axios = require('axios');
const imageType = require('image-type');
const multer = require('multer');
const decode = require('image-decode');
const tf = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');

const app = express();
const upload = multer();
const MAX_IMAGES_ALLOWED = 10;

let _model;

// 辅助函数：检查是否为图片类型
async function isImageType(data) {
  if (typeof data === 'string') {
    try {
      const response = await axios.head(data);
      if (response.headers['content-type']) {
        const contentType = response.headers['content-type'];
        const type = imageType(Buffer.from(contentType, 'utf-8'));
        return !!type;
      }
    } catch (error) {
      return false;
    }
  } else if (data instanceof Buffer) {
    const type = imageType(data);
    return !!type;
  }
  return false;
}

const convert = async (img) => {
  const { data, width, height } = decode(img);

  const numChannels = 3;
  const numPixels = width * height;
  const values = new Int32Array(numPixels * numChannels);

  for (let i = 0; i < numPixels; i++)
    for (let c = 0; c < numChannels; ++c)
      values[i * numChannels + c] = data[i * 4 + c];

  return tf.tensor3d(values, [height, width, numChannels], 'int32');
};

app.use(cors());

// 单张图像 API
app.post('/nsfw', upload.single('image'), async (req, res) => {
  let imageData;
  if (req.file) {
    imageData = req.file.buffer;
  } else if (req.body.imageUrl) {
    const imageUrl = req.body.imageUrl;
    const isValidImage = await isImageType(imageUrl);
    if (!isValidImage) {
      res.status(400).send('无效的图片链接或不是图片类型。');
      return;
    }

    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      imageData = Buffer.from(response.data);
    } catch (error) {
      res.status(500).send('从图片链接获取图片数据时发生错误。');
      return;
    }
  } else {
    res.status(400).send('请求中缺少图片数据或图片链接。');
    return;
  }

  try {
    const image = await convert(imageData);
    const predictions = await _model.classify(image);
    image.dispose();

    const formattedPredictions = predictions.map(
      ({ className, probability }) => ({
        className,
        probability: (probability * 100).toFixed(2) + '%'
      })
    );

    const sensitiveClasses = ['Hentai', 'Porn', 'Sexy'];
    const isUnhealthy = formattedPredictions.some(
      ({ className, probability }) =>
        sensitiveClasses.includes(className) && parseFloat(probability) > 10
    );

    const result = {
      file: req.file ? req.file.originalname : req.body.imageUrl,
      predictions: formattedPredictions,
      isHealthy: !isUnhealthy
    };

    res.json(result);
  } catch (error) {
    res.status(500).send('处理图片时发生错误。');
  }
});

// 多张图像 API
app.post('/nsfws', upload.array('images', 10), async (req, res) => {
  const imageUrls = req.body.imageUrls;
  let imageDataArray = [];

  if (req.files && req.files.length > 0) {
    imageDataArray = req.files.map((file) => file.buffer);
  } else if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    if (imageUrls.length > MAX_IMAGES_ALLOWED) {
      res.status(400).send('最多支持10张图像。');
      return;
    }

    const isValidImages = await Promise.all(imageUrls.map(isImageType));
    if (!isValidImages.every((isValid) => isValid)) {
      res.status(400).send('无效的图片链接或不是图片类型。');
      return;
    }

    try {
      const responses = await Promise.all(imageUrls.map((url) => axios.get(url, { responseType: 'arraybuffer' })));
      imageDataArray = responses.map((response) => Buffer.from(response.data));
    } catch (error) {
      res.status(500).send('从图片链接获取图片数据时发生错误。');
      return;
    }
  } else {
    res.status(400).send('请求中缺少图片数据或图片链接。');
    return;
  }

  try {
    const promises = imageDataArray.map(async (imageData, index) => {
      const image = await convert(imageData);
      const predictions = await _model.classify(image);
      image.dispose();

      const formattedPredictions = predictions.map(
        ({ className, probability }) => ({
          className,
          probability: (probability * 100).toFixed(2) + '%'
        })
      );

      const sensitiveClasses = ['Hentai', 'Porn', 'Sexy'];
      const isUnhealthy = formattedPredictions.some(
        ({ className, probability }) =>
          sensitiveClasses.includes(className) && parseFloat(probability) > 10
      );

      const result = {
        file: imageUrls[index],
        predictions: formattedPredictions,
        isHealthy: !isUnhealthy
      };

      return result;
    });

    const allResults = await Promise.all(promises);
    res.json(allResults);
  } catch (error) {
    res.status(500).send('处理图片时发生错误。');
  }
});

const load_model = async () => {
  _model = await nsfw.load();
};

app.use((err, req, res, next) => res.status(500).send('发生错误：' + err.message));

// 加载模型，并保持在内存中，确保只加载一次
load_model().then(() => app.listen(80, () => console.log('服务器已启动')));