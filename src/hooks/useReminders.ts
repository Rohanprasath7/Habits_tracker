import { useEffect, useRef } from 'react';
import { Task } from '../types';
import { isPast, parseISO } from 'date-fns';

export function useReminders(tasks: Task[], onReminder: (task: Task) => void) {
  const notifiedTasks = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        if (task.status !== 'done' && task.reminderAt && !notifiedTasks.current.has(task.id)) {
          const reminderTime = parseISO(task.reminderAt);
          // If reminder time is in the past (or now) and it's within the last minute
          // we trigger it.
          if (isPast(reminderTime)) {
            // Check if it's very recent (e.g. within last hour) to avoid spamming old reminders
            // but for this app we'll just trigger if it's past and not notified
            // Trigger in-app UI reminder
            onReminder(task);
            
            // Trigger Browser Push Notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification('Aura Reminder', {
                body: task.title,
                icon: '/vite.svg', // Default icon, can be customized
              });
            }

            notifiedTasks.current.add(task.id);
          }
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000);
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, onReminder]);
}
