import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import ContactsScreen from './src/screens/ContactsScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import MessageScreen from './src/screens/MessageScreen';
import PhotoGalleryScreen from './src/screens/PhotoGalleryScreen';
import PhotoViewScreen from './src/screens/PhotoViewScreen';
import CameraScreen from './src/screens/CameraScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Contact } from './src/types/Contact';

interface Photo {
  id: string;
  uri: string;
  filename: string;
}

type Screen = 'contacts' | 'detail' | 'message' | 'photos' | 'photoView' | 'camera' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('contacts');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const handleContactPress = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentScreen('detail');
  };

  const handleMessage = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentScreen('message');
  };

  const handlePhotosPress = () => {
    setCurrentScreen('photos');
  };

  const handleCameraPress = () => {
    setCurrentScreen('camera');
  };

  const handleSettingsPress = () => {
    setCurrentScreen('settings');
  };

  const handlePhotoPress = (photo: Photo) => {
    setSelectedPhoto(photo);
    setCurrentScreen('photoView');
  };

  const handleBack = () => {
    if (currentScreen === 'message') {
      setCurrentScreen('detail');
    } else if (currentScreen === 'photoView') {
      setCurrentScreen('photos');
      setSelectedPhoto(null);
    } else {
      setCurrentScreen('contacts');
      setSelectedContact(null);
      setSelectedPhoto(null);
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
      case 'photos':
        return (
          <PhotoGalleryScreen 
            onBack={handleBack}
            onPhotoPress={handlePhotoPress}
          />
        );
      case 'photoView':
        return selectedPhoto ? (
          <PhotoViewScreen 
            photo={selectedPhoto}
            onBack={handleBack}
          />
        ) : null;
      case 'camera':
        return (
          <CameraScreen onBack={handleBack} />
        );
      case 'settings':
        return (
          <SettingsScreen onBack={handleBack} />
        );
      default:
        return (
          <ContactsScreen 
            onContactPress={handleContactPress}
            onPhotosPress={handlePhotosPress}
            onCameraPress={handleCameraPress}
            onSettingsPress={handleSettingsPress}
          />
        );
    }
  };

  return (
    <>
      {renderCurrentScreen()}
      <StatusBar style="light" />
    </>
  );
}
