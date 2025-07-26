import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, FlatList, View, Text } from 'react-native';
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
    name: 'Joe',
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
    name: 'Marylou',
    phoneNumber: '+1444987654',
    birthdate: 'September 3, 1989',
  },
    {
    id: '5',
    name: 'Jenny',
    phoneNumber: '+1444987654',
    birthdate: 'September 3, 1975',
  },
];

// Create a module-level cache to persist across component remounts
let contactsCache: Contact[] | null = null;
let hasInitiallyLoaded = false;

export default function ContactsScreen({ onContactPress, onPinEntryPress }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<Contact[]>(contactsCache || []);
  const [isLoading, setIsLoading] = useState(!hasInitiallyLoaded);

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (hasInitiallyLoaded && contactsCache) {
      setContacts(contactsCache);
      setIsLoading(false);
      return;
    }
    
    // Only load if we haven't loaded before
    if (!hasInitiallyLoaded) {
      loadSelectedContacts();
    }
  }, []);

  const loadSelectedContacts = async () => {
    try {
      const contactsString = await AsyncStorage.getItem('selected_contacts');
      if (contactsString) {
        const selectedContacts = JSON.parse(contactsString);
        if (selectedContacts.length > 0) {
          setContacts(selectedContacts);
          contactsCache = selectedContacts;
        } else {
          setContacts(sampleContacts);
          contactsCache = sampleContacts;
        }
      } else {
        setContacts(sampleContacts);
        contactsCache = sampleContacts;
      }
    } catch (error) {
      console.error('Failed to load selected contacts:', error);
      setContacts(sampleContacts);
      contactsCache = sampleContacts;
    } finally {
      setIsLoading(false);
      hasInitiallyLoaded = true;
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
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
      </SafeAreaView>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#ccc',
  },
});