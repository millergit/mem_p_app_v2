import AsyncStorage from '@react-native-async-storage/async-storage';
import MessageService from './MessageService';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Twilio number
  userPhoneNumber: string; // Your dad's actual phone number
}

class TwilioService {
  private config: TwilioConfig | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingMode: 'active' | 'background' | 'conversation' = 'background';
  private appState: 'active' | 'background' = 'active';

  async loadConfig(): Promise<TwilioConfig | null> {
    try {
      const configString = await AsyncStorage.getItem('twilio_config');
      if (configString) {
        this.config = JSON.parse(configString);
        return this.config;
      }
    } catch (error) {
      console.error('Failed to load Twilio config:', error);
    }
    return null;
  }

  async saveConfig(config: TwilioConfig): Promise<void> {
    try {
      await AsyncStorage.setItem('twilio_config', JSON.stringify(config));
      this.config = config;
    } catch (error) {
      console.error('Failed to save Twilio config:', error);
      throw error;
    }
  }

  async clearConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem('twilio_config');
      this.config = null;
    } catch (error) {
      console.error('Failed to clear Twilio config:', error);
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  getConfig(): TwilioConfig | null {
    return this.config;
  }

  async sendSMS(to: string, message: string, contactId?: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Twilio not configured. Please add your credentials in settings.');
    }

    try {
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.config.phoneNumber,
            To: to,
            Body: message,
          }).toString(),
        }
      );

      if (response.ok) {
        // Store the sent message locally
        await MessageService.addMessage(contactId || 'unknown', to, message, 'sent');
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS Error:', error);
      throw error;
    }
  }

  async fetchRecentMessages(): Promise<void> {
    if (!this.config) return;

    try {
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json?DateSent>=${twentyFourHoursAgo}&To=${this.config.phoneNumber}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        for (const twilioMessage of data.messages) {
          // Only process received messages that we haven't seen before
          if (twilioMessage.direction === 'inbound') {
            const existingMessages = MessageService.getMessages(twilioMessage.from);
            const messageExists = existingMessages.some(msg => 
              Math.abs(msg.timestamp - new Date(twilioMessage.date_sent).getTime()) < 5000 && 
              msg.text === twilioMessage.body
            );
            
            if (!messageExists) {
              await MessageService.addMessage('unknown', twilioMessage.from, twilioMessage.body, 'received');
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }

  private getPollingInterval(): number {
    switch (this.pollingMode) {
      case 'conversation': return 10000;  // 10 seconds when viewing messages
      case 'active': return 30000;        // 30 seconds when app open
      case 'background': return 120000;   // 2 minutes when backgrounded
    }
  }

  private restartPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(() => {
      this.fetchRecentMessages();
    }, this.getPollingInterval());
  }

  startMessagePolling(): void {
    if (this.pollingInterval) return;
    
    // Load conversations when starting
    MessageService.loadConversations();
    
    // Start polling
    this.restartPolling();
    
    // Fetch immediately
    this.fetchRecentMessages();
  }

  setPollingMode(mode: 'active' | 'background' | 'conversation'): void {
    if (this.pollingMode !== mode) {
      this.pollingMode = mode;
      if (this.pollingInterval) {
        this.restartPolling();
      }
    }
  }

  stopMessagePolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async makeCall(to: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Twilio not configured. Please add your credentials in settings.');
    }

    if (!this.config.userPhoneNumber) {
      throw new Error('Your phone number not configured. Please add it in Twilio settings.');
    }

    try {
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
      
      // Simple approach: Call contact, when they answer, connect to user
      // Both sides see Twilio number as caller ID
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.config.phoneNumber, // Twilio number (what contact sees)
            To: to, // Contact's number
            // When contact answers, dial the user's phone
            Twiml: `<Response><Dial>${this.config.userPhoneNumber}</Dial></Response>`,
          }).toString(),
        }
      );

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to make call');
      }
    } catch (error) {
      console.error('Call Error:', error);
      throw error;
    }
  }
}

export default new TwilioService();