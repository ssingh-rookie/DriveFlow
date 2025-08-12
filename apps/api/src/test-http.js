const http = require('node:http')

console.log('🚀 Starting raw HTTP server...')

const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    message: 'Raw HTTP server is working!',
    timestamp: Date.now(),
    method: req.method,
    url: req.url,
  }))
})

server.listen(3334, '0.0.0.0', () => {
  console.log('✅ Raw HTTP server listening on http://localhost:3334')
  console.log('✅ Also available on http://0.0.0.0:3334')
})

server.on('error', (err) => {
  console.error('❌ Server error:', err)
})

// Keep the process alive
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})
