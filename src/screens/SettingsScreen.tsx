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
} from 'react-native';
import TwilioService, { TwilioConfig } from '../services/TwilioService';
import ContactSelector from '../components/ContactSelector';
import { Contact } from '../types/Contact';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState<'twilio' | 'contacts' | 'display'>('twilio');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showConversations, setShowConversations] = useState(true);

  useEffect(() => {
    loadExistingConfig();
    loadSelectedContacts();
    loadDisplaySettings();
  }, []);

  const loadExistingConfig = async () => {
    const config = await TwilioService.loadConfig();
    if (config) {
      setAccountSid(config.accountSid);
      setAuthToken(config.authToken);
      setPhoneNumber(config.phoneNumber);
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

  const saveSelectedContacts = async (contacts: Contact[]) => {
    try {
      await AsyncStorage.setItem('selected_contacts', JSON.stringify(contacts));
      setSelectedContacts(contacts);
      Alert.alert('Success', 'Selected contacts saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save selected contacts');
    }
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
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const config: TwilioConfig = {
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
        phoneNumber: phoneNumber.trim(),
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
            Alert.alert('Cleared', 'Twilio settings have been cleared.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
            </View>

            <View style={styles.buttonContainer}>
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
});