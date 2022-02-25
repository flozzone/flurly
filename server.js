const express = require('express')
const app = express()
const port = 3000

let crash = false;

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// provide a simple health endpoint
app.get('/health', (req, res) => {
  if (!crash) {
    res.status(200).send('Ok');
  } else {
    res.status(500).send('APP CRASHED')
  }
})

app.post('/crash', (req, res) => {
  crash = true
  res.send('App is going to crash!')
  console.log('App is going to crash!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

