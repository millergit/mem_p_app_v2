import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Image,
  Alert
} from 'react-native';
import * as Linking from 'expo-linking';
import { Contact } from '../types/Contact';

interface ContactDetailScreenProps {
  contact: Contact;
  onBack: () => void;
  onMessage: (contact: Contact) => void;
}

export default function ContactDetailScreen({ contact, onBack, onMessage }: ContactDetailScreenProps) {
  const handleCall = async () => {
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
          <Text style={styles.birthdate}>Birthday: {contact.birthdate}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.callButton]} onPress={handleCall}>
            <Text style={styles.buttonText}>📞 Call {contact.name}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.textButton]} onPress={handleText}>
            <Text style={styles.buttonText}>💬 Text {contact.name}</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    padding: 20,
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPlaceholderText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  phoneNumber: {
    fontSize: 24,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  birthdate: {
    fontSize: 20,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  textButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});