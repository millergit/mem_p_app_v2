import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';

interface PinEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CORRECT_PIN = '1234'; // You can change this to any 4-digit PIN

export default function PinEntryModal({ visible, onClose, onSuccess }: PinEntryModalProps) {
  const [enteredPin, setEnteredPin] = useState('');

  const handleNumberPress = (number: string) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + number;
      setEnteredPin(newPin);
      
      if (newPin.length === 4) {
        // Check PIN after a short delay for better UX
        setTimeout(() => {
          if (newPin === CORRECT_PIN) {
            setEnteredPin('');
            onSuccess();
          } else {
            Alert.alert('Incorrect PIN', 'Please try again.');
            setEnteredPin('');
          }
        }, 300);
      }
    }
  };

  const handleClear = () => {
    setEnteredPin('');
  };

  const handleClose = () => {
    setEnteredPin('');
    onClose();
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDots}>
        {[...Array(4)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < enteredPin.length && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Clear', '0', 'Cancel'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={[
                  styles.numberButton,
                  (item === 'Clear' || item === 'Cancel') && styles.actionButton,
                ]}
                onPress={() => {
                  if (item === 'Clear') {
                    handleClear();
                  } else if (item === 'Cancel') {
                    handleClose();
                  } else {
                    handleNumberPress(item);
                  }
                }}
              >
                <Text
                  style={[
                    styles.numberButtonText,
                    (item === 'Clear' || item === 'Cancel') && styles.actionButtonText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Enter PIN</Text>
          <Text style={styles.subtitle}>Enter 4-digit PIN to access settings</Text>
          
          {renderPinDots()}
          {renderNumberPad()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 320,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    textAlign: 'center',
  },
  pinDots: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  numberPad: {
    gap: 15,
  },
  numberRow: {
    flexDirection: 'row',
    gap: 15,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});