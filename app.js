// const express = require('express')
// const cors = require('cors') // cors中间件
// const multer = require('multer')
// const decode = require('image-decode')
// const tf = require('@tensorflow/tfjs-node')
// const nsfw = require('nsfwjs')
// const axios = require('axios')
// const bodyParser = require('body-parser');

// const app = express()
// const upload = multer()
// app.use(bodyParser.json()); // 解析 JSON 格式的请求体
// app.use(bodyParser.urlencoded({ extended: true })); // 解析 URL-encoded 格式的请求体


// let _model

// const convert = async (img) => {
//   // image-decode模块用于解码图片
//   const { data, width, height } = decode(img)

//   const numChannels = 3
//   const numPixels = width * height
//   const values = new Int32Array(numPixels * numChannels)

//   for (let i = 0; i < numPixels; i++)
//     for (let c = 0; c < numChannels; ++c)
//       values[i * numChannels + c] = data[i * 4 + c]

//   return tf.tensor3d(values, [height, width, numChannels], 'int32')
// }

// app.use(cors())

// app.post('/nsfw', upload.single('image'), async (req, res) => {
//   if (!req.file) {
//     res.status(400).send('Missing image multipart/form-data')
//   } else {
//     const image = await convert(req.file.buffer)
//     const predictions = await _model.classify(image)
//     image.dispose()

//     const formattedPredictions = predictions.map(
//       ({ className, probability }) => ({
//         className,
//         probability: (probability * 100).toFixed(2) + '%'
//       })
//     )

//     const sensitiveClasses = ['Hentai', 'Porn', 'Sexy']
//     const isUnhealthy = formattedPredictions.some(
//       ({ className, probability }) =>
//         sensitiveClasses.includes(className) && parseFloat(probability) > 30
//     )

//     const result = {
//       file: req.file.originalname,
//       predictions: formattedPredictions,
//       isHealthy: !isUnhealthy
//     }

//     // res.json(result)
//     res.send({
//       status: 200,
//       result
//     })
//   }
// })

// app.post('/nsfws', upload.array('images', 10), async (req, res) => {
//   console.log('files',req.files);
//   if (!req.files || req.files.length === 0) {
//     res.status(400).send('Missing image(s) multipart/form-data')
//   } else if (req.files.length > 10) {
//     res.status(400).send('最多支持10张')
//   } else {
//     const promises = req.files.map(async (file) => {
//       const image = await convert(file.buffer)
//       const predictions = await _model.classify(image)
//       image.dispose()

//       const formattedPredictions = predictions.map(
//         ({ className, probability }) => ({
//           className,
//           probability: (probability * 100).toFixed(2) + '%'
//         })
//       )

//       const sensitiveClasses = ['Hentai', 'Porn', 'Sexy']
//       const isUnhealthy = formattedPredictions.some(
//         ({ className, probability }) =>
//           sensitiveClasses.includes(className) && parseFloat(probability) > 30
//       )

//       const result = {
//         file: file.originalname,
//         predictions: formattedPredictions,
//         isHealthy: !isUnhealthy
//       }

//       return result
//     })

//     const allResults = await Promise.all(promises)
//     // res.json(allResults)
//     res.send({
//       status: 200,
//       allResults
//     })
//   }
// })

// // 新添加的 API 路由来支持链接形式检查图片内容
// app.get('/nsfw-link', async (req, res) => {
//   const imageUrl = req.query.image_url; // 获取提交的图片链接
//   if (!imageUrl) {
//     return res.status(400).send('Missing image_url in request body');
//   }

//   try {
//     // 使用 axios 发起 GET 请求获取图片数据
//     const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
//     const imageBuffer = Buffer.from(response.data);
//     const image = await convert(imageBuffer);
//     const predictions = await _model.classify(image);
//     image.dispose();

//     const formattedPredictions = predictions.map(
//       ({ className, probability }) => ({
//         className,
//         probability: (probability * 100).toFixed(2) + '%'
//       })
//     );

//     const sensitiveClasses = ['Hentai', 'Porn', 'Sexy'];
//     const isUnhealthy = formattedPredictions.some(
//       ({ className, probability }) =>
//         sensitiveClasses.includes(className) && parseFloat(probability) > 30
//     );

//     const result = {
//       image_url: imageUrl,
//       predictions: formattedPredictions,
//       isHealthy: !isUnhealthy
//     };

//     // res.json(result);
//     res.send({
//       status: 200,
//       result
//     })
//   } catch (error) {
//     console.error(`An error occurred while processing image from ${imageUrl}: ${error.message}`);
//     return res.status(500).json({ error: 'Internal server error.' });
//   }
// });

// // 新添加的 API 路由来支持链接形式检查图片内容
// app.post('/nsfw-links', async (req, res) => {
//   const imageUrls = req.body.image_urls; // 获取提交的图片链接数组

