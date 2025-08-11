import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message, Conversation } from '../types/Message';

// Normalize phone number to E.164 format for consistent storage/lookup
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 1 and has 11 digits (US/Canada), format as +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US/Canada and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Otherwise, add + if not already present
  return digits.startsWith('+') ? phoneNumber : `+${digits}`;
}

class MessageService {
  private static readonly STORAGE_KEY = 'conversations';
  private conversations: Map<string, Conversation> = new Map();

  async loadConversations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(MessageService.STORAGE_KEY);
      if (stored) {
        const conversationsArray: Conversation[] = JSON.parse(stored);
        this.conversations.clear();
        conversationsArray.forEach(conv => {
          this.conversations.set(conv.phoneNumber, conv);
        });
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  async saveConversations(): Promise<void> {
    try {
      const conversationsArray = Array.from(this.conversations.values());
      await AsyncStorage.setItem(MessageService.STORAGE_KEY, JSON.stringify(conversationsArray));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }

  async addMessage(contactId: string, phoneNumber: string, text: string, type: 'sent' | 'received', customTimestamp?: number, customId?: string): Promise<Message> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    let conversation = this.conversations.get(normalizedPhone);
    if (!conversation) {
      conversation = {
        contactId,
        phoneNumber: normalizedPhone,
        messages: [],
        unreadCount: 0
      };
      this.conversations.set(normalizedPhone, conversation);
    }

    // Check if message already exists to prevent duplicates
    const messageExists = conversation.messages.some(msg => 
      msg.text === text && 
      msg.type === type &&
      (customId ? msg.id === customId : Math.abs(msg.timestamp - (customTimestamp || Date.now())) < 5000)
    );

    if (messageExists) {
      console.log('Message already exists, skipping duplicate');
      return conversation.messages.find(msg => 
        msg.text === text && 
        msg.type === type
      )!;
    }

    const message: Message = {
      id: customId || (Date.now().toString() + Math.random().toString(36).substr(2, 9)),
      contactId,
      phoneNumber: normalizedPhone,
      text,
      timestamp: customTimestamp || Date.now(),
      type,
      status: type === 'sent' ? 'sent' : undefined
    };

    conversation.messages.push(message);
    
    // Sort messages by timestamp to maintain order
    conversation.messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // No message limit - keep all messages like a normal messaging app

    conversation.lastMessage = message;
    
    if (type === 'received') {
      conversation.unreadCount++;
    }

    await this.saveConversations();
    return message;
  }

  getConversation(phoneNumber: string): Conversation | undefined {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    return this.conversations.get(normalizedPhone);
  }

  getMessages(phoneNumber: string): Message[] {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const conversation = this.conversations.get(normalizedPhone);
    return conversation ? conversation.messages : [];
  }

  async markAsRead(phoneNumber: string): Promise<void> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const conversation = this.conversations.get(normalizedPhone);
    if (conversation) {
      conversation.unreadCount = 0;
      await this.saveConversations();
    }
  }

  async clearConversation(phoneNumber: string): Promise<void> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    this.conversations.delete(normalizedPhone);
    await this.saveConversations();
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
  }

  async clearAllConversations(): Promise<void> {
    this.conversations.clear();
    await this.saveConversations();
    console.log('All conversations cleared');
  }
}

export default new MessageService();