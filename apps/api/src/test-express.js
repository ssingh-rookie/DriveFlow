const express = require('express')

console.log('🚀 Testing Express directly...')

const app = express()

app.get('/', (req, res) => {
  console.log('📥 Request received at /')
  res.json({ message: 'Express server is working!', timestamp: Date.now() })
})

const server = app.listen(3001, '0.0.0.0', () => {
  console.log('✅ Express server listening on http://localhost:3001')
})

server.on('error', (err) => {
  console.error('❌ Express server error:', err)
})