//   if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
//     return res.status(400).send('Invalid image_urls in request body');
//   }

//   if (imageUrls.length > 10) return res.status(400).send('最多支持10张')

//   try {
//     const results = await Promise.all(
//       imageUrls.map(async (imageUrl) => {
//         // 使用 axios 发起 GET 请求获取图片数据
//         const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
//         const imageBuffer = Buffer.from(response.data);
//         const image = await convert(imageBuffer);
//         const predictions = await _model.classify(image);
//         image.dispose();

//         const formattedPredictions = predictions.map(
//           ({ className, probability }) => ({
//             className,
//             probability: (probability * 100).toFixed(2) + '%'
//           })
//         );

//         const sensitiveClasses = ['Hentai', 'Porn', 'Sexy'];
//         const isUnhealthy = formattedPredictions.some(
//           ({ className, probability }) =>
//             sensitiveClasses.includes(className) && parseFloat(probability) > 30
//         );

//         return {
//           image_url: imageUrl,
//           predictions: formattedPredictions,
//           isHealthy: !isUnhealthy
//         };
//       })
//     );

//     // res.json(results);
//     res.send({
//       status: 200,
//       results
//     })
//   } catch (error) {
//     console.error('An error occurred while processing images:', error.message);
//     return res.status(500).json({ error: 'Internal server error.' });
//   }
// });


// const load_model = async () => {
//   _model = await nsfw.load()
// }

// app.use((err, req, res, next) => res.status(500).json({ error: `服务器内部错误。${err.message}` }))

// // Keep the model in memory, make sure it's loaded only once
// load_model().then(() => app.listen(80, () => console.log('start')))

// // curl --request POST localhost:8080/nsfw --header 'Content-Type: multipart/form-data' --data-binary 'image=@/full/path/to/picture.jpg'


const express = require('express');
const cors = require('cors');
const multer = require('multer');
const decode = require('image-decode');
const tf = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');
const axios = require('axios');
const bodyParser = require('body-parser');

const MAX_CONCURRENT_REQUESTS = 4; // 设置最大并发请求数

const app = express();
const upload = multer();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

let _model;

const converts = async (img) => {
  const decodedImage = await tf.node.decodeImage(img, 3);
  return decodedImage;
};


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

const processImage = async (imageBuffer) => {
  const image = await converts(imageBuffer);
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
      sensitiveClasses.includes(className) && parseFloat(probability) > 30
  );

  return {
    predictions: formattedPredictions,
    isHealthy: !isUnhealthy
  };
};

app.post('/nsfws', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('Missing image(s) multipart/form-data');
    }

    const imageFiles = req.files;
    if (imageFiles.length > 10) {
      return res.status(400).send('最多支持10张');
    }

    const results = [];
    const concurrentPromises = [];

    for (const file of imageFiles) {
      const promise = processImage(file.buffer)
        .then(result => results.push(result))
        .catch(error => console.error(`Error processing image: ${error.message}`));
      concurrentPromises.push(promise);

      if (concurrentPromises.length >= MAX_CONCURRENT_REQUESTS) {
        await Promise.all(concurrentPromises);
        concurrentPromises.length = 0;
      }
    }

    await Promise.all(concurrentPromises);

    res.send({
      status: 200,
      allResults: results
    });
  } catch (error) {
    console.error('An error occurred while processing images:', error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/nsfw-link', async (req, res) => {
  const imageUrl = req.query.image_url;
  if (!imageUrl) {
    return res.status(400).send('Missing image_url in request body');
  }

  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);
    const result = await processImage(imageBuffer);

    res.send({
      status: 200,
      result
    });
  } catch (error) {
    console.error(`An error occurred while processing image from ${imageUrl}: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/nsfw-links', async (req, res) => {
  try {
    const imageUrls = req.body.image_urls;
    if (!Array.isArray(imageUrls) || imageUrls.length === 0 || imageUrls.length > 10) {
      return res.status(400).send('Invalid image_urls in request body');
    }

    const results = await Promise.all(
      imageUrls.map(async (imageUrl) => {
        try {
          const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data);
          return await processImage(imageBuffer);
        } catch (error) {
          console.error(`Error processing image from ${imageUrl}: ${error.message}`);
          return {
            predictions: [],
            isHealthy: false
          };
        }
      })
    );

    res.send({
      status: 200,
      results
    });
  } catch (error) {
    console.error('An error occurred while processing images:', error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(`服务器内部错误。${err.message}`);
  res.status(500).json({ error: `服务器内部错误。${err.message}` });
});

// 在服务器关闭之前释放模型资源
process.on('beforeExit', () => {
  if (_model) {
    _model.dispose();
  }
});

const loadModel = async () => {
  _model = await nsfw.load();
};

loadModel().then(() => {
  app.listen(80, () => console.log('Server started on port 80'));
});
