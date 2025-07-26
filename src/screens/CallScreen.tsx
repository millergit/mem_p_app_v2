import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  Image
} from 'react-native';
import * as Linking from 'expo-linking';
import { Contact } from '../types/Contact';

interface CallScreenProps {
  contact: Contact;
  onBack: () => void;
}

export default function CallScreen({ contact, onBack }: CallScreenProps) {
  const [isCalling, setIsCalling] = useState(false);

  const makeCall = async () => {
    setIsCalling(true);
    try {
      const phoneUrl = `tel:${contact.phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Cannot make phone calls on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to make call');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Call {contact.name}</Text>
      </View>

      <View style={styles.content}>
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
        </View>

        <View style={styles.callActions}>
          <TouchableOpacity 
            style={[styles.callButton, isCalling && styles.callButtonDisabled]} 
            onPress={makeCall}
            disabled={isCalling}
          >
            <Text style={styles.callButtonText}>
              {isCalling ? 'Calling...' : '📞 Call Now'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.instructions}>
            Tap the green button to call {contact.name}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#333',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#666',
  },
  name: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  phoneNumber: {
    fontSize: 24,
    color: '#666',
    textAlign: 'center',
  },
  callActions: {
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minWidth: 280,
  },
  callButtonDisabled: {
    backgroundColor: '#ccc',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});