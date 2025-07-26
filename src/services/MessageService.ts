import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message, Conversation } from '../types/Message';

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

  async addMessage(contactId: string, phoneNumber: string, text: string, type: 'sent' | 'received'): Promise<Message> {
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      contactId,
      phoneNumber,
      text,
      timestamp: Date.now(),
      type,
      status: type === 'sent' ? 'sent' : undefined
    };

    let conversation = this.conversations.get(phoneNumber);
    if (!conversation) {
      conversation = {
        contactId,
        phoneNumber,
        messages: [],
        unreadCount: 0
      };
      this.conversations.set(phoneNumber, conversation);
    }

    conversation.messages.push(message);
    
    // Keep only last 10 messages
    if (conversation.messages.length > 10) {
      conversation.messages = conversation.messages.slice(-10);
    }

    conversation.lastMessage = message;
    
    if (type === 'received') {
      conversation.unreadCount++;
    }

    await this.saveConversations();
    return message;
  }

  getConversation(phoneNumber: string): Conversation | undefined {
    return this.conversations.get(phoneNumber);
  }

  getMessages(phoneNumber: string): Message[] {
    const conversation = this.conversations.get(phoneNumber);
    return conversation ? conversation.messages : [];
  }

  async markAsRead(phoneNumber: string): Promise<void> {
    const conversation = this.conversations.get(phoneNumber);
    if (conversation) {
      conversation.unreadCount = 0;
      await this.saveConversations();
    }
  }

  async clearConversation(phoneNumber: string): Promise<void> {
    this.conversations.delete(phoneNumber);
    await this.saveConversations();
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
  }
}

export default new MessageService();