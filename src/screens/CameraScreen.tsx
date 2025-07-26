import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  Alert,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface CameraScreenProps {
  onBack: () => void;
}

export default function CameraScreen({ onBack }: CameraScreenProps) {
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLastPhoto(result.assets[0].uri);
        Alert.alert('Photo taken!', 'Your photo has been saved to your camera roll', [
          { text: 'Take Another', onPress: () => {} },
          { text: 'Done', onPress: onBack }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Camera</Text>
      </View>

      <View style={styles.content}>
        {lastPhoto && (
          <View style={styles.lastPhotoContainer}>
            <Text style={styles.lastPhotoLabel}>Last photo taken:</Text>
            <Image source={{ uri: lastPhoto }} style={styles.lastPhoto} />
          </View>
        )}

        <View style={styles.cameraContainer}>
          <Text style={styles.instruction}>Tap the button below to take a photo</Text>
          
          <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
            <Text style={styles.cameraIcon}>📸</Text>
            <Text style={styles.cameraButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  lastPhotoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lastPhotoLabel: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 12,
  },
  lastPhoto: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  cameraButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});