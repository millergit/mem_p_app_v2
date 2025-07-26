import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import TwilioService from '../services/TwilioService';
import { Contact } from '../types/Contact';

interface MessageScreenProps {
  contact: Contact;
  onBack: () => void;
}

export default function MessageScreen({ contact, onBack }: MessageScreenProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(false);

  useEffect(() => {
    checkTwilioConfig();
  }, []);

  const checkTwilioConfig = async () => {
    await TwilioService.loadConfig();
    setTwilioConfigured(TwilioService.isConfigured());
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please type a message before sending.');
      return;
    }

    if (!twilioConfigured) {
      Alert.alert(
        'Twilio Not Configured', 
        'Please configure Twilio settings first to send messages.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => {} } // You can add navigation to settings here
        ]
      );
      return;
    }

    setIsSending(true);
    try {
      await TwilioService.sendSMS(contact.phoneNumber, message.trim());
      Alert.alert('Message Sent!', `Your message was sent to ${contact.name} via Twilio.`, [
        { text: 'Send Another', onPress: () => setMessage('') },
        { text: 'Done', onPress: () => {
          setMessage('');
          onBack();
        }}
      ]);
    } catch (error: any) {
      Alert.alert('Send Failed', error.message || 'Could not send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Message {contact.name}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              <Text style={styles.label}>Your Message:</Text>
              <TextInput
                style={styles.textInput}
                multiline
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here..."
                placeholderTextColor="#666"
                textAlignVertical="top"
                autoFocus
                scrollEnabled={true}
              />
              
              <TouchableOpacity 
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
                onPress={sendMessage}
                disabled={isSending}
              >
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Sending...' : `📱 Send to ${contact.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
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
    paddingTop: 10,
    paddingBottom: 8,
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
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    minHeight: '100%',
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#333',
    height: 120,
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});