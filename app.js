const express = require('express')
const cors = require('cors')
const multer = require('multer')
const decode = require('image-decode')
const tf = require('@tensorflow/tfjs-node')
const nsfw = require('nsfwjs')
const fetch = require('node-fetch') // 引入node-fetch库

const app = express()
const upload = multer()

let _model

const isImageType = (buffer) => {
  try {
    decode(buffer)
    return true
  } catch (error) {
    return false
  }
}

const convert = async (img) => {
  const { data, width, height } = decode(img)

  const numChannels = 3
  const numPixels = width * height
  const values = new Int32Array(numPixels * numChannels)

  for (let i = 0; i < numPixels; i++)
    for (let c = 0; c < numChannels; ++c)
      values[i * numChannels + c] = data[i * 4 + c]

  return tf.tensor3d(values, [height, width, numChannels], 'int32')
}

app.use(cors())

app.post('/upload-links', async (req, res) => {
  const links = req.body.links
    console.log(222222,links);
  if (!Array.isArray(links) || links.length === 0) {
    res.status(400).send('Invalid links provided.')
  } else if (links.length > 10) {
    res.status(400).send('最多支持10个链接。')
  } else {
    const promises = links.map(async (link) => {
      try {
        const imageBuffer = await fetchImage(link)
        console.log(11111,imageBuffer);
        const isImage = imageBuffer.mimetype.startsWith('image/')
        if (!isImage) {
          const result = {
            link,
            error: 'Not an image type.'
          }
          return result
        }

        const image = await convert(imageBuffer)
        const predictions = await _model.classify(image)
        image.dispose()

        const formattedPredictions = predictions.map(
          ({ className, probability }) => ({
            className,
            probability: (probability * 100).toFixed(2) + '%'
          })
        )

        const sensitiveClasses = ['Hentai', 'Porn', 'Sexy']
        const isUnhealthy = formattedPredictions.some(
          ({ className, probability }) =>
            sensitiveClasses.includes(className) && parseFloat(probability) > 10
        )

        const result = {
          link,
          predictions: formattedPredictions,
          isHealthy: !isUnhealthy
        }

        return result
      } catch (error) {
        const result = {
          link,
          error: 'Failed to process image.'
        }
        return result
      }
    })

    const allResults = await Promise.all(promises)
    res.json(allResults) // 将处理结果返回给客户端
  }
})

// Helper function to fetch image from a URL using node-fetch
const fetchImage = async (url) => {
  const response = await fetch(url)
  const buffer = await response.buffer()
  return buffer
}

app.post('/nsfw', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).send('Missing image multipart/form-data')
  } else if (!req.file.mimetype.startsWith('image/')) {
    res.status(400).send('Not an image type.')
  } else {
    const image = await convert(req.file.buffer)
    const predictions = await _model.classify(image)
    image.dispose()

    const formattedPredictions = predictions.map(
      ({ className, probability }) => ({
        className,
        probability: (probability * 100).toFixed(2) + '%'
      })
    )

    const sensitiveClasses = ['Hentai', 'Porn', 'Sexy']
    const isUnhealthy = formattedPredictions.some(
      ({ className, probability }) =>
        sensitiveClasses.includes(className) && parseFloat(probability) > 10
    )

    const result = {
      file: req.file.originalname,
      predictions: formattedPredictions,
      isHealthy: !isUnhealthy
    }

    res.json(result)
  }
})

app.post('/nsfws', upload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400).send('Missing image(s) multipart/form-data')
  } else if (req.files.length > 10) {
    res.status(400).send('最多支持10张')
  } else {
    const promises = req.files.map(async (file) => {
      if (!file.mimetype.startsWith('image/')) {
        const result = {
          file: file.originalname,
          error: 'Not an image type.'
        }
        return result
      }

      const image = await convert(file.buffer)
      const predictions = await _model.classify(image)
      image.dispose()

      const formattedPredictions = predictions.map(
        ({ className, probability }) => ({
          className,
          probability: (probability * 100).toFixed(2) + '%'
        })
      )

      const sensitiveClasses = ['Hentai', 'Porn', 'Sexy']
      const isUnhealthy = formattedPredictions.some(
        ({ className, probability }) =>
          sensitiveClasses.includes(className) && parseFloat(probability) > 10
      )

      const result = {
        file: file.originalname,
        predictions: formattedPredictions,
        isHealthy: !isUnhealthy
      }

      return result
    })

    const allResults = await Promise.all(promises)
    res.json(allResults)
  }
})

const load_model = async () => {
  _model = await nsfw.load()
}

app.use((err, req, res, next) => res.send('发生错误,' + err.message))

// Keep the model in memory, make sure it's loaded only once
load_model().then(() => app.listen(80, () => console.log('start')))
