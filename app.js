const express = require('express')
const cors = require('cors') // cors中间件
const multer = require('multer')
const decode = require('image-decode')

const tf = require('@tensorflow/tfjs-node')
const nsfw = require('nsfwjs')

const app = express()
const upload = multer()

let _model

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

app.post('/nsfw', upload.single('image'), async (req, res) => {
  if (!req.file) res.status(400).send('Missing image multipart/form-data')
  else {
    const image = await convert(req.file.buffer)
    const predictions = await _model.classify(image)
    image.dispose()
    res.json(predictions)
  }
})

const load_model = async () => {
  _model = await nsfw.load()
}

app.use((err, req, res, next) => res.send('发生错误,' + err.message))

// Keep the model in memory, make sure it's loaded only once
load_model().then(() => app.listen(80,() => console.log('start')))

// curl --request POST localhost:8080/nsfw --header 'Content-Type: multipart/form-data' --data-binary 'image=@/full/path/to/picture.jpg'
