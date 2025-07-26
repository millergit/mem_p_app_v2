import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SimpleAppTileProps {
  title: string;
  icon: string;
  backgroundColor: string;
  onPress: () => void;
}

export default function SimpleAppTile({ title, icon, backgroundColor, onPress }: SimpleAppTileProps) {
  return (
    <TouchableOpacity style={[styles.tile, { backgroundColor }]} onPress={onPress}>
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