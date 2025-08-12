const http = require('node:http')

console.log('🚀 Final test: Creating basic HTTP server...')

const server = http.createServer((req, res) => {
  console.log(`📥 GOT REQUEST: ${req.method} ${req.url} from ${req.socket.remoteAddress}`)
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({
    success: true,
    message: 'FINAL TEST WORKS!',
    timestamp: Date.now(),
    nodeVersion: process.version,
    platform: process.platform,
  }))
})

server.on('error', (err) => {
  console.error('❌ Server error:', err)
})

server.on('listening', () => {
  const addr = server.address()
  console.log(`✅ Server listening on:`, addr)
  console.log(`✅ Try: curl http://localhost:${addr.port}/`)
  console.log(`✅ Try: curl http://127.0.0.1:${addr.port}/`)
})

server.listen(8080, '127.0.0.1', () => {
  console.log('📡 Binding complete')
})

// Keep alive
setInterval(() => {
  console.log(`💗 Server alive: ${new Date().toISOString()}`)
}, 10000)
