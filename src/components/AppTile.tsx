import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Linking from 'expo-linking';

interface AppTileProps {
  title: string;
  icon: string;
  urlScheme: string;
  backgroundColor: string;
}

export default function AppTile({ title, icon, urlScheme, backgroundColor }: AppTileProps) {
  const handlePress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(urlScheme);
      if (canOpen) {
        await Linking.openURL(urlScheme);
      } else {
        Alert.alert('App Not Available', `Cannot open ${title} app on this device`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open ${title} app`);
    }
  };

  return (
    <TouchableOpacity style={[styles.tile, { backgroundColor }]} onPress={handlePress}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    padding: 20,
    margin: 8,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 120,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});