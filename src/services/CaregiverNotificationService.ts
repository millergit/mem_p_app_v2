import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import TwilioService from './TwilioService';
import FrequencyTracker, { BlockedMessage, BlockedCall } from './FrequencyTracker';

interface CaregiverSettings {
  phoneNumber?: string;
  email?: string;
  notificationsEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  alertThreshold: number; // Number of blocked communications before alert
}

class CaregiverNotificationService {
  private static instance: CaregiverNotificationService;
  private settings: CaregiverSettings | null = null;

  static getInstance(): CaregiverNotificationService {
    if (!CaregiverNotificationService.instance) {
      CaregiverNotificationService.instance = new CaregiverNotificationService();
    }
    return CaregiverNotificationService.instance;
  }

  async loadSettings(): Promise<CaregiverSettings> {
    try {
      const settingsString = await AsyncStorage.getItem('caregiver_notification_settings');
      if (settingsString) {
        this.settings = JSON.parse(settingsString);
      } else {
        this.settings = this.getDefaultSettings();
      }
      return this.settings;
    } catch (error) {
      console.error('Failed to load caregiver settings:', error);
      this.settings = this.getDefaultSettings();
      return this.settings;
    }
  }

  async saveSettings(settings: CaregiverSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('caregiver_notification_settings', JSON.stringify(settings));
      this.settings = settings;
    } catch (error) {
      console.error('Failed to save caregiver settings:', error);
    }
  }

  getDefaultSettings(): CaregiverSettings {
    return {
      notificationsEnabled: false,
      smsEnabled: true,
      emailEnabled: false,
      alertThreshold: 5, // Alert after 5 blocked communications in a day
    };
  }

  async checkAndSendAlerts(): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    if (!this.settings?.notificationsEnabled) {
      return;
    }

    const frequencyTracker = FrequencyTracker.getInstance();
    await frequencyTracker.loadRecords();
    
    const blockedMessages = frequencyTracker.getBlockedMessages();
    const blockedCalls = frequencyTracker.getBlockedCalls();
    const totalBlocked = blockedMessages.length + blockedCalls.length;

    // Check if we need to send an alert
    if (totalBlocked >= this.settings.alertThreshold) {
      const todayBlocked = this.getTodayBlockedCount(blockedMessages, blockedCalls);
      
      // Only alert if there are recent blocked communications today
      if (todayBlocked >= Math.min(3, this.settings.alertThreshold)) {
        await this.sendAlert(todayBlocked, totalBlocked);
      }
    }
  }

  private getTodayBlockedCount(messages: BlockedMessage[], calls: BlockedCall[]): number {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const todayMessages = messages.filter(msg => msg.timestamp > oneDayAgo).length;
    const todayCalls = calls.filter(call => call.timestamp > oneDayAgo).length;

    return todayMessages + todayCalls;
  }

  private async sendAlert(todayCount: number, totalCount: number): Promise<void> {
    const alertMessage = `Dementia Care Alert: ${todayCount} blocked communications today (${totalCount} total). Please check the app for details.`;

    if (this.settings?.smsEnabled && this.settings?.phoneNumber) {
      await this.sendSMSAlert(alertMessage);
    }

    if (this.settings?.emailEnabled && this.settings?.email) {
      await this.sendEmailAlert(alertMessage);
    }
  }

  private async sendSMSAlert(message: string): Promise<void> {
    try {
      if (!this.settings?.phoneNumber) {
        console.warn('No caregiver phone number configured for SMS alerts');
        return;
      }

      await TwilioService.loadConfig();
      if (!TwilioService.isConfigured()) {
        console.warn('Twilio not configured - cannot send SMS alert');
        return;
      }

      // Use Twilio to send SMS to caregiver
      await TwilioService.sendSMS(this.settings.phoneNumber, message, 'caregiver-alert');
      console.log('SMS alert sent to caregiver');
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
    }
  }

  private async sendEmailAlert(message: string): Promise<void> {
    try {
      if (!this.settings?.email) {
        console.warn('No caregiver email configured for email alerts');
        return;
      }

      // Use mailto link to open default email app
      const subject = 'Dementia Care Alert';
      const body = `${message}\n\nPlease open the app to review blocked communications.\n\nSent from Dementia Care App`;
      
      const emailUrl = `mailto:${this.settings.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        console.log('Email alert opened');
      } else {
        console.warn('Cannot open email app');
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  // Call this method whenever a communication is blocked
  async onCommunicationBlocked(): Promise<void> {
    // Delay alert check to avoid spam
    setTimeout(() => {
      this.checkAndSendAlerts();
    }, 1000);
  }

  // Emergency call to caregiver using Twilio Voice
  async emergencyCallCaregiver(reason: string): Promise<void> {
    try {
      if (!this.settings?.phoneNumber) {
        console.warn('No caregiver phone number for emergency call');
        return;
      }

      await TwilioService.loadConfig();
      if (!TwilioService.isConfigured()) {
        console.warn('Twilio not configured - cannot make emergency call');
        return;
      }

      // This would require TwiML webhooks to play a message
      // For now, we'll just make a regular call
      await TwilioService.makeCall(this.settings.phoneNumber);
      console.log('Emergency call initiated to caregiver');
    } catch (error) {
      console.error('Failed to make emergency call:', error);
    }
  }

  // Remote data sync options (no backend needed)
  async syncToCloud(): Promise<void> {
    // This could integrate with:
    // - iCloud (iOS) or Google Drive (Android) for file sync
    // - Firebase Firestore for real-time sync
    // - Email the data as JSON attachment
    
    try {
      const frequencyTracker = FrequencyTracker.getInstance();
      await frequencyTracker.loadRecords();
      
      const blockedMessages = frequencyTracker.getBlockedMessages();
      const blockedCalls = frequencyTracker.getBlockedCalls();
      
      const syncData = {
        timestamp: Date.now(),
        blockedMessages,
        blockedCalls,
        totalCount: blockedMessages.length + blockedCalls.length,
      };

      // For now, email the data as JSON
      if (this.settings?.email) {
        const subject = 'Dementia Care - Blocked Communications Data';
        const body = `Blocked Communications Data Export\n\nData:\n${JSON.stringify(syncData, null, 2)}`;
        
        const emailUrl = `mailto:${this.settings.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        const canOpen = await Linking.canOpenURL(emailUrl);
        if (canOpen) {
          await Linking.openURL(emailUrl);
        }
      }
    } catch (error) {
      console.error('Failed to sync data to cloud:', error);
    }
  }
}

export default CaregiverNotificationService;
export type { CaregiverSettings };