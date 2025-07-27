import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FrequencyTracker, { BlockedMessage, BlockedCall } from '../services/FrequencyTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact } from '../types/Contact';

interface BlockedCommunicationsScreenProps {
  onBack: () => void;
}

export default function BlockedCommunicationsScreen({ onBack }: BlockedCommunicationsScreenProps) {
  const [blockedMessages, setBlockedMessages] = useState<BlockedMessage[]>([]);
  const [blockedCalls, setBlockedCalls] = useState<BlockedCall[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [frequencyTracker] = useState(() => FrequencyTracker.getInstance());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await frequencyTracker.loadRecords();
      setBlockedMessages(frequencyTracker.getBlockedMessages());
      setBlockedCalls(frequencyTracker.getBlockedCalls());
      
      // Load contacts for names
      const contactsString = await AsyncStorage.getItem('selected_contacts');
      if (contactsString) {
        setContacts(JSON.parse(contactsString));
      }
    } catch (error) {
      console.error('Failed to load blocked communications:', error);
    }
  };

  const getContactName = (contactId: string): string => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || 'Unknown Contact';
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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
            await loadData();
            Alert.alert('Cleared', 'All blocked communications have been cleared.');
          },
        },
      ]
    );
  };

  // Combine and sort all violations by timestamp
  const allViolations = [
    ...blockedMessages.map(msg => ({ ...msg, type: 'message' as const })),
    ...blockedCalls.map(call => ({ ...call, type: 'call' as const }))
  ].sort((a, b) => b.timestamp - a.timestamp); // Most recent first

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Blocked Communications</Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            📝 {blockedMessages.length} blocked messages • 📞 {blockedCalls.length} blocked calls
          </Text>
          <Text style={styles.summarySubtext}>
            Total: {allViolations.length} blocked communications
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {allViolations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocked communications yet.</Text>
              <Text style={styles.emptySubtext}>
                When frequency limits are reached, blocked communications will appear here.
              </Text>
            </View>
          ) : (
            allViolations.map((violation, index) => (
              <View key={`${violation.type}-${violation.id}`} style={styles.violationCard}>
                <View style={styles.violationHeader}>
                  <View style={styles.violationTypeContainer}>
                    <Text style={styles.violationIcon}>
                      {violation.type === 'message' ? '💬' : '📞'}
                    </Text>
                    <Text style={styles.violationType}>
                      {violation.type === 'message' ? 'Message' : 'Call'}
                    </Text>
                  </View>
                  <Text style={styles.violationNumber}>#{allViolations.length - index}</Text>
                </View>
                
                <Text style={styles.contactName}>
                  {getContactName(violation.contactId)}
                </Text>
                
                <Text style={styles.timestamp}>
                  {formatTimestamp(violation.timestamp)}
                </Text>
                
                {violation.type === 'message' && (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>Message:</Text>
                    <Text style={styles.messageText}>"{(violation as any).message}"</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {allViolations.length > 0 && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.clearButton} onPress={clearAllBlocked}>
              <Text style={styles.clearButtonText}>🗑️ Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
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
    paddingTop: 10,
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
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  summary: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  summaryText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  violationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  violationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  violationType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  violationNumber: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  messageContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 8,
  },
  messageLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});