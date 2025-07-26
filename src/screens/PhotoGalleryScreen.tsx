import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';

interface Photo {
  id: string;
  uri: string;
  filename: string;
}

interface PhotoGalleryScreenProps {
  onBack: () => void;
  onPhotoPress: (photo: Photo) => void;
}

export default function PhotoGalleryScreen({ onBack, onPhotoPress }: PhotoGalleryScreenProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to photos to view your gallery');
        setLoading(false);
        return;
      }

      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 50,
        sortBy: [['creationTime', false]], // Most recent first
      });

      // Convert ph:// URLs to actual file URIs
      const photoData: Photo[] = await Promise.all(
        assets.map(async (asset) => {
          try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            return {
              id: asset.id,
              uri: assetInfo.localUri || asset.uri,
              filename: asset.filename,
            };
          } catch (error) {
            // Fallback to original URI if getAssetInfoAsync fails
            return {
              id: asset.id,
              uri: asset.uri,
              filename: asset.filename,
            };
          }
        })
      );

      setPhotos(photoData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity 
      style={styles.photoTile} 
      onPress={() => onPhotoPress(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Photos</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📷</Text>
          <Text style={styles.emptyMessage}>No photos found</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const photoSize = (width - 48) / 2; // Account for padding and gaps

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
  listContent: {
    padding: 8,
  },
  photoTile: {
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  photo: {
    width: photoSize,
    height: photoSize,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 24,
    color: '#666',
    textAlign: 'center',
  },
});