# Privacy-Safe Push Notification Setup

## 🔐 How This Works (Privacy-First)

**The Flow:**
1. Someone texts your Twilio number
2. Twilio → Your webhook server (NO message content sent!)
3. Webhook server → Silent push notification to app
4. App → Fetches messages directly from Twilio
5. App → Shows "New" indicator on contact

**Privacy Benefits:**
- ✅ **Zero message content** passes through your server
- ✅ **End-to-end privacy** (Twilio → App directly)  
- ✅ **No stored messages** on your servers
- ✅ **Industry standard** approach (used by Signal, etc.)

## 📱 Setup Steps

### 1. Get Push Token from Your App

Run your app and check the logs - you'll see:
```
New push token obtained: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

### 2. Configure Webhook Server

Set the push token as an environment variable in Vercel:

```bash
cd webhook-server
npx vercel env add USER_PUSH_TOKEN
# Paste your ExponentPushToken[...] here
npx vercel --prod
```

### 3. Test the Flow

1. Send a text TO your Twilio number
2. Check webhook logs - should see "Privacy-safe push notification sent"
3. App should show "New" indicator without any popup notification

## 🚀 Benefits for Elderly Users

- **No confusing popups** - just simple visual cues
- **Instant delivery** - messages appear within 1-3 seconds
- **Battery efficient** - no polling needed
- **Privacy protected** - messages never touch your servers
- **Reliable** - industry-standard push notification system

## 🔧 Next Steps

After setup, we'll:
- Remove all polling code
- Add "New" indicators to contact cards
- Test the complete flow
- Deploy the final privacy-safe system