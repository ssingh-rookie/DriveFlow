const http = require('node:http')
const url = require('node:url')

console.log('🚀 Starting DriveFlow API server...')

// Mock data for testing
const mockPayoutReadiness = {
  status: 'Not Started',
  requirements: ['Please connect your Stripe account to receive payouts'],
}

// In production, this would create a real Stripe Account Link
function createMockStripeAccountLink(instructorId) {
  const baseUrl = 'https://connect.stripe.com/express/onboarding'
  const returnUrl = `http://localhost:3000/dashboard/instructors/${instructorId}/payouts?stripe_onboarding=success`
  const refreshUrl = `http://localhost:3000/dashboard/instructors/${instructorId}/payouts?stripe_onboarding=refresh`

  return {
    onboardingLink: `${baseUrl}?return_url=${encodeURIComponent(returnUrl)}&refresh_url=${encodeURIComponent(refreshUrl)}&instructor_id=${instructorId}&demo=true`,
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const path = parsedUrl.pathname
  const method = req.method

  console.log(`📥 ${method} ${path}`)

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  res.setHeader('Content-Type', 'application/json')

  // Routes
  if (method === 'GET' && path === '/api/health') {
    res.writeHead(200)
    res.end(JSON.stringify({
      status: 'ok',
      message: 'DriveFlow API is working!',
      timestamp: new Date().toISOString(),
    }))
  }
  else if (method === 'GET' && path.match(/^\/api\/payments\/instructors\/([^/]+)\/payout-readiness$/)) {
    const instructorId = path.match(/^\/api\/payments\/instructors\/([^/]+)\/payout-readiness$/)[1]
    console.log(`📋 Payout readiness for instructor: ${instructorId}`)
    res.writeHead(200)
    res.end(JSON.stringify(mockPayoutReadiness))
  }
  else if (method === 'GET' && path.match(/^\/api\/payments\/instructors\/([^/]+)\/stripe\/connect-link$/)) {
    const instructorId = path.match(/^\/api\/payments\/instructors\/([^/]+)\/stripe\/connect-link$/)[1]
    console.log(`🔗 Connect link for instructor: ${instructorId}`)
    const connectLink = createMockStripeAccountLink(instructorId)
    res.writeHead(200)
    res.end(JSON.stringify(connectLink))
  }
  else {
    res.writeHead(404)
    res.end(JSON.stringify({
      message: `Cannot ${method} ${path}`,
      error: 'Not Found',
      statusCode: 404,
    }))
  }
})

server.on('error', (err) => {
  console.error('❌ Server error:', err)
})

server.listen(3001, '127.0.0.1', () => {
  console.log('✅ DriveFlow API running on http://localhost:3001')
  console.log('🔗 Test URLs:')
  console.log('   • Health: http://localhost:3001/api/health')
  console.log('   • Payout: http://localhost:3001/api/payments/instructors/123/payout-readiness')
  console.log('   • Connect: http://localhost:3001/api/payments/instructors/123/stripe/connect-link')
})

// Keep alive
setInterval(() => {
  console.log(`💗 API alive: ${new Date().toISOString()}`)
}, 60000)
