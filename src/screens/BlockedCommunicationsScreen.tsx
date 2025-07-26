import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import FrequencyTracker, { BlockedMessage, BlockedCall } from '../services/FrequencyTracker';
import { Contact } from '../types/Contact';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BlockedCommunicationsScreenProps {
  onBack: () => void;
}

interface CombinedBlockedItem {
  id: string;
  type: 'message' | 'call';
  contactId: string;
  contactName: string;
  timestamp: number;
  message?: string;
  voicemailRecordingUrl?: string;
}

export default function BlockedCommunicationsScreen({ onBack }: BlockedCommunicationsScreenProps) {
  const [blockedItems, setBlockedItems] = useState<CombinedBlockedItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [frequencyTracker] = useState(() => FrequencyTracker.getInstance());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load contacts
      const contactsString = await AsyncStorage.getItem('selected_contacts');
      const contacts = contactsString ? JSON.parse(contactsString) : [];
      setSelectedContacts(contacts);

      // Load blocked communications
      await frequencyTracker.loadRecords();
      const blockedMessages = frequencyTracker.getBlockedMessages();
      const blockedCalls = frequencyTracker.getBlockedCalls();

      // Combine and sort by timestamp
      const combined: CombinedBlockedItem[] = [
        ...blockedMessages.map(msg => ({
          id: msg.id,
          type: 'message' as const,
          contactId: msg.contactId,
          contactName: contacts.find((c: Contact) => c.id === msg.contactId)?.name || 'Unknown',
          timestamp: msg.timestamp,
          message: msg.message,
        })),
        ...blockedCalls.map(call => ({
          id: call.id,
          type: 'call' as const,
          contactId: call.contactId,
          contactName: contacts.find((c: Contact) => c.id === call.contactId)?.name || 'Unknown',
          timestamp: call.timestamp,
          voicemailRecordingUrl: call.voicemailRecordingUrl,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setBlockedItems(combined);
    } catch (error) {
      console.error('Failed to load blocked communications:', error);
    }
  };

  const clearAllBlocked = async () => {
    Alert.alert(
      'Clear All Blocked Communications',
      'Are you sure you want to clear all blocked calls and messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await frequencyTracker.clearAllBlocked();
            setBlockedItems([]);
            Alert.alert('Cleared', 'All blocked communications have been cleared.');
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderItem = ({ item }: { item: CombinedBlockedItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.contactName}>{item.contactName}</Text>
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>
        <View style={[styles.typeTag, item.type === 'call' ? styles.callTag : styles.messageTag]}>
          <Text style={styles.typeText}>
            {item.type === 'call' ? '📞 Call' : '💬 Text'}
          </Text>
        </View>
      </View>
      
      {item.type === 'message' && item.message && (
        <View style={styles.messageContent}>
          <Text style={styles.messageText}>"{item.message}"</Text>
        </View>
      )}
      
      {item.type === 'call' && item.voicemailRecordingUrl && (
        <View style={styles.voicemailContent}>
          <Text style={styles.voicemailText}>🎵 Voicemail recording available</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Communications</Text>
      </View>

      <View style={styles.content}>
        {blockedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Blocked Communications</Text>
            <Text style={styles.emptyText}>
              When calls or messages are blocked due to frequency limits, they will appear here for caregiver review.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                Total: {blockedItems.length} blocked communications
              </Text>
              <Text style={styles.summarySubtext}>
                📞 {blockedItems.filter(i => i.type === 'call').length} calls • 
                💬 {blockedItems.filter(i => i.type === 'message').length} messages
              </Text>
            </View>

            <FlatList
              data={blockedItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity style={styles.clearButton} onPress={clearAllBlocked}>
              <Text style={styles.clearButtonText}>🗑️ Clear All Blocked</Text>
            </TouchableOpacity>
          </>
        )}
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
  },
  summary: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#888',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  callTag: {
    backgroundColor: '#2a4a2a',
  },
  messageTag: {
    backgroundColor: '#2a2a4a',
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  messageContent: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#ccc',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  voicemailContent: {
    backgroundColor: '#2a1a00',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  voicemailText: {
    fontSize: 14,
    color: '#cc9900',
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});