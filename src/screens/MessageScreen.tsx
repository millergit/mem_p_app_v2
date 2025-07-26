import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TwilioService from '../services/TwilioService';
import MessageService from '../services/MessageService';
import { Contact } from '../types/Contact';
import { Message } from '../types/Message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FrequencyTracker from '../services/FrequencyTracker';
import CaregiverNotificationService from '../services/CaregiverNotificationService';

interface MessageScreenProps {
  contact: Contact;
  onBack: () => void;
}

export default function MessageScreen({ contact, onBack }: MessageScreenProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showConversations, setShowConversations] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const flatListRef = React.useRef<FlatList>(null);
  const [frequencyTracker] = useState(() => FrequencyTracker.getInstance());
  const [caregiverNotifications] = useState(() => CaregiverNotificationService.getInstance());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Small delay to ensure proper component mounting and SafeAreaView rendering
    const initTimer = setTimeout(() => {
      checkTwilioConfig();
      loadMessages();
      loadDisplaySettings();
      TwilioService.startMessagePolling();
    }, 100);
    
    // Set up polling to refresh messages periodically
    const interval = setInterval(loadMessages, 5000);
    
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      TwilioService.stopMessagePolling();
    };
  }, [contact.phoneNumber, onBack]);

  const loadDisplaySettings = async () => {
    try {
      const showConversationsString = await AsyncStorage.getItem('show_conversations');
      if (showConversationsString !== null) {
        setShowConversations(JSON.parse(showConversationsString));
      }
    } catch (error) {
      console.error('Failed to load display settings:', error);
    }
  };

  const loadMessages = async () => {
    await MessageService.loadConversations();
    const conversationMessages = MessageService.getMessages(contact.phoneNumber);
    setMessages(conversationMessages);
    
    // Mark messages as read
    await MessageService.markAsRead(contact.phoneNumber);
    
    // Set initial load to false after first load
    if (initialLoad) {
      setInitialLoad(false);
    }
    
    // Scroll to bottom after messages load
    setTimeout(() => {
      if (conversationMessages.length > 0) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const checkTwilioConfig = async () => {
    await TwilioService.loadConfig();
    setTwilioConfigured(TwilioService.isConfigured());
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please type a message before sending.');
      return;
    }

    if (!twilioConfigured) {
      Alert.alert(
        'Twilio Not Configured', 
        'Please configure Twilio settings first to send messages.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => {} } // You can add navigation to settings here
        ]
      );
      return;
    }

    // Show confirmation dialog before sending
    Alert.alert(
      'Send Text Message? 💬',
      `Do you want to send this message to ${contact.name}?\n\nPhone: ${contact.phoneNumber}\n\nYour message:\n"${message.trim()}"`,
      [
        {
          text: 'Cancel',
          style: 'default',
          onPress: () => {
            // Do absolutely nothing - just for testing
          }
        },
        {
          text: 'Yes, Send Message',
          style: 'default',
          onPress: () => sendTextMessage()
        }
      ],
      { cancelable: false }
    );
  };

  const showCancelDialog = () => {
    Alert.alert(
      'Go Back? 🔙',
      `Do you want to go back to contacts?\n\nYour message will not be saved.`,
      [
        {
          text: 'Stay Here',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Yes, Go Back',
          style: 'default',
          onPress: () => onBack()
        }
      ],
      { cancelable: false }
    );
  };

  const sendTextMessage = async () => {
    setIsSending(true);
    
    try {
      await frequencyTracker.loadRecords();
      
      if (!frequencyTracker.canCommunicate(contact, 'text')) {
        await frequencyTracker.storeBlockedMessage(contact.id, message.trim());
        
        // Notify caregiver of blocked communication
        await caregiverNotifications.onCommunicationBlocked();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setMessage('');
        
        Alert.alert(
          'Message Sent Successfully! ✅',
          `Your message was sent to ${contact.name}.\n\nPhone: ${contact.phoneNumber}`,
          [
            { 
              text: 'OK', 
              style: 'default',
              onPress: () => onBack() 
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      await frequencyTracker.recordCommunication(contact.id, 'text');
      
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await TwilioService.sendSMS(contact.phoneNumber, message.trim(), contact.id);
      setMessage('');
      
      // Refresh messages after sending
      await loadMessages();
      
      // Scroll to bottom to show new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
      
      // Show clear success confirmation
      Alert.alert(
        'Message Sent Successfully! ✅',
        `Your message was sent to ${contact.name}.\n\nPhone: ${contact.phoneNumber}`,
        [
          { 
            text: 'OK', 
            style: 'default',
            onPress: () => onBack() 
          }
        ],
        { cancelable: false }
      );
      
    } catch (error: any) {
      Alert.alert(
        'Message Not Sent', 
        `Could not send your message to ${contact.name}.\n\nPlease try again or ask for help.`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item: msg }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      msg.type === 'sent' ? styles.sentMessage : styles.receivedMessage
    ]}>
      <Text style={[
        styles.messageText,
        msg.type === 'sent' ? styles.sentMessageText : styles.receivedMessageText
      ]}>
        {msg.text}
      </Text>
      <Text style={[
        styles.messageTime,
        msg.type === 'sent' ? styles.sentMessageTime : styles.receivedMessageTime
      ]}>
        {formatTime(msg.timestamp)}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Message {contact.name}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 20}
      >
        {showConversations && (
          <View style={styles.messagesContainer}>
            {initialLoad ? (
              // Show empty space during initial load to prevent flicker
              <View style={styles.noMessagesContainer} />
            ) : messages.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  // Auto-scroll when content changes (new messages)
                  if (messages.length > 0) {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }
                }}
              />
            ) : (
              <View style={styles.noMessagesContainer}>
                <Text style={styles.noMessagesText}>No messages yet. Start a conversation!</Text>
              </View>
            )}
          </View>
        )}

        {!showConversations && (
          <View style={styles.simpleContainer}>
            <View style={styles.simpleHeader}>
              <Text style={styles.simpleTitle}>Send a message to {contact.name}</Text>
              <Text style={styles.simpleSubtitle}>{contact.phoneNumber}</Text>
            </View>
          </View>
        )}

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.inputSection, { paddingBottom: Math.max(16, insets.bottom) }]}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                multiline
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here..."
                placeholderTextColor="#666"
                textAlignVertical="top"
                maxLength={1600}
                autoCorrect={false}
                spellCheck={false}
              />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={showCancelDialog}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
                onPress={sendMessage}
                disabled={isSending}
              >
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Sending...' : 'Send ↑'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    paddingBottom: 8,
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
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  simpleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  simpleHeader: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  simpleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  simpleSubtitle: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMessagesText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  sentMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  sentMessageTime: {
    color: '#cce7ff',
    textAlign: 'right',
  },
  receivedMessageTime: {
    color: '#aaa',
    textAlign: 'left',
  },
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 100,
    width: '100%',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});