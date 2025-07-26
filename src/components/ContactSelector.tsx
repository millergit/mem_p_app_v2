import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Contact } from '../types/Contact';

interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers: { number: string }[];
}

interface ContactSelectorProps {
  selectedContacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
}

export default function ContactSelector({ selectedContacts, onContactsChange }: ContactSelectorProps) {
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to contacts');
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      // Filter contacts that have phone numbers
      const contactsWithPhones = data.filter(contact => 
        contact.phoneNumbers && contact.phoneNumbers.length > 0
      ).map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers || [],
      }));

      setDeviceContacts(contactsWithPhones);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const isContactSelected = (deviceContact: DeviceContact) => {
    return selectedContacts.some(selected => selected.id === deviceContact.id);
  };

  const toggleContact = (deviceContact: DeviceContact) => {
    const isSelected = isContactSelected(deviceContact);
    
    if (isSelected) {
      // Remove contact
      const updatedContacts = selectedContacts.filter(contact => contact.id !== deviceContact.id);
      onContactsChange(updatedContacts);
    } else {
      // Add contact (no limit)
      const primaryPhone = deviceContact.phoneNumbers[0]?.number || '';
      const newContact: Contact = {
        id: deviceContact.id,
        name: deviceContact.name,
        phoneNumber: primaryPhone,
        birthdate: 'Not set', // Default birthdate
      };

      onContactsChange([...selectedContacts, newContact]);
    }
  };

  const filteredContacts = deviceContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderContact = ({ item }: { item: DeviceContact }) => {
    const isSelected = isContactSelected(item);
    const primaryPhone = item.phoneNumbers[0]?.number || 'No phone';

    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => toggleContact(item)}
      >
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{primaryPhone}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Contacts</Text>
      <Text style={styles.subtitle}>Selected: {selectedContacts.length}</Text>

      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search contacts..."
        placeholderTextColor="#666"
      />

      {loading ? (
        <Text style={styles.loadingText}>Loading contacts...</Text>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          style={styles.contactList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#ccc',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 40,
  },
});