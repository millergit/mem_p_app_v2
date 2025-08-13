import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import TwilioService, { TwilioConfig } from '../services/TwilioService';
import ContactSelector from '../components/ContactSelector';
import { clearContactsCache } from './ContactsScreen';
import { Contact, ContactFrequencySettings } from '../types/Contact';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FrequencyTracker, { BlockedMessage, BlockedCall } from '../services/FrequencyTracker';
import CaregiverNotificationService, { CaregiverSettings } from '../services/CaregiverNotificationService';
import BlockedCommunicationsScreen from './BlockedCommunicationsScreen';
import MessageService from '../services/MessageService';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentTab, setCurrentTab] = useState<'twilio' | 'contacts' | 'display' | 'communication' | 'caregiver'>('twilio');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showConversations, setShowConversations] = useState(true);
  const [blockedMessages, setBlockedMessages] = useState<BlockedMessage[]>([]);
  const [blockedCalls, setBlockedCalls] = useState<BlockedCall[]>([]);
  const [frequencyTracker] = useState(() => FrequencyTracker.getInstance());
  const [caregiverNotifications] = useState(() => CaregiverNotificationService.getInstance());
  const [caregiverSettings, setCaregiverSettings] = useState<CaregiverSettings | null>(null);
  const [violationStats, setViolationStats] = useState<any>(null);
  const [showBlockedScreen, setShowBlockedScreen] = useState(false);

  useEffect(() => {
    loadExistingConfig();
    loadSelectedContacts();
    loadDisplaySettings();
    loadBlockedMessages();
    loadCaregiverSettings();
    
    // iOS Assistive Access back button handling
    const onBackPress = () => {
      // Navigate back within the app instead of exiting
      onBack();
      return true; // Prevent default behavior (exiting app)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    
    return () => {
      backHandler.remove();
    };
  }, [onBack]);

  const loadExistingConfig = async () => {
    const config = await TwilioService.loadConfig();
    if (config) {
      setAccountSid(config.accountSid);
      setAuthToken(config.authToken);
      setPhoneNumber(config.phoneNumber);
      setUserPhoneNumber(config.userPhoneNumber || '');
    }
  };

  const loadSelectedContacts = async () => {
    try {
      const contactsString = await AsyncStorage.getItem('selected_contacts');
      if (contactsString) {
        const contacts = JSON.parse(contactsString);
        setSelectedContacts(contacts);
      }
    } catch (error) {
      console.error('Failed to load selected contacts:', error);
    }
  };

  const loadDisplaySettings = async () => {
    try {
      const showConversationsString = await AsyncStorage.getItem('show_conversations');
      if (showConversationsString !== null) {
        setShowConversations(JSON.parse(showConversationsString));
      }
    } catch (error) {
      console.error('Failed to load display settings:', error);
    }
  };

  const loadBlockedMessages = async () => {
    try {
      await frequencyTracker.loadRecords();
      setBlockedMessages(frequencyTracker.getBlockedMessages());
      setBlockedCalls(frequencyTracker.getBlockedCalls());
    } catch (error) {
      console.error('Failed to load blocked communications:', error);
    }
  };

  const loadCaregiverSettings = async () => {
    try {
      const settings = await caregiverNotifications.loadSettings();
      setCaregiverSettings(settings);
      
      // Load violation stats if notifications are enabled
      if (settings.notificationsEnabled) {
        const stats = await caregiverNotifications.getCurrentViolationStats();
        setViolationStats(stats);
      }
    } catch (error) {
      console.error('Failed to load caregiver settings:', error);
    }
  };

  const saveSelectedContacts = async (contacts: Contact[]) => {
    try {
      await AsyncStorage.setItem('selected_contacts', JSON.stringify(contacts));
      setSelectedContacts(contacts);
      clearContactsCache(); // Clear cache so ContactsScreen refreshes
      Alert.alert('Success', 'Selected contacts saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save selected contacts');
    }
  };

  const updateContactFrequencySettings = async (contactId: string, settings: ContactFrequencySettings) => {
    try {
      const updatedContacts = selectedContacts.map(contact => 
        contact.id === contactId 
          ? { ...contact, frequencySettings: settings }
          : contact
      );
      await AsyncStorage.setItem('selected_contacts', JSON.stringify(updatedContacts));
      setSelectedContacts(updatedContacts);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const viewBlockedMessages = async () => {
    if (blockedMessages.length === 0 && blockedCalls.length === 0) {
      Alert.alert('No Blocked Communications', 'There are no blocked calls or messages to display.');
      return;
    }
    setShowBlockedScreen(true);
  };

  const clearBlockedMessages = async () => {
    Alert.alert(
      'Clear Blocked Messages',
      'Are you sure you want to clear all blocked messages? This will also reset the alert system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await frequencyTracker.clearBlockedMessages();
            await caregiverNotifications.resetAlerts();
            setBlockedMessages([]);
            await loadCaregiverSettings(); // Refresh alert status
            Alert.alert('Cleared', 'All blocked messages have been cleared and alert system has been reset.');
          },
        },
      ]
    );
  };

  const clearAllBlocked = async () => {
    Alert.alert(
      'Clear All Blocked Communications',
      'Are you sure you want to clear all blocked calls and messages? This will also reset the alert system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await frequencyTracker.clearAllBlocked();
            await caregiverNotifications.resetAlerts();
            setBlockedMessages([]);
            setBlockedCalls([]);
            await loadCaregiverSettings(); // Refresh alert status
            Alert.alert('Cleared', 'All blocked communications have been cleared and alert system has been reset.');
          },
        },
      ]
    );
  };

  const updateCaregiverSettings = async (newSettings: CaregiverSettings) => {
    try {
      await caregiverNotifications.saveSettings(newSettings);
      setCaregiverSettings(newSettings);
    } catch (error) {
      console.error('Failed to update caregiver settings:', error);
    }
  };

  const testNotification = async () => {
    if (!caregiverSettings?.phoneNumber) {
      Alert.alert('No Contact Info', 'Please add a phone number first.');
      return;
    }

    Alert.alert(
      'Test Notification',
      'This will send a test alert to the caregiver contact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Test',
          onPress: async () => {
            try {
              // Force trigger an alert by simulating threshold
              const testSettings = { ...caregiverSettings!, alertThreshold: 0 };
              await caregiverNotifications.saveSettings(testSettings);
              await caregiverNotifications.checkAndSendAlerts();
              await caregiverNotifications.saveSettings(caregiverSettings!);
              
              Alert.alert('Test Sent', 'Test notification has been sent to the caregiver.');
            } catch (error) {
              Alert.alert('Test Failed', 'Could not send test notification.');
            }
          }
        }
      ]
    );
  };

  const clearAllMessages = async () => {
    Alert.alert(
      'Clear All Messages?',
      'This will delete all stored text message history. This cannot be undone.\n\nNote: This only clears locally stored messages, not messages on Twilio servers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await MessageService.clearAllConversations();
              Alert.alert('Messages Cleared', 'All message history has been deleted from this device.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear messages. Please try again.');
            }
          }
        }
      ]
    );
  };

  const saveDisplaySettings = async (showConv: boolean) => {
    try {
      await AsyncStorage.setItem('show_conversations', JSON.stringify(showConv));
      setShowConversations(showConv);
      Alert.alert(
        'Setting Saved ✅', 
        showConv 
          ? 'Text conversation history will now be shown when messaging.'
          : 'Text conversation history is now hidden. Only the message input will be shown.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save display settings');
    }
  };

  const saveConfig = async () => {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim() || !userPhoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields including your phone number');
      return;
    }

    setSaving(true);
    try {
      const config: TwilioConfig = {
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
        phoneNumber: phoneNumber.trim(),
        userPhoneNumber: userPhoneNumber.trim(),
      };

      await TwilioService.saveConfig(config);
      Alert.alert('Success', 'Twilio settings saved successfully!', [
        { text: 'OK', onPress: onBack }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please fill in Account SID, Auth Token, and Phone Number first');
      return;
    }

    setTesting(true);
    try {
      const auth = btoa(`${accountSid.trim()}:${authToken.trim()}`);
      
      // Test by fetching account info
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid.trim()}.json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Connection Successful! ✅', 
          `Connected to Twilio account: ${data.friendly_name || data.sid}\n\nStatus: ${data.status}`
        );
      } else {
        const error = await response.json();
        Alert.alert('Connection Failed', `Could not connect to Twilio:\n${error.message || 'Invalid credentials'}`);
      }
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not connect to Twilio. Please check your internet connection and credentials.');
    } finally {
      setTesting(false);
    }
  };

  const clearConfig = async () => {
    Alert.alert(
      'Clear Settings',
      'Are you sure you want to clear all Twilio settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await TwilioService.clearConfig();
            setAccountSid('');
            setAuthToken('');
            setPhoneNumber('');
            setUserPhoneNumber('');
            Alert.alert('Cleared', 'Twilio settings have been cleared.');
          },
        },
      ]
    );
  };

  const accessibilityActions = [
    { name: 'activate', label: 'go back' },
    { name: 'escape', label: 'go back' },
  ];

  const onAccessibilityAction = (event: any) => {
    switch (event.nativeEvent.actionName) {
      case 'activate':
      case 'escape':
        onBack();
        break;
    }
  };

  if (showBlockedScreen) {
    return (
      <BlockedCommunicationsScreen 
        onBack={() => setShowBlockedScreen(false)}
      />
    );
  }

  return (
    <SafeAreaView 
      style={styles.container}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'twilio' && styles.activeTab]}
          onPress={() => setCurrentTab('twilio')}
        >
          <Text style={[styles.tabText, currentTab === 'twilio' && styles.activeTabText]}>
            Twilio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'contacts' && styles.activeTab]}
          onPress={() => setCurrentTab('contacts')}
        >
          <Text style={[styles.tabText, currentTab === 'contacts' && styles.activeTabText]}>
            Contacts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'display' && styles.activeTab]}
          onPress={() => setCurrentTab('display')}
        >
          <Text style={[styles.tabText, currentTab === 'display' && styles.activeTabText]}>
            Display
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'communication' && styles.activeTab]}
          onPress={() => setCurrentTab('communication')}
        >
          <Text style={[styles.tabText, currentTab === 'communication' && styles.activeTabText]}>
            Limits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'caregiver' && styles.activeTab]}
          onPress={() => setCurrentTab('caregiver')}
        >
          <Text style={[styles.tabText, currentTab === 'caregiver' && styles.activeTabText]}>
            Alerts
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {currentTab === 'twilio' ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📱 Setup Instructions</Text>
              <Text style={styles.infoText}>
                1. Sign up at twilio.com{'\n'}
                2. Buy a phone number{'\n'}
                3. Get your Account SID and Auth Token{'\n'}
                4. Enter them below
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Account SID</Text>
              <TextInput
                style={styles.input}
                value={accountSid}
                onChangeText={setAccountSid}
                placeholder="AC1234567890abcdef..."
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Auth Token</Text>
              <TextInput
                style={styles.input}
                value={authToken}
                onChangeText={setAuthToken}
                placeholder="your_auth_token"
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Your Twilio Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+15551234567"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Your Actual Phone Number</Text>
              <TextInput
                style={styles.input}
                value={userPhoneNumber}
                onChangeText={setUserPhoneNumber}
                placeholder="+15551234567"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.infoText}>
                This is the phone number that contacts will be connected to when they answer calls.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.testButton, testing && styles.saveButtonDisabled]} 
                onPress={testConnection}
                disabled={testing}
              >
                <Text style={styles.testButtonText}>
                  {testing ? 'Testing...' : '🔗 Test Connection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={saveConfig}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : '💾 Save Settings'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearButton} onPress={clearConfig}>
                <Text style={styles.clearButtonText}>🗑️ Clear Settings</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : currentTab === 'contacts' ? (
          <View style={styles.tabContent}>
            <ContactSelector
              selectedContacts={selectedContacts}
              onContactsChange={saveSelectedContacts}
            />
          </View>
        ) : currentTab === 'communication' ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🚦 Communication Limits</Text>
              <Text style={styles.infoText}>
                Set limits on how often calls and texts can be made to each contact. Helpful for managing repetitive communications.
              </Text>
            </View>

            {(blockedMessages.length > 0 || blockedCalls.length > 0) && (
              <View style={[styles.infoBox, { backgroundColor: '#2a1a00' }]}>
                <Text style={styles.infoTitle}>
                  🚫 Blocked Communications ({blockedMessages.length + blockedCalls.length})
                </Text>
                <Text style={styles.infoText}>
                  📝 {blockedMessages.length} blocked messages{'\n'}
                  📞 {blockedCalls.length} blocked calls{'\n'}
                  These are stored for caregiver review.
                </Text>
                
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: '#4a4a4a', marginBottom: 12 }]} 
                  onPress={viewBlockedMessages}
                >
                  <Text style={styles.saveButtonText}>📋 View Details</Text>
                </TouchableOpacity>
                
                <View style={styles.blockedButtonRow}>
                  <TouchableOpacity 
                    style={styles.blockedClearButton} 
                    onPress={clearBlockedMessages}
                  >
                    <Text style={styles.clearButtonText}>Clear Messages</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.blockedClearButton} 
                    onPress={clearAllBlocked}
                  >
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedContacts.map(contact => {
              const settings = contact.frequencySettings || frequencyTracker.getDefaultFrequencySettings();
              const stats = frequencyTracker.getCommunicationStats(contact.id);
              
              return (
                <View key={contact.id} style={styles.contactSettingsCard}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactStats}>
                    Today: {stats.calls} calls, {stats.texts} texts
                  </Text>
                  
                  <View style={styles.settingSection}>
                    <Text style={styles.sectionTitle}>📞 Call Limits</Text>
                    <View style={styles.toggleContainer}>
                      <TouchableOpacity
                        style={[styles.toggleButton, !settings.calls.enabled && styles.toggleButtonActive]}
                        onPress={() => updateContactFrequencySettings(contact.id, {
                          ...settings,
                          calls: { ...settings.calls, enabled: false }
                        })}
                      >
                        <Text style={[styles.toggleText, !settings.calls.enabled && styles.toggleTextActive]}>
                          No Limits
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, settings.calls.enabled && styles.toggleButtonActive]}
                        onPress={() => updateContactFrequencySettings(contact.id, {
                          ...settings,
                          calls: { ...settings.calls, enabled: true }
                        })}
                      >
                        <Text style={[styles.toggleText, settings.calls.enabled && styles.toggleTextActive]}>
                          Set Limits
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {settings.calls.enabled && (
                      <View style={styles.limitsContainer}>
                        <Text style={styles.limitLabel}>Per Hour: {settings.calls.maxPerHour}</Text>
                        <View style={styles.limitButtons}>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              calls: { ...settings.calls, maxPerHour: Math.max(1, settings.calls.maxPerHour - 1) }
                            })}
                          >
                            <Text style={styles.limitButtonText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              calls: { ...settings.calls, maxPerHour: settings.calls.maxPerHour + 1 }
                            })}
                          >
                            <Text style={styles.limitButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.limitLabel}>Per Day: {settings.calls.maxPerDay}</Text>
                        <View style={styles.limitButtons}>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              calls: { ...settings.calls, maxPerDay: Math.max(1, settings.calls.maxPerDay - 1) }
                            })}
                          >
                            <Text style={styles.limitButtonText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              calls: { ...settings.calls, maxPerDay: settings.calls.maxPerDay + 1 }
                            })}
                          >
                            <Text style={styles.limitButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.voicemailExplainer}>
                          After reaching limits, "Call Completed" message is shown to user
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.settingSection}>
                    <Text style={styles.sectionTitle}>💬 Text Limits</Text>
                    <View style={styles.toggleContainer}>
                      <TouchableOpacity
                        style={[styles.toggleButton, !settings.texts.enabled && styles.toggleButtonActive]}
                        onPress={() => updateContactFrequencySettings(contact.id, {
                          ...settings,
                          texts: { ...settings.texts, enabled: false }
                        })}
                      >
                        <Text style={[styles.toggleText, !settings.texts.enabled && styles.toggleTextActive]}>
                          No Limits
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, settings.texts.enabled && styles.toggleButtonActive]}
                        onPress={() => updateContactFrequencySettings(contact.id, {
                          ...settings,
                          texts: { ...settings.texts, enabled: true }
                        })}
                      >
                        <Text style={[styles.toggleText, settings.texts.enabled && styles.toggleTextActive]}>
                          Set Limits
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {settings.texts.enabled && (
                      <View style={styles.limitsContainer}>
                        <Text style={styles.limitLabel}>Per Hour: {settings.texts.maxPerHour}</Text>
                        <View style={styles.limitButtons}>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              texts: { ...settings.texts, maxPerHour: Math.max(1, settings.texts.maxPerHour - 1) }
                            })}
                          >
                            <Text style={styles.limitButtonText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              texts: { ...settings.texts, maxPerHour: settings.texts.maxPerHour + 1 }
                            })}
                          >
                            <Text style={styles.limitButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.limitLabel}>Per Day: {settings.texts.maxPerDay}</Text>
                        <View style={styles.limitButtons}>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              texts: { ...settings.texts, maxPerDay: Math.max(1, settings.texts.maxPerDay - 1) }
                            })}
                          >
                            <Text style={styles.limitButtonText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateContactFrequencySettings(contact.id, {
                              ...settings,
                              texts: { ...settings.texts, maxPerDay: settings.texts.maxPerDay + 1 }
                            })}
                          >
                            <Text style={styles.limitButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.voicemailExplainer}>
                          After reaching limits, "Message Sent Successfully" is shown to user
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : currentTab === 'caregiver' ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🔔 Caregiver Alerts</Text>
              <Text style={styles.infoText}>
                Set up notifications to alert caregivers when communication limits are reached.
              </Text>
            </View>

            {caregiverSettings && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingHeader}>
                    <Text style={styles.settingTitle}>Enable Notifications</Text>
                    <Text style={styles.settingDescription}>
                      Turn on automatic alerts when blocked communications reach the threshold
                    </Text>
                  </View>
                  
                  <View style={styles.toggleContainer}>
                    <TouchableOpacity
                      style={[styles.toggleButton, !caregiverSettings.notificationsEnabled && styles.toggleButtonActive]}
                      onPress={() => updateCaregiverSettings({
                        ...caregiverSettings,
                        notificationsEnabled: false
                      })}
                    >
                      <Text style={[styles.toggleText, !caregiverSettings.notificationsEnabled && styles.toggleTextActive]}>
                        OFF
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.toggleButton, caregiverSettings.notificationsEnabled && styles.toggleButtonActive]}
                      onPress={() => updateCaregiverSettings({
                        ...caregiverSettings,
                        notificationsEnabled: true
                      })}
                    >
                      <Text style={[styles.toggleText, caregiverSettings.notificationsEnabled && styles.toggleTextActive]}>
                        ON
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {caregiverSettings.notificationsEnabled && (
                  <>

                    <View style={styles.settingItem}>
                      <Text style={styles.settingTitle}>⚠️ Alert Level 1</Text>
                      <Text style={styles.settingDescription}>
                        First alert threshold
                      </Text>
                      
                      <View style={styles.limitsContainer}>
                        <Text style={styles.limitLabel}>Send alert after: {caregiverSettings.alertThreshold} violations</Text>
                        <View style={styles.limitButtons}>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateCaregiverSettings({
                              ...caregiverSettings,
                              alertThreshold: Math.max(1, caregiverSettings.alertThreshold - 1)
                            })}
                          >
                            <Text style={styles.limitButtonText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.limitButton}
                            onPress={() => updateCaregiverSettings({
                              ...caregiverSettings,
                              alertThreshold: caregiverSettings.alertThreshold + 1
                            })}
                          >
                            <Text style={styles.limitButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {violationStats && violationStats.primaryTriggered && (
                          <View style={styles.alertStatusRow}>
                            <Text style={styles.alertSentText}>
                              ✅ Level 1 Alert triggered at {violationStats.primaryAlertTime || 'recently'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.settingItem}>
                      <Text style={styles.settingTitle}>🚨 Alert Level 2</Text>
                      <Text style={styles.settingDescription}>
                        Second alert threshold (optional)
                      </Text>
                      
                      <View style={styles.toggleContainer}>
                        <TouchableOpacity
                          style={[styles.toggleButton, !caregiverSettings.secondLevelEnabled && styles.toggleButtonActive]}
                          onPress={() => updateCaregiverSettings({
                            ...caregiverSettings,
                            secondLevelEnabled: false
                          })}
                        >
                          <Text style={[styles.toggleText, !caregiverSettings.secondLevelEnabled && styles.toggleTextActive]}>
                            OFF
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.toggleButton, caregiverSettings.secondLevelEnabled && styles.toggleButtonActive]}
                          onPress={() => updateCaregiverSettings({
                            ...caregiverSettings,
                            secondLevelEnabled: true
                          })}
                        >
                          <Text style={[styles.toggleText, caregiverSettings.secondLevelEnabled && styles.toggleTextActive]}>
                            ON
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {caregiverSettings.secondLevelEnabled && (
                        <View style={styles.limitsContainer}>
                          <Text style={styles.limitLabel}>Send alert after: {caregiverSettings.secondLevelThreshold || 15} violations</Text>
                          <View style={styles.limitButtons}>
                            <TouchableOpacity 
                              style={styles.limitButton}
                              onPress={() => updateCaregiverSettings({
                                ...caregiverSettings,
                                secondLevelThreshold: Math.max(caregiverSettings.alertThreshold + 1, (caregiverSettings.secondLevelThreshold || 15) - 1)
                              })}
                            >
                              <Text style={styles.limitButtonText}>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.limitButton}
                              onPress={() => updateCaregiverSettings({
                                ...caregiverSettings,
                                secondLevelThreshold: (caregiverSettings.secondLevelThreshold || 15) + 1
                              })}
                            >
                              <Text style={styles.limitButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                          
                          {violationStats && violationStats.escalationTriggered && (
                            <View style={styles.alertStatusRow}>
                              <Text style={styles.alertSentText}>
                                🚨 Level 2 Alert triggered at {violationStats.escalationAlertTime || 'recently'}
                              </Text>
                            </View>
                          )}
                          
                          <Text style={styles.voicemailExplainer}>
                            Must be higher than Level 1 ({caregiverSettings.alertThreshold})
                          </Text>
                        </View>
                      )}
                    </View>

                    {violationStats && (violationStats.primaryTriggered || violationStats.escalationTriggered) && (
                      <View style={styles.settingItem}>
                        <Text style={styles.settingTitle}>🔄 Alert Status</Text>
                        <Text style={styles.settingDescription}>
                          Today's violations: {violationStats.todayBlocked} | Reset clears violation count but keeps blocked data
                        </Text>
                        
                        <TouchableOpacity 
                          style={[styles.saveButton, { backgroundColor: '#FF5722' }]}
                          onPress={async () => {
                            await caregiverNotifications.resetAlerts();
                            await loadCaregiverSettings();
                          }}
                        >
                          <Text style={styles.saveButtonText}>🔄 Reset Alert System</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.settingItem}>
                      <Text style={styles.settingTitle}>📱 SMS Alerts</Text>
                      
                      <View style={styles.toggleContainer}>
                        <TouchableOpacity
                          style={[styles.toggleButton, !caregiverSettings.smsEnabled && styles.toggleButtonActive]}
                          onPress={() => updateCaregiverSettings({
                            ...caregiverSettings,
                            smsEnabled: false
                          })}
                        >
                          <Text style={[styles.toggleText, !caregiverSettings.smsEnabled && styles.toggleTextActive]}>
                            OFF
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.toggleButton, caregiverSettings.smsEnabled && styles.toggleButtonActive]}
                          onPress={() => updateCaregiverSettings({
                            ...caregiverSettings,
                            smsEnabled: true
                          })}
                        >
                          <Text style={[styles.toggleText, caregiverSettings.smsEnabled && styles.toggleTextActive]}>
                            ON
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {caregiverSettings.smsEnabled && (
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Caregiver Phone Number</Text>
                          <TextInput
                            style={styles.input}
                            value={caregiverSettings.phoneNumber || ''}
                            onChangeText={(text) => updateCaregiverSettings({
                              ...caregiverSettings,
                              phoneNumber: text
                            })}
                            placeholder="+15551234567"
                            placeholderTextColor="#666"
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                          />
                        </View>
                      )}
                    </View>


                    <TouchableOpacity 
                      style={[styles.saveButton, { backgroundColor: '#FF9800', marginTop: 20 }]} 
                      onPress={testNotification}
                    >
                      <Text style={styles.saveButtonText}>🧪 Send Test Alert</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>👁️ Display Settings</Text>
              <Text style={styles.infoText}>
                These settings help make the app easier to use for people with memory difficulties.
              </Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingTitle}>Show Text Conversation History</Text>
                <Text style={styles.settingDescription}>
                  When turned ON: Shows previous messages when texting someone{'\n'}
                  When turned OFF: Only shows the text input box (simpler view)
                </Text>
              </View>
              
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !showConversations && styles.toggleButtonActive]}
                  onPress={() => saveDisplaySettings(false)}
                >
                  <Text style={[styles.toggleText, !showConversations && styles.toggleTextActive]}>
                    OFF (Simple)
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.toggleButton, showConversations && styles.toggleButtonActive]}
                  onPress={() => saveDisplaySettings(true)}
                >
                  <Text style={[styles.toggleText, showConversations && styles.toggleTextActive]}>
                    ON (Show History)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingTitle}>Clear Message History</Text>
                <Text style={styles.settingDescription}>
                  Delete all stored text message conversations from this device. This does not affect messages stored on Twilio servers.
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.button, styles.destructiveButton]}
                onPress={clearAllMessages}
              >
                <Text style={[styles.buttonText, styles.destructiveButtonText]}>
                  Clear All Messages
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 140, // Space for assistive access button
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 56,
  },
  buttonContainer: {
    gap: 16,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  destructiveButton: {
    backgroundColor: '#FF5722',
  },
  destructiveButtonText: {
    color: '#fff',
  },
  settingItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingHeader: {
    marginBottom: 16,
  },
  settingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccc',
  },
  toggleTextActive: {
    color: '#fff',
  },
  contactSettingsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  contactStats: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  settingSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  limitsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
  },
  limitLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  limitButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  limitButton: {
    backgroundColor: '#333',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  voicemailExplainer: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  inputContainer: {
    marginTop: 16,
  },
  blockedButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  blockedClearButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertStatusContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  statusIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  resetButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  alertStatusRow: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  currentCount: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  alertInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertSentText: {
    fontSize: 14,
    color: '#4CAF50',
    flex: 1,
  },
});