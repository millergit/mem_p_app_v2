# Memory Care Phone - Webhook Server

This is the webhook server that handles incoming SMS messages from Twilio for the Memory Care Phone app.

## Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   cd webhook-server
   vercel --prod
   ```

3. **Get your webhook URL**:
   After deployment, you'll get a URL like: `https://your-project.vercel.app`

## Endpoints

- `POST /api/webhook` - Receives SMS webhooks from Twilio
- `GET /api/test` - Test endpoint to verify server is running

## Twilio Configuration

Once deployed, configure your Twilio phone number webhook URL to:
```
https://your-project.vercel.app/api/webhook
```

## How it works

1. Someone sends SMS to your Twilio number
2. Twilio immediately sends webhook to `/api/webhook`  
3. Server processes message and can notify your app instantly
4. Much more efficient than polling every 5 seconds!

## Next Steps

- [ ] Add push notifications
- [ ] Add message storage/database
- [ ] Add WebSocket support for real-time updates
- [ ] Add authentication/security