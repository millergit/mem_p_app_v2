// Twilio SMS Webhook Handler
// This endpoint receives incoming SMS messages from Twilio

export default async function handler(req, res) {
  // Only allow POST requests from Twilio
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📨 Webhook received:', {
    method: req.method,
    from: req.body.From,
    to: req.body.To,
    messageSid: req.body.MessageSid
  });

  try {
    // Extract message data from Twilio webhook
    const {
      From: fromNumber,
      To: toNumber, 
      MessageSid: messageSid,
      NumMedia: numMedia
    } = req.body;

    // Log the incoming message (NO CONTENT for privacy)
    console.log('📱 New SMS received:', {
      from: fromNumber,
      to: toNumber,
      sid: messageSid,
      hasMedia: numMedia > 0
    });

    // Send privacy-safe push notification
    // NOTE: We never send the actual message content!
    await sendPrivacySafePushNotification(fromNumber, toNumber);

    // Respond to Twilio with success
    res.status(200).send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <!-- Empty response - we're just receiving the message -->
      </Response>
    `);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function sendPrivacySafePushNotification(fromNumber, toNumber) {
  try {
    // TODO: In production, you'd look up the user's push token based on their Twilio number
    // For now, we'll use a hardcoded token that you'll get from your app
    const pushToken = process.env.USER_PUSH_TOKEN;
    
    if (!pushToken) {
      console.log('⚠️ No push token configured - skipping notification');
      return;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      // NO actual message content - just a trigger for the app to refresh
      title: 'New Message',
      body: 'You have a new message',
      data: { 
        action: 'refresh_messages',
        fromNumber: fromNumber,
        // NO message content in data either!
        timestamp: Date.now()
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      console.log('✅ Privacy-safe push notification sent successfully');
    } else {
      const errorText = await response.text();
      console.error('❌ Push notification failed:', response.status, errorText);
    }

  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
}