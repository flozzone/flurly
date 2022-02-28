const express = require('express')
const app = express()
const port = 3000
const host = process.env.HOSTNAME

let doFail = false;

// handle SIGTERM signal to terminate pods in K8s
process.on('SIGTERM', () => {
  console.log("Received SIGTERM. Exiting")
  process.exit(0)
})

// handle SIGTERM signal sent from terminal by CTRL+C
process.on('SIGINT', () => {
  console.log("Received SIGINT. Exiting")
  process.exit(0)
})

// root entry point
app.get('/', (req, res) => {
  res.send('Hi I am Flurly ' + host + '\r\n')
})

// provide a simple health endpoint
app.get('/health', (req, res) => {
  if (!doFail) {
    res.status(200).send('Ok\r\n');
  } else {
    res.status(500).send(host + ' CRASHED\r\n')
  }
})

// let the health endpoints fail
app.post('/fail', (req, res) => {
  doFail = true
  res.send('App ' + host + ' is going to fail!\r\n')
  console.log('App is going to fail!')
})

// let the app immediately exit with error
app.post('/crash', (req, res) => {
  res.send('App ' + host + ' is going to crash!\r\n')
  console.log('App is going to crash!')
  process.exit(1)
})

// let the app immediately exit with success
app.post('/stop', (req, res) => {
  res.send('App ' + host + ' is going to stop!\r\n')
  console.log('App is going to stop!')
  process.exit(0)
})

// start the web server
app.listen(port, () => {
  console.log(`Flurly app listening on port ${port}`)
})

