import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';

interface Photo {
  id: string;
  uri: string;
  filename: string;
}

interface PhotoViewScreenProps {
  photo: Photo;
  onBack: () => void;
}

export default function PhotoViewScreen({ photo, onBack }: PhotoViewScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Photos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.photoContainer}>
        <Image 
          source={{ uri: photo.uri }} 
          style={styles.photo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
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
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photo: {
    width: width - 40,
    height: height - 200,
  },
});