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
        // If we have stored contacts and they're not empty, use them
        if (selectedContacts && selectedContacts.length > 0) {
          setContacts(selectedContacts);
          contactsCache = selectedContacts;
        } else {
          // If stored contacts are empty, load demo contacts
          const demoContacts = [
            {
              id: '1',
              name: 'Mom',
              phoneNumber: '(555) 123-4567',
              birthdate: 'January 15'
            },
            {
              id: '2',
              name: 'Dad',
              phoneNumber: '(555) 234-5678',
              birthdate: 'March 22'
            },
            {
              id: '3',
              name: 'Sister Sarah',
              phoneNumber: '(555) 345-6789',
              birthdate: 'July 8'
            },
            {
              id: '4',
              name: 'Brother Mike',
              phoneNumber: '(555) 456-7890',
              birthdate: 'December 3'
            },
            {
              id: '5',
              name: 'Grandma',
              phoneNumber: '(555) 567-8901',
              birthdate: 'September 14'
            },
            {
              id: '6',
              name: 'Doctor Smith',
              phoneNumber: '(555) 678-9012',
              birthdate: 'May 27'
            }
          ];
          setContacts(demoContacts);
          contactsCache = demoContacts;
        }
      } else {
        // Load demo contacts for app review
        const demoContacts = [
          {
            id: '1',
            name: 'Mom',
            phoneNumber: '(555) 123-4567',
            birthdate: 'January 15'
          },
          {
            id: '2',
            name: 'Dad',
            phoneNumber: '(555) 234-5678',
            birthdate: 'March 22'
          },
          {
            id: '3',
            name: 'Sister Sarah',
            phoneNumber: '(555) 345-6789',
            birthdate: 'July 8'
          },
          {
            id: '4',
            name: 'Brother Mike',
            phoneNumber: '(555) 456-7890',
            birthdate: 'December 3'
          },
          {
            id: '5',
            name: 'Grandma',
            phoneNumber: '(555) 567-8901',
            birthdate: 'September 14'
          },
          {
            id: '6',
            name: 'Doctor Smith',
            phoneNumber: '(555) 678-9012',
            birthdate: 'May 27'
          }
        ];
        setContacts(demoContacts);
        contactsCache = demoContacts;
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
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={onPinEntryPress}
          >
            <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.contentWrapper}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : contacts.length === 0 ? (
            <View style={styles.container}>
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Use the Settings button above to manage your contacts
                </Text>
              </View>
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No contacts loaded yet</Text>
                <Text style={styles.emptySubtext}>Use the Settings button to add contacts</Text>
              </View>
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
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