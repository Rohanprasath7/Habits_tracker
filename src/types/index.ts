export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notificationsEnabled: boolean;
  };
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'weekly';
  createdAt: string;
  icon: string;
  color: string;
  currentStreak: number;
  longestStreak: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO string
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  category: 'work' | 'personal' | 'meeting' | 'appointment' | 'health' | 'leisure';
  reminderAt?: string;
  isGoogleCalendarSync: boolean;
  calendarEventId?: string;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon: string;
  type: 'streak' | 'goal' | 'first-time' | 'habit-master';
  unlockedAt: string; // ISO string
}
