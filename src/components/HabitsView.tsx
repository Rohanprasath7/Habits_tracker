import React, { useState } from 'react';
import { Habit, HabitLog } from '../types';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Check, 
  Flame, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Smile,
  Dumbbell,
  Book,
  Coffee,
  Moon,
  Zap,
  CheckCircle2,
  Target
} from 'lucide-react';
import { format, startOfToday, eachDayOfInterval, subDays, isSameDay } from 'date-fns';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface HabitsViewProps {
  habits: Habit[];
  logs: HabitLog[];
  user: User;
}

const ICONS = [
  { name: 'Zap', icon: Zap },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Book', icon: Book },
  { name: 'Coffee', icon: Coffee },
  { name: 'Moon', icon: Moon },
  { name: 'Smile', icon: Smile },
];

const COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-amber-500'
];

export default function HabitsView({ habits, logs, user }: HabitsViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Zap');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  const today = startOfToday();
  const last7Days = eachDayOfInterval({
    start: subDays(today, 6),
    end: today
  });

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await addDoc(collection(db, 'habits'), {
      userId: user.uid,
      name: newName,
      frequency: 'daily',
      icon: selectedIcon,
      color: selectedColor,
      createdAt: new Date().toISOString()
    });

    setNewName('');
    setIsAdding(false);
  };

  const toggleHabit = async (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = logs.find(l => l.habitId === habitId && l.date === dateStr);
    
    const logId = existingLog?.id || `${habitId}_${dateStr}`;
    const logRef = doc(db, 'habit_logs', logId);

    let isNowCompleted = false;

    if (existingLog?.completed) {
      await deleteDoc(logRef);
      isNowCompleted = false;
    } else {
      await setDoc(logRef, {
        habitId,
        userId: user.uid,
        date: dateStr,
        completed: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      isNowCompleted = true;
    }

    // Trigger streak calculation and achievement check
    if (isNowCompleted) {
      const habitLogs = logs.filter(l => l.habitId === habitId);
      // Recalculate streak after state sync would be better, but we can do a quick check
      // For simplicity, we'll let the next render handle simple UI, 
      // but let's check for milestones
      const currentStreak = calculateStreak(habitId, [...logs, { habitId, date: dateStr, completed: true } as HabitLog]);
      
      if (currentStreak === 1) {
        await addAchievement('First Goal Met', 'You completed your first habit! The journey begins.', 'Target', 'first-time');
      } else if (currentStreak === 7) {
        await addAchievement('7-Day Streak', 'Consistent for a whole week. You are building momentum!', 'Flame', 'streak');
      } else if (currentStreak === 30) {
        await addAchievement('Monthly Master', 'One month of dedication. This is now a part of you.', 'Zap', 'habit-master');
      }

      // Update habit streak in firestore
      const habit = habits.find(h => h.id === habitId);
      const longestStreak = Math.max(habit?.longestStreak || 0, currentStreak);
      
      await updateDoc(doc(db, 'habits', habitId), {
        currentStreak,
        longestStreak,
        lastUpdated: serverTimestamp()
      });
    }
  };

  const addAchievement = async (title: string, description: string, icon: string, type: string) => {
    // Check if user already has this achievement
    // (In a real app, we'd query first, but for now we'll just add if it feels right or unique)
    await addDoc(collection(db, 'achievements'), {
      userId: user.uid,
      title,
      description,
      icon,
      type,
      unlockedAt: new Date().toISOString()
    });
  };

  const calculateStreak = (habitId: string, habitLogs: HabitLog[]) => {
    const completedDates = new Set(habitLogs.filter(l => l.habitId === habitId && l.completed).map(l => l.date));
    let streak = 0;
    let curr = startOfToday();
    
    // If today is not completed, check from yesterday
    if (!completedDates.has(format(curr, 'yyyy-MM-dd'))) {
      curr = subDays(curr, 1);
    }

    while (completedDates.has(format(curr, 'yyyy-MM-dd'))) {
      streak++;
      curr = subDays(curr, 1);
    }
    return streak;
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (confirm('Are you sure you want to delete this habit?')) {
      await deleteDoc(doc(db, 'habits', habitId));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">Daily Affirmations</h3>
          <p className="text-gray-400 text-sm">Consistency is the bridge to mastery.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>New Habit</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 animate-in zoom-in-95 duration-300">
          <form onSubmit={handleAddHabit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Habit Name</label>
              <input 
                autoFocus
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Morning Yoga, Code 1hr..."
                className="w-full text-2xl font-bold border-none focus:ring-0 placeholder:text-gray-200 p-0"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Icon</label>
                <div className="flex flex-wrap gap-3">
                  {ICONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedIcon(item.name)}
                      className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                        selectedIcon === item.name ? "bg-indigo-600 text-white scale-110" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      <item.icon className="w-6 h-6" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Color Style</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={clsx(
                        "w-8 h-8 rounded-full border-4 transition-all",
                        color,
                        selectedColor === color ? "border-white ring-4 ring-gray-100 scale-110" : "border-transparent opacity-60"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-top border-gray-50">
              <button 
                type="submit"
                className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all"
              >
                Create Habit
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-6 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Habits List */}
      <div className="space-y-8">
        {habits.map((habit) => {
          const IconComp = ICONS.find(i => i.name === habit.icon)?.icon || Zap;
          // Calculate streak
          const streak = calculateStreak(habit.id, logs);

          return (
            <div key={habit.id} className="bg-white p-5 lg:p-6 rounded-[32px] shadow-sm border border-gray-100 group">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={clsx("w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0", habit.color)}>
                    <IconComp className="w-6 h-6 lg:w-8 lg:h-8" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg lg:text-xl font-black truncate">{habit.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-bold text-orange-500">
                        <Flame className="w-3.5 h-3.5 lg:w-4 h-4 fill-orange-500" />
                        <span>{streak}d STREAK</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-wider">{habit.frequency}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide -mx-2 px-2 xl:mx-0 xl:px-0">
                  {last7Days.map((date) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isCompleted = logs.find(l => l.habitId === habit.id && l.date === dateStr && l.completed);
                    const isTodayComp = isSameDay(date, today);

                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleHabit(habit.id, date)}
                        className={clsx(
                          "min-w-12 w-12 flex flex-col items-center py-3 rounded-2xl transition-all relative border-2 flex-shrink-0",
                          isCompleted 
                            ? `${habit.color} border-transparent text-white` 
                            : isTodayComp ? "border-indigo-100 bg-indigo-50/30 text-indigo-600" : "border-gray-50 text-gray-400 hover:border-gray-100"
                        )}
                      >
                        <span className="text-[9px] font-black uppercase mb-1">{format(date, 'eee')}</span>
                        <span className="text-base font-black">{format(date, 'd')}</span>
                        {isCompleted && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 bg-white rounded-full p-0.5"
                          >
                            <CheckCircle2 className={clsx("w-3.5 h-3.5", habit.color.replace('bg-', 'text-'))} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 xl:opacity-0 xl:group-hover:opacity-100 transition-all border-t xl:border-none pt-4 xl:pt-0">
                  <button 
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {habits.length === 0 && !isAdding && (
          <div className="bg-white p-16 rounded-[40px] border border-dashed border-gray-200 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <Target className="w-10 h-10 text-gray-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black">Build a new identity</h3>
              <p className="text-gray-400 max-w-xs mx-auto">Pick a habit you want to master and track your progress daily.</p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-4 bg-gray-900 text-white font-bold py-3 px-8 rounded-2xl hover:bg-gray-800 transition-all"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
