export interface Message {
  id: string;
  contactId: string;
  phoneNumber: string;
  text: string;
  timestamp: number;
  type: 'sent' | 'received';
  status?: 'sending' | 'sent' | 'failed';
  isVisible?: boolean; // False for caregiver notifications, system messages, etc.
}

export interface Conversation {
  contactId: string;
  phoneNumber: string;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
}