import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Image,
  Alert,
  ScrollView
} from 'react-native';
import TwilioService from '../services/TwilioService';
import { Contact } from '../types/Contact';

interface ContactDetailScreenProps {
  contact: Contact;
  onBack: () => void;
  onMessage: (contact: Contact) => void;
}

export default function ContactDetailScreen({ contact, onBack, onMessage }: ContactDetailScreenProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(false);

  useEffect(() => {
    checkTwilioConfig();
  }, []);

  const checkTwilioConfig = async () => {
    await TwilioService.loadConfig();
    setTwilioConfigured(TwilioService.isConfigured());
  };

  const handleCall = async () => {
    if (!twilioConfigured) {
      Alert.alert(
        'Twilio Not Configured', 
        'Please configure Twilio settings first to make calls.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => {} } // You can add navigation to settings here
        ]
      );
      return;
    }

    setIsCalling(true);
    try {
      await TwilioService.makeCall(contact.phoneNumber);
      Alert.alert(
        'Call Started!', 
        `Calling ${contact.name} via Twilio. You should receive a call shortly.`,
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error: any) {
      Alert.alert('Call Failed', error.message || 'Failed to make call. Please try again.');
    } finally {
      setIsCalling(false);
    }
  };

  const handleText = () => {
    onMessage(contact);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contactInfo}>
          {contact.photoUri ? (
            <Image source={{ uri: contact.photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {contact.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.phoneNumber}>{contact.phoneNumber}</Text>
          <Text style={styles.birthdate}>Birthday: {contact.birthdate}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.callButton, isCalling && styles.buttonDisabled]} 
            onPress={handleCall}
            disabled={isCalling}
          >
            <Text style={styles.buttonText}>
              {isCalling ? '📞 Calling...' : `📞 Call ${contact.name}`}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.textButton]} onPress={handleText}>
            <Text style={styles.buttonText}>💬 Text {contact.name}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
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
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 140, // Space for assistive access button
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 20,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 6,
  },
  birthdate: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  textButton: {
    backgroundColor: '#2196F3',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
});