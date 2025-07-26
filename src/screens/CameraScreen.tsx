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
import * as MediaLibrary from 'expo-media-library';

interface CameraScreenProps {
  onBack: () => void;
}

export default function CameraScreen({ onBack }: CameraScreenProps) {
  const [lastMedia, setLastMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take photos');
        return;
      }

      // Request media library permissions for saving
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to save photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setLastMedia({ uri: photoUri, type: 'photo' });

        // Save to camera roll
        try {
          await MediaLibrary.saveToLibraryAsync(photoUri);
          Alert.alert('Photo saved!', 'Your photo has been saved to your camera roll', [
            { text: 'Take Another', onPress: () => {} },
            { text: 'Done', onPress: onBack }
          ]);
        } catch (saveError) {
          Alert.alert('Photo taken but not saved', 'Photo was taken but could not be saved to camera roll');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const takeVideo = async () => {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to record videos');
        return;
      }

      // Request media library permissions for saving
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to save videos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        setLastMedia({ uri: videoUri, type: 'video' });

        // Save to camera roll
        try {
          await MediaLibrary.saveToLibraryAsync(videoUri);
          Alert.alert('Video saved!', 'Your video has been saved to your camera roll', [
            { text: 'Record Another', onPress: () => {} },
            { text: 'Done', onPress: onBack }
          ]);
        } catch (saveError) {
          Alert.alert('Video recorded but not saved', 'Video was recorded but could not be saved to camera roll');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record video. Please try again.');
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
        {lastMedia && (
          <View style={styles.lastMediaContainer}>
            <Text style={styles.lastMediaLabel}>
              Last {lastMedia.type} {lastMedia.type === 'photo' ? 'taken' : 'recorded'}:
            </Text>
            {lastMedia.type === 'photo' ? (
              <Image source={{ uri: lastMedia.uri }} style={styles.lastMedia} />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoIcon}>🎥</Text>
                <Text style={styles.videoText}>Video Recorded</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cameraContainer}>
          <Text style={styles.instruction}>Choose what you want to capture:</Text>
          
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.buttonIcon}>📸</Text>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.videoButton} onPress={takeVideo}>
            <Text style={styles.buttonIcon}>🎥</Text>
            <Text style={styles.buttonText}>Record Video</Text>
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
  lastMediaContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lastMediaLabel: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 12,
    textAlign: 'center',
  },
  lastMedia: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  videoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  photoButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderRadius: 20,
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
    marginBottom: 20,
  },
  videoButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderRadius: 20,
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
  buttonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});