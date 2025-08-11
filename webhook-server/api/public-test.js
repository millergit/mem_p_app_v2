// Public test endpoint (no auth required)

export const config = {
  runtime: 'nodejs18.x',
}

export default function handler(req, res) {
  // Set CORS headers to allow external access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const timestamp = new Date().toISOString();
  
  console.log(`🔍 Public test endpoint hit at ${timestamp}`);
  
  res.status(200).json({
    status: 'success',
    message: 'Memory Care Phone webhook server is running!',
    timestamp: timestamp,
    method: req.method,
    public: true,
    note: 'This endpoint bypasses Vercel authentication'
  });
}