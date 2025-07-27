import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import TwilioService from './TwilioService';
import FrequencyTracker, { BlockedMessage, BlockedCall } from './FrequencyTracker';

interface CaregiverSettings {
  phoneNumber?: string;
  notificationsEnabled: boolean;
  smsEnabled: boolean;
  alertThreshold: number; // Primary alert threshold
  secondLevelEnabled: boolean; // Whether to use escalation alerts
  secondLevelThreshold: number; // Escalation alert threshold  
  alertStatus: 'ready' | 'alert-sent' | 'escalation-sent'; // Current alert state
  lastResetTimestamp?: number; // When caregiver last reset alerts
  primaryAlertSentAt?: number; // When primary alert was sent
  escalationAlertSentAt?: number; // When escalation alert was sent
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
        const loadedSettings = JSON.parse(settingsString);
        // Migrate old settings to new format
        this.settings = this.migrateSettings(loadedSettings);
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

  private migrateSettings(oldSettings: any): CaregiverSettings {
    const defaults = this.getDefaultSettings();
    
    // Convert old alert status to new format
    let alertStatus = defaults.alertStatus;
    if (oldSettings.alertStatus === 'none') alertStatus = 'ready';
    else if (oldSettings.alertStatus === 'level1-sent') alertStatus = 'alert-sent';
    else if (oldSettings.alertStatus === 'level2-sent') alertStatus = 'escalation-sent';
    else if (oldSettings.alertStatus) alertStatus = oldSettings.alertStatus;
    
    // For debugging - if we have an alert status but no timestamp, set a placeholder
    let primaryAlertSentAt = oldSettings.primaryAlertSentAt;
    let escalationAlertSentAt = oldSettings.escalationAlertSentAt;
    
    if (alertStatus === 'alert-sent' && !primaryAlertSentAt) {
      primaryAlertSentAt = Date.now(); // Set to now as fallback
    }
    if (alertStatus === 'escalation-sent' && !escalationAlertSentAt) {
      escalationAlertSentAt = Date.now(); // Set to now as fallback
    }
    
    return {
      phoneNumber: oldSettings.phoneNumber,
      notificationsEnabled: oldSettings.notificationsEnabled || defaults.notificationsEnabled,
      smsEnabled: oldSettings.smsEnabled !== undefined ? oldSettings.smsEnabled : defaults.smsEnabled,
      alertThreshold: oldSettings.alertThreshold || defaults.alertThreshold,
      secondLevelEnabled: oldSettings.secondLevelEnabled !== undefined ? oldSettings.secondLevelEnabled : defaults.secondLevelEnabled,
      secondLevelThreshold: oldSettings.secondLevelThreshold || defaults.secondLevelThreshold,
      alertStatus,
      lastResetTimestamp: oldSettings.lastResetTimestamp,
      primaryAlertSentAt,
      escalationAlertSentAt,
    };
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
      alertThreshold: 5, // Alert after 5 blocked communications
      secondLevelEnabled: false, // Escalation alerts disabled by default
      secondLevelThreshold: 15, // Escalation after 15 blocked communications
      alertStatus: 'ready', // System ready, no alerts sent
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
    const todayBlocked = this.getTodayBlockedCount(blockedMessages, blockedCalls);

    // Tripped breaker system - only send alerts once per level until reset
    if (this.settings.secondLevelEnabled && 
        todayBlocked >= this.settings.secondLevelThreshold && 
        this.settings.alertStatus === 'alert-sent') {
      // Send escalation alert
      await this.sendEscalationAlert(todayBlocked);
      this.settings.alertStatus = 'escalation-sent';
      this.settings.escalationAlertSentAt = Date.now();
      await this.saveSettings(this.settings);
    } else if (todayBlocked >= this.settings.alertThreshold && this.settings.alertStatus === 'ready') {
      // Send primary alert
      await this.sendPrimaryAlert(todayBlocked);
      this.settings.alertStatus = 'alert-sent';
      this.settings.primaryAlertSentAt = Date.now();
      await this.saveSettings(this.settings);
    }
    // If alertStatus is 'escalation-sent' or system disabled, no more alerts until reset
  }

  private getTodayBlockedCount(messages: BlockedMessage[], calls: BlockedCall[]): number {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const todayMessages = messages.filter(msg => msg.timestamp > oneDayAgo).length;
    const todayCalls = calls.filter(call => call.timestamp > oneDayAgo).length;

    return todayMessages + todayCalls;
  }

  private async sendPrimaryAlert(todayCount: number): Promise<void> {
    const frequencyTracker = FrequencyTracker.getInstance();
    const blockedMessages = frequencyTracker.getBlockedMessages();
    const blockedCalls = frequencyTracker.getBlockedCalls();
    
    // Get recent violations for context
    const recentViolations = this.getRecentViolations(blockedMessages, blockedCalls);
    
    const alertMessage = `⚠️ COMMUNICATION ALERT: ${todayCount} blocked communications today.\n\nRecent violations:\n${recentViolations}\n\nThis alert will not repeat until manually reset.`;

    if (this.settings?.smsEnabled && this.settings?.phoneNumber) {
      await this.sendSMSAlert(alertMessage);
    }
  }

  private async sendEscalationAlert(todayCount: number): Promise<void> {
    const frequencyTracker = FrequencyTracker.getInstance();
    const blockedMessages = frequencyTracker.getBlockedMessages();
    const blockedCalls = frequencyTracker.getBlockedCalls();
    
    // Get recent violations for context  
    const recentViolations = this.getRecentViolations(blockedMessages, blockedCalls);
    
    const alertMessage = `🚨 ESCALATION ALERT: ${todayCount} blocked communications today (significant increase).\n\nRecent violations:\n${recentViolations}\n\nImmediate attention recommended.`;

    if (this.settings?.smsEnabled && this.settings?.phoneNumber) {
      await this.sendSMSAlert(alertMessage);
    }
  }

