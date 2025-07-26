import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Animated, Dimensions, View } from 'react-native';
import ContactsScreen from './src/screens/ContactsScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import MessageScreen from './src/screens/MessageScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PinEntryModal from './src/components/PinEntryModal';
import { Contact } from './src/types/Contact';

type Screen = 'contacts' | 'detail' | 'message' | 'settings';

const { width } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('contacts');
  const [nextScreen, setNextScreen] = useState<Screen>('contacts');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [nextScreenAnim, setNextScreenAnim] = useState<Animated.Value | null>(null);
  const [currentOpacity] = useState(new Animated.Value(1));
  const [nextOpacity, setNextOpacity] = useState<Animated.Value | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const animateToScreen = (newScreen: Screen, isBackNavigation = false) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setNextScreen(newScreen);
    
    const outDirection = isBackNavigation ? width : -width; // Back slides right out, forward slides left out
    const inDirection = isBackNavigation ? -width : width;  // Back comes from left, forward comes from right
    
    // Set next screen to start position off-screen
    const nextScreenAnim = new Animated.Value(inDirection);
    const nextOpacityAnim = new Animated.Value(0);
    setNextScreenAnim(nextScreenAnim);
    setNextOpacity(nextOpacityAnim);
    
    // Very minimal delay to ensure proper rendering
    const delay = 16;
    
    setTimeout(() => {
      // Start with opacity fade for next screen, then slide
      Animated.timing(nextOpacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        // Now animate both screens simultaneously
        Animated.parallel([
          // Current screen slides out (no opacity fade for back navigation to prevent black screen)
          Animated.timing(slideAnim, {
            toValue: outDirection,
            duration: 300,
            useNativeDriver: true,
          }),
          // Next screen slides in
          Animated.timing(nextScreenAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          // Animation complete - switch to new screen and reset
          setCurrentScreen(newScreen);
          slideAnim.setValue(0);
          currentOpacity.setValue(1);
          setNextScreenAnim(null);
          setNextOpacity(null);
          setIsAnimating(false);
        });
      });
    }, delay);
  };

  const handleContactPress = (contact: Contact) => {
    setSelectedContact(contact);
    animateToScreen('detail');
  };

  const handleMessage = (contact: Contact) => {
    setSelectedContact(contact);
    animateToScreen('message');
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
      animateToScreen('detail', true); // true = back navigation
    } else {
      if (currentScreen !== 'contacts') {
        setSelectedContact(null);
      }
      animateToScreen('contacts', true); // true = back navigation
    }
  };


  const renderScreen = (screen: Screen) => {
    switch (screen) {
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
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Current Screen */}
        <Animated.View 
          style={[
            { 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            {
              transform: [{ translateX: slideAnim }],
              opacity: currentOpacity
            }
          ]}
        >
          {renderScreen(currentScreen)}
        </Animated.View>
        
        {/* Next Screen (sliding in during transition) */}
        {isAnimating && nextScreenAnim && nextOpacity && (
          <Animated.View 
            style={[
              { 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000', // Ensure background matches
              },
              {
                transform: [{ translateX: nextScreenAnim }],
                opacity: nextOpacity
              }
            ]}
          >
            {renderScreen(nextScreen)}
          </Animated.View>
        )}
      </View>
      
      <PinEntryModal
        visible={showPinModal}
        onClose={handlePinClose}
        onSuccess={handlePinSuccess}
      />
      <StatusBar style="light" />
    </>
  );
}
