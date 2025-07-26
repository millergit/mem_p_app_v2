import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, FlatList } from 'react-native';
import ContactCard from '../components/ContactCard';
import { Contact } from '../types/Contact';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContactsScreenProps {
  onContactPress: (contact: Contact) => void;
  onPinEntryPress: () => void;
}

const sampleContacts: Contact[] = [
  {
    id: '1',
    name: 'Matt',
    phoneNumber: '+14407730373',
    birthdate: 'March 15, 1985',
  },
  {
    id: '2',
    name: 'Sarah',
    phoneNumber: '+1987654321',
    birthdate: 'June 22, 1978',
  },
  {
    id: '3',
    name: 'Michael',
    phoneNumber: '+1555123456',
    birthdate: 'December 8, 1992',
  },
  {
    id: '4',
    name: 'Emma',
    phoneNumber: '+1444987654',
    birthdate: 'September 3, 1989',
  },
];

export default function ContactsScreen({ onContactPress, onPinEntryPress }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<Contact[]>(sampleContacts);

  useEffect(() => {
    loadSelectedContacts();
  }, []);

  const loadSelectedContacts = async () => {
    try {
      const contactsString = await AsyncStorage.getItem('selected_contacts');
      if (contactsString) {
        const selectedContacts = JSON.parse(contactsString);
        if (selectedContacts.length > 0) {
          setContacts(selectedContacts);
        }
      }
    } catch (error) {
      console.error('Failed to load selected contacts:', error);
      // Keep using sample contacts if loading fails
    }
  };

  const handleContactPress = (contact: Contact) => {
    onContactPress(contact);
  };

  const renderContact = ({ item, index }: { item: Contact; index: number }) => (
    <ContactCard 
      contact={item} 
      onPress={handleContactPress}
      onLongPress={index === 0 ? onPinEntryPress : undefined} // First contact triggers PIN
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    padding: 8,
    paddingBottom: 120, // Extra padding for assistive access back button
  },
});