  private getRecentViolations(messages: BlockedMessage[], calls: BlockedCall[]): string {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Get today's violations
    const todayMessages = messages.filter(msg => msg.timestamp > oneDayAgo).slice(-3);
    const todayCalls = calls.filter(call => call.timestamp > oneDayAgo).slice(-3);
    
    let violations = [];
    
    // Add recent calls
    todayCalls.forEach(call => {
      const time = new Date(call.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      violations.push(`${time}: Blocked call`);
    });
    
    // Add recent messages  
    todayMessages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const preview = msg.message.length > 30 ? msg.message.substring(0, 30) + '...' : msg.message;
      violations.push(`${time}: "${preview}"`);
    });
    
    // Sort by timestamp and take most recent 5
    violations.sort();
    return violations.slice(-5).join('\n') || 'No recent details available';
  }

  // Reset the alert system - call this when caregiver acknowledges alerts
  async resetAlerts(): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }
    
    if (this.settings) {
      this.settings.alertStatus = 'ready';
      this.settings.lastResetTimestamp = Date.now();
      this.settings.primaryAlertSentAt = undefined;
      this.settings.escalationAlertSentAt = undefined;
      await this.saveSettings(this.settings);
    }
  }

  // Reset only the primary alert level
  async resetPrimaryAlert(): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }
    
    if (this.settings && this.settings.alertStatus === 'alert-sent') {
      this.settings.alertStatus = 'ready';
      this.settings.primaryAlertSentAt = undefined;
      await this.saveSettings(this.settings);
    }
  }

  // Reset only the escalation alert level (keeps primary alert active)
  async resetEscalationAlert(): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }
    
    if (this.settings && this.settings.alertStatus === 'escalation-sent') {
      this.settings.alertStatus = 'alert-sent'; // Back to primary alert state
      this.settings.escalationAlertSentAt = undefined;
      await this.saveSettings(this.settings);
    }
  }

  // Get current violation stats
  async getCurrentViolationStats(): Promise<{
    todayBlocked: number;
    totalBlocked: number;
    primaryTriggered: boolean;
    escalationTriggered: boolean;
    primaryAlertTime?: string;
    escalationAlertTime?: string;
  }> {
    const frequencyTracker = FrequencyTracker.getInstance();
    await frequencyTracker.loadRecords();
    
    const blockedMessages = frequencyTracker.getBlockedMessages();
    const blockedCalls = frequencyTracker.getBlockedCalls();
    const todayBlocked = this.getTodayBlockedCount(blockedMessages, blockedCalls);
    const totalBlocked = blockedMessages.length + blockedCalls.length;

    if (!this.settings) {
      await this.loadSettings();
    }

    // Find the exact time when alerts would have been triggered
    const primaryAlertTime = this.getAlertTriggerTime(blockedMessages, blockedCalls, this.settings?.alertThreshold || 5);
    const escalationAlertTime = this.settings?.secondLevelEnabled ? 
      this.getAlertTriggerTime(blockedMessages, blockedCalls, this.settings.secondLevelThreshold || 15) : undefined;

    return {
      todayBlocked,
      totalBlocked,
      primaryTriggered: (this.settings?.alertStatus === 'alert-sent' || this.settings?.alertStatus === 'escalation-sent'),
      escalationTriggered: this.settings?.alertStatus === 'escalation-sent',
      primaryAlertTime,
      escalationAlertTime,
    };
  }

  private getAlertTriggerTime(messages: BlockedMessage[], calls: BlockedCall[], threshold: number): string | undefined {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Get today's violations and sort by timestamp
    const todayViolations = [
      ...messages.filter(msg => msg.timestamp > oneDayAgo).map(msg => ({ ...msg, type: 'message' })),
      ...calls.filter(call => call.timestamp > oneDayAgo).map(call => ({ ...call, type: 'call' }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    // Find the Nth violation that triggered the alert
    if (todayViolations.length >= threshold) {
      const triggerViolation = todayViolations[threshold - 1]; // Index is threshold - 1
      return new Date(triggerViolation.timestamp).toLocaleString();
    }

    return undefined;
  }

  private async sendSMSAlert(message: string): Promise<void> {
    try {
      if (!this.settings?.phoneNumber) {
        return;
      }

      await TwilioService.loadConfig();
      if (!TwilioService.isConfigured()) {
        return;
      }

      // Use Twilio to send SMS to caregiver
      await TwilioService.sendSMS(this.settings.phoneNumber, message, 'caregiver-alert');
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
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
        return;
      }

      await TwilioService.loadConfig();
      if (!TwilioService.isConfigured()) {
        return;
      }

      // This would require TwiML webhooks to play a message
      // For now, we'll just make a regular call
      await TwilioService.makeCall(this.settings.phoneNumber);
    } catch (error) {
      console.error('Failed to make emergency call:', error);
    }
  }

  // Remote data sync options (no backend needed)
  async syncToCloud(): Promise<void> {
    // This could integrate with:
    // - iCloud (iOS) or Google Drive (Android) for file sync
    // - Firebase Firestore for real-time sync
    // - Send data via SMS as backup option
    
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

      // For now, just export the data for caregiver review
      
      // Future implementation could save to device storage or send via other means
    } catch (error) {
      console.error('Failed to sync data to cloud:', error);
    }
  }
}

export default CaregiverNotificationService;
export type { CaregiverSettings };