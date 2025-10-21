import { User } from '@/types';

// Initialize three test users
export function initializeTestUsers(): User[] {
  return [
    {
      id: 'user_xiaoming',
      username: 'XiaoMing',
      password: '123456',
      isOnline: false,
      friends: ['user_xiaolin', 'user_xiaobao'],
      savedScripts: [],
      chatHistory: {},
      gameHistory: []
    },
    {
      id: 'user_xiaolin',
      username: 'XiaoLin',
      password: '123456',
      isOnline: false,
      friends: ['user_xiaoming', 'user_xiaobao'],
      savedScripts: [],
      chatHistory: {},
      gameHistory: []
    },
    {
      id: 'user_xiaobao',
      username: 'XiaoBao',
      password: '123456',
      isOnline: false,
      friends: ['user_xiaoming', 'user_xiaolin'],
      savedScripts: [],
      chatHistory: {},
      gameHistory: []
    }
  ];
}

// Generate unique ID
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format time
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get online status display
export function getOnlineStatus(isOnline: boolean): string {
  return isOnline ? 'Online' : 'Offline';
}

// Validate password
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

// Validate username
export function validateUsername(username: string): boolean {
  return username.length >= 2 && username.length <= 20;
}
