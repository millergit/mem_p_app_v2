import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as SMS from 'expo-sms';
import { Contact } from '../types/Contact';

interface MessageScreenProps {
  contact: Contact;
  onBack: () => void;
}

export default function MessageScreen({ contact, onBack }: MessageScreenProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please type a message before sending.');
      return;
    }

    setIsSending(true);
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const result = await SMS.sendSMSAsync([contact.phoneNumber], message);
        if (result.result === 'sent') {
          Alert.alert('Success!', 'Your message was sent!', [
            { text: 'OK', onPress: () => {
              setMessage('');
              onBack();
            }}
          ]);
        } else {
          Alert.alert('Message Ready', 'Your message is ready to send!', [
            { text: 'OK', onPress: onBack }
          ]);
        }
      } else {
        Alert.alert('Not Available', 'Messaging is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not send message. Please try again.');
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
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.messageContainer}>
          <Text style={styles.label}>Your Message:</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message here..."
            placeholderTextColor="#666"
            textAlignVertical="top"
            autoFocus
          />
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>
            {isSending ? 'Sending...' : `📱 Send to ${contact.name}`}
          </Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  messageContainer: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    fontSize: 20,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#333',
    minHeight: 200,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});