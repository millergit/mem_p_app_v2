// Test endpoint to verify the webhook server is working

export default function handler(req, res) {
  const timestamp = new Date().toISOString();
  
  console.log(`🔍 Test endpoint hit at ${timestamp}`);
  
  res.status(200).json({
    status: 'ok',
    message: 'Memory Care Phone webhook server is running!',
    timestamp: timestamp,
    method: req.method,
    userAgent: req.headers['user-agent'] || 'unknown'
  });
}