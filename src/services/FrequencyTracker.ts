import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact, ContactFrequencySettings } from '../types/Contact';

interface FrequencyRecord {
  contactId: string;
  type: 'call' | 'text';
  timestamp: number;
}

interface BlockedMessage {
  id: string;
  contactId: string;
  message: string;
  timestamp: number;
}

interface BlockedCall {
  id: string;
  contactId: string;
  timestamp: number;
  voicemailRecordingUrl?: string;
}

class FrequencyTracker {
  private static instance: FrequencyTracker;
  private records: FrequencyRecord[] = [];
  private blockedMessages: BlockedMessage[] = [];
  private blockedCalls: BlockedCall[] = [];

  static getInstance(): FrequencyTracker {
    if (!FrequencyTracker.instance) {
      FrequencyTracker.instance = new FrequencyTracker();
    }
    return FrequencyTracker.instance;
  }

  async loadRecords(): Promise<void> {
    try {
      const recordsJson = await AsyncStorage.getItem('frequency_records');
      const blockedJson = await AsyncStorage.getItem('blocked_messages');
      const blockedCallsJson = await AsyncStorage.getItem('blocked_calls');
      
      this.records = recordsJson ? JSON.parse(recordsJson) : [];
      this.blockedMessages = blockedJson ? JSON.parse(blockedJson) : [];
      this.blockedCalls = blockedCallsJson ? JSON.parse(blockedCallsJson) : [];
      
      this.cleanupOldRecords();
    } catch (error) {
      console.error('Error loading frequency records:', error);
    }
  }

  private cleanupOldRecords(): void {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    this.records = this.records.filter(record => record.timestamp > oneDayAgo);
    this.saveRecords();
  }

  private async saveRecords(): Promise<void> {
    try {
      await AsyncStorage.setItem('frequency_records', JSON.stringify(this.records));
      await AsyncStorage.setItem('blocked_messages', JSON.stringify(this.blockedMessages));
      await AsyncStorage.setItem('blocked_calls', JSON.stringify(this.blockedCalls));
    } catch (error) {
      console.error('Error saving frequency records:', error);
    }
  }

  async recordCommunication(contactId: string, type: 'call' | 'text'): Promise<void> {
    const record: FrequencyRecord = {
      contactId,
      type,
      timestamp: Date.now()
    };
    
    this.records.push(record);
    await this.saveRecords();
  }

  async storeBlockedMessage(contactId: string, message: string): Promise<void> {
    const blockedMessage: BlockedMessage = {
      id: Date.now().toString(),
      contactId,
      message,
      timestamp: Date.now()
    };
    
    this.blockedMessages.push(blockedMessage);
    await this.saveRecords();
  }

  async storeBlockedCall(contactId: string, voicemailRecordingUrl?: string): Promise<void> {
    const blockedCall: BlockedCall = {
      id: Date.now().toString(),
      contactId,
      timestamp: Date.now(),
      voicemailRecordingUrl
    };
    
    this.blockedCalls.push(blockedCall);
    await this.saveRecords();
  }

  getBlockedMessages(): BlockedMessage[] {
    return this.blockedMessages;
  }

  getBlockedCalls(): BlockedCall[] {
    return this.blockedCalls;
  }

  async clearBlockedMessages(): Promise<void> {
    this.blockedMessages = [];
    await this.saveRecords();
  }

  async clearBlockedCalls(): Promise<void> {
    this.blockedCalls = [];
    await this.saveRecords();
  }

  async clearAllBlocked(): Promise<void> {
    this.blockedMessages = [];
    this.blockedCalls = [];
    await this.saveRecords();
  }

  canCommunicate(contact: Contact, type: 'call' | 'text'): boolean {
    if (!contact.frequencySettings) {
      return true;
    }

    const settings = contact.frequencySettings;
    const typeSettings = type === 'call' ? settings.calls : settings.texts;
    
    if (!typeSettings.enabled) {
      return true;
    }

    if (this.isQuietHours(settings)) {
      return false;
    }

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentRecords = this.records.filter(record => 
      record.contactId === contact.id && 
      record.type === type
    );

    const hourlyCount = recentRecords.filter(record => 
      record.timestamp > oneHourAgo
    ).length;

    const dailyCount = recentRecords.filter(record => 
      record.timestamp > oneDayAgo
    ).length;

    return hourlyCount < typeSettings.maxPerHour && 
           dailyCount < typeSettings.maxPerDay;
  }

  private isQuietHours(settings: ContactFrequencySettings): boolean {
    if (!settings.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(settings.quietHours.start);
    const endTime = this.parseTime(settings.quietHours.end);

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  getCommunicationStats(contactId: string): { calls: number; texts: number } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentRecords = this.records.filter(record => 
      record.contactId === contactId && 
      record.timestamp > oneDayAgo
    );

    return {
      calls: recentRecords.filter(r => r.type === 'call').length,
      texts: recentRecords.filter(r => r.type === 'text').length
    };
  }

  getDefaultFrequencySettings(): ContactFrequencySettings {
    return {
      calls: {
        maxPerHour: 3,
        maxPerDay: 10,
        enabled: false
      },
      texts: {
        maxPerHour: 5,
        maxPerDay: 20,
        enabled: false
      },
      voicemailAllowed: 2
    };
  }
}

export default FrequencyTracker;
export type { BlockedMessage, BlockedCall };