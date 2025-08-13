import AsyncStorage from '@react-native-async-storage/async-storage';
import MessageService from './MessageService';

// Normalize phone number to E.164 format for consistent storage/lookup
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 1 and has 11 digits (US/Canada), format as +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US/Canada and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Otherwise, add + if not already present
  return digits.startsWith('+') ? phoneNumber : `+${digits}`;
}

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
  private lastFetchedTimestamp: number = Date.now() - (24 * 60 * 60 * 1000); // Start from 24 hours ago

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
        // Store the sent message locally using normalized phone number
        const normalizedTo = normalizePhoneNumber(to);
        // Check if this is a caregiver notification (should be hidden from user)
        const isCaregiverrNotification = message.includes('blocked') || message.includes('violation') || message.includes('frequency');
        await MessageService.addMessage(contactId || 'unknown', normalizedTo, message, 'sent', undefined, undefined, !isCaregiverrNotification);
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

  async fetchRecentMessages(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
      
      // Only fetch messages since our last check (much more efficient!)
      const sinceDate = new Date(this.lastFetchedTimestamp).toISOString();
      const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
      const params = new URLSearchParams({
        'DateSent>=': sinceDate,
        'To': this.config.phoneNumber
      });
      
      console.log(`Checking for new messages since: ${sinceDate}`);
      
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Handle case where messages might be undefined
        if (!data || !Array.isArray(data.messages)) {
          console.log('No messages array in response:', data);
          return false;
        }
        
        const inboundMessages = data.messages.filter(msg => msg && msg.direction === 'inbound');
        
        console.log(`Found ${inboundMessages.length} new inbound messages`);
        
        let hasNewMessages = false;
        let latestMessageTimestamp = this.lastFetchedTimestamp;
        
        for (const twilioMessage of inboundMessages) {
          const messageTimestamp = new Date(twilioMessage.date_sent).getTime();
          
          // Only process messages newer than our last fetch
          if (messageTimestamp > this.lastFetchedTimestamp) {
            console.log(`New message from ${twilioMessage.from}: "${twilioMessage.body}"`);
            
            const normalizedFrom = normalizePhoneNumber(twilioMessage.from);
            await MessageService.addMessage('unknown', normalizedFrom, twilioMessage.body, 'received', messageTimestamp, twilioMessage.sid);
            hasNewMessages = true;
            
            
            // Track the latest message timestamp we've processed
            latestMessageTimestamp = Math.max(latestMessageTimestamp, messageTimestamp);
          }
        }
        
        // Always update timestamp to prevent re-processing same messages
        if (inboundMessages.length > 0) {
          // Find the most recent message timestamp
          const mostRecentTimestamp = Math.max(
            ...inboundMessages.map(msg => new Date(msg.date_sent).getTime()),
            this.lastFetchedTimestamp
          );
          this.lastFetchedTimestamp = mostRecentTimestamp + 1;
          console.log(`Updated last fetched timestamp to: ${new Date(this.lastFetchedTimestamp).toISOString()}`);
        }
        
        if (hasNewMessages) {
          console.log(`✅ Actually processed ${hasNewMessages ? 'some' : 'no'} truly new messages`);
        } else {
          console.log(`🔍 No new messages since ${new Date(this.lastFetchedTimestamp).toISOString()}`);
        }
        
        return hasNewMessages;
      } else {
        const errorText = await response.text();
        console.error('Twilio API error:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return false;
    }
  }

  private getPollingInterval(): number {
    switch (this.pollingMode) {
      case 'conversation': return 5000;   // 3 seconds when actively viewing messages
      case 'active': return 30000;        // 15 seconds when app open but not viewing messages  
      case 'background': return 120000;    // 1 minute when backgrounded
    }
  }

  private restartPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(async () => {
      await this.fetchRecentMessages();
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

  // Expose normalize function for external use
  normalizePhoneNumber(phoneNumber: string): string {
    return normalizePhoneNumber(phoneNumber);
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