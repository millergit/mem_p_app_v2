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

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    const config = await TwilioService.loadConfig();
    if (config) {
      setAccountSid(config.accountSid);
      setAuthToken(config.authToken);
      setPhoneNumber(config.phoneNumber);
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
        <Text style={styles.title}>Twilio Settings</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
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
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
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
    paddingHorizontal: 20,
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
    padding: 20,
    gap: 16,
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
});