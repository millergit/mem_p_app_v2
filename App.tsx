import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import ContactsScreen from './src/screens/ContactsScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import MessageScreen from './src/screens/MessageScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PinEntryModal from './src/components/PinEntryModal';
import { Contact } from './src/types/Contact';

type Screen = 'contacts' | 'detail' | 'message' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('contacts');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const handleContactPress = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentScreen('detail');
  };

  const handleMessage = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentScreen('message');
  };

  const handlePinEntryPress = () => {
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setCurrentScreen('settings');
  };

  const handlePinClose = () => {
    setShowPinModal(false);
  };

  const handleBack = () => {
    if (currentScreen === 'message') {
      setCurrentScreen('detail');
    } else {
      setCurrentScreen('contacts');
      setSelectedContact(null);
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'detail':
        return selectedContact ? (
          <ContactDetailScreen 
            contact={selectedContact} 
            onBack={handleBack}
            onMessage={handleMessage}
          />
        ) : null;
      case 'message':
        return selectedContact ? (
          <MessageScreen contact={selectedContact} onBack={handleBack} />
        ) : null;
      case 'settings':
        return (
          <SettingsScreen onBack={handleBack} />
        );
      default:
        return (
          <ContactsScreen 
            onContactPress={handleContactPress}
            onPinEntryPress={handlePinEntryPress}
          />
        );
    }
  };

  return (
    <>
      {renderCurrentScreen()}
      <PinEntryModal
        visible={showPinModal}
        onClose={handlePinClose}
        onSuccess={handlePinSuccess}
      />
      <StatusBar style="light" />
    </>
  );
}
