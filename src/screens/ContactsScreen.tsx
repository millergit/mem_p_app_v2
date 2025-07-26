import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, FlatList } from 'react-native';
import ContactCard from '../components/ContactCard';
import SimpleAppTile from '../components/SimpleAppTile';
import { Contact } from '../types/Contact';

interface ContactsScreenProps {
  onContactPress: (contact: Contact) => void;
  onPhotosPress: () => void;
  onCameraPress: () => void;
}

const sampleContacts: Contact[] = [
  {
    id: '1',
    name: 'Matt',
    phoneNumber: '4406788672',
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

type GridItem = Contact | { type: 'app'; id: string; title: string; icon: string; backgroundColor: string; onPress: () => void };

export default function ContactsScreen({ onContactPress, onPhotosPress, onCameraPress }: ContactsScreenProps) {
  const gridData: GridItem[] = [
    ...sampleContacts,
    {
      type: 'app',
      id: 'photos',
      title: 'Photos',
      icon: '📷',
      backgroundColor: '#FF6B35',
      onPress: onPhotosPress,
    },
    {
      type: 'app',
      id: 'camera',
      title: 'Camera',
      icon: '📸',
      backgroundColor: '#4A90E2',
      onPress: onCameraPress,
    },
  ];

  const renderItem = ({ item }: { item: GridItem }) => {
    if ('type' in item && item.type === 'app') {
      return (
        <SimpleAppTile
          title={item.title}
          icon={item.icon}
          backgroundColor={item.backgroundColor}
          onPress={item.onPress}
        />
      );
    }
    return <ContactCard contact={item as Contact} onPress={onContactPress} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={gridData}
        renderItem={renderItem}
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
  },
});