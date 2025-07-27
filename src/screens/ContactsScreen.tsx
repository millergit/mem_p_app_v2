import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, FlatList, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContactCard from '../components/ContactCard';
import { Contact } from '../types/Contact';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContactsScreenProps {
  onContactPress: (contact: Contact) => void;
  onPinEntryPress: () => void;
}


// Create a module-level cache to persist across component remounts
let contactsCache: Contact[] | null = null;
let hasInitiallyLoaded = false;

// Export function to clear cache when contacts are updated in settings
export const clearContactsCache = () => {
  contactsCache = null;
  hasInitiallyLoaded = false;
};

export default function ContactsScreen({ onContactPress, onPinEntryPress }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<Contact[]>(contactsCache || []);
  const [isLoading, setIsLoading] = useState(!hasInitiallyLoaded);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (hasInitiallyLoaded && contactsCache) {
      setContacts(contactsCache);
      setIsLoading(false);
      return;
    }
    
    // Only load if we haven't loaded before
    if (!hasInitiallyLoaded) {
      // Small delay to ensure SafeAreaView is properly rendered first
      setTimeout(() => {
        loadSelectedContacts();
      }, 50);
    }
  }, []);

  const loadSelectedContacts = async () => {
    try {
      const contactsString = await AsyncStorage.getItem('selected_contacts');
      if (contactsString) {
        const selectedContacts = JSON.parse(contactsString);
        setContacts(selectedContacts);
        contactsCache = selectedContacts;
      } else {
        setContacts([]);
        contactsCache = [];
      }
    } catch (error) {
      console.error('Failed to load selected contacts:', error);
      setContacts([]);
      contactsCache = [];
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
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : contacts.length === 0 ? (
            <View style={styles.container}>
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Long press the first contact below to open the hidden settings menu to add contacts (pin:1234)
                </Text>
              </View>
              <FlatList
                data={[{
                  id: 'setup',
                  name: 'Long press first contact tile (this tile) to enter settings',
                  phoneNumber: 'Long press to open settings',
                  birthdate: 'Setup contact'
                }]}
                renderItem={({ item }) => (
                  <ContactCard 
                    contact={item} 
                    onPress={() => {}} // No action on regular press
                    onLongPress={onPinEntryPress} // Open settings on long press
                  />
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  instructionsContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
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