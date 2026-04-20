/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Settings, 
  Calendar as CalendarIcon, 
  Plus, 
  Sparkles,
  BarChart3,
  CalendarDays,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Clock,
  Bell,
  Award,
  User as UserIcon,
  Zap,
  Target,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Habit, Task, HabitLog, Achievement } from './types';
import DashboardView from './components/DashboardView';
import HabitsView from './components/HabitsView';
import TasksView from './components/TasksView';
import AIPlannerView from './components/AIPlannerView';
import ProfileView from './components/ProfileView';
import CalendarView from './components/CalendarView';
import DayPlanView from './components/DayPlanView';
import { useReminders } from './hooks/useReminders';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'day-plan' | 'habits' | 'tasks' | 'planner' | 'calendar' | 'profile'>('day-plan');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Data states
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const prevAchievementsCount = useRef(0);

  useReminders(tasks, (task) => {
    setToast({ title: 'Reminder!', message: `Don't forget: ${task.title}` });
    setTimeout(() => setToast(null), 8000);
  });

  useEffect(() => {
    if (achievements.length > prevAchievementsCount.current && prevAchievementsCount.current > 0) {
      const latest = achievements[achievements.length - 1];
      setToast({ title: 'Achievement Unlocked!', message: latest.title });
      setTimeout(() => setToast(null), 5000);
    }
    prevAchievementsCount.current = achievements.length;
  }, [achievements]);

  useEffect(() => {
    const handleTabChange = (e: any) => setActiveTab(e.detail);
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Request notification permission
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }

        const storedToken = sessionStorage.getItem('google_access_token');
        if (storedToken) setAccessToken(storedToken);

        // Sync user to firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: new Date().toISOString()
        }, { merge: true });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setTasks([]);
      setHabitLogs([]);
      return;
    }

    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const logsQuery = query(collection(db, 'habit_logs'), where('userId', '==', user.uid));
    const achievementsQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid));

    const unsubHabits = onSnapshot(habitsQuery, (snap) => {
      setHabits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
    });

    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setHabitLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)));
    });

    const unsubAchievements = onSnapshot(achievementsQuery, (snap) => {
      setAchievements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achievement)));
    });

    return () => {
      unsubHabits();
      unsubTasks();
      unsubLogs();
      unsubAchievements();
    };
  }, [user]);

  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("The login window was closed before finishing. Please click 'Advanced' on the Google screen to continue.");
      } else if (error.code === 'auth/blocked-at-popup-manager') {
        setAuthError("The login popup was blocked by your browser. Please enable popups for this site.");
      } else {
        setAuthError("An unexpected error occurred during login. Please try again.");
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('google_access_token');
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium font-sans">Sychronizing your rhythm...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 font-sans">Aura</h1>
            <p className="text-xl text-gray-500 font-medium">Your daily rhythm, visualized.</p>
          </div>
          
          <div className="bg-white p-8 rounded-[32px] shadow-sm space-y-6">
            <div className="flex justify-center">
              <div className="bg-indigo-50 p-4 rounded-full">
                <Sparkles className="w-10 h-10 text-indigo-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-sans">Welcome Back</h2>
              <p className="text-gray-500 font-sans">Sign in with Google to sync your habits, tasks, and calendar.</p>
            </div>
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all font-sans"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5 bg-white rounded-sm" alt="Google" referrerPolicy="no-referrer" />
              Continue with Google
            </button>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3"
              >
                <div className="bg-red-500 p-1 rounded-full text-white flex-shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <p className="text-red-700 text-[11px] font-bold leading-tight text-left">{authError}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'day-plan', label: 'Plan', icon: Zap },
    { id: 'habits', label: 'Habits', icon: BarChart3 },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'calendar', label: 'Schedule', icon: CalendarDays },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    // Dashboard and Planner are in sidebar for desktop, hidden in mobile bottom nav for space
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'planner', label: 'Insights', icon: Sparkles },
  ] as const;

  const mobileTabs = tabs.slice(0, 5);

  return (
    <div className="h-screen overflow-hidden bg-[#F8F9FA] flex flex-col md:flex-row font-sans text-gray-900 pb-20 md:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className={cn(
        "bg-white border-r border-gray-100 transition-all duration-300 h-full hidden md:block",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">Aura</span>}
        </div>

        <nav className="px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group font-sans font-medium",
                activeTab === tab.id 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <tab.icon className={cn(
                "w-5 h-5 transition-transform",
                activeTab === tab.id ? "scale-110" : "group-hover:scale-110"
              )} />
              {isSidebarOpen && <span>{tab.label}</span>}
              {activeTab === tab.id && isSidebarOpen && (
                <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-3 space-y-2">
          <div className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-2xl bg-gray-50 border border-gray-100",
            !isSidebarOpen && "justify-center"
          )}>
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" alt={user.displayName || ''} referrerPolicy="no-referrer" />
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full scrollbar-hide">
        <header className="sticky top-0 z-30 bg-[#F8F9FA]/80 backdrop-blur-md px-4 md:px-8 py-4 md:py-6 flex items-center justify-between">
          <div>
            <h2 className="text-[10px] md:text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <div className="w-4 md:w-8 h-px bg-indigo-600/30" />
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <h1 className="text-xl md:text-3xl font-black mt-1">
              {activeTab === 'dashboard' ? `Hey, ${user.displayName?.split(' ')[0]}!` : tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 md:p-3 bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-gray-500">
              <Bell className="w-4 h-4 md:w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all md:flex hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="px-4 md:px-8 pb-12 max-w-7xl mx-auto">
          <AnimatePresence>
            {toast && (
              <motion.div 
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-8 py-4 rounded-[24px] shadow-2xl shadow-indigo-200 flex items-center gap-4 min-w-[320px] font-sans"
              >
                <div className="bg-white/20 p-2 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div className="text-left font-sans">
                  <h5 className="font-black text-sm uppercase tracking-widest leading-none mb-1">Achievement Unlocked!</h5>
                  <p className="text-indigo-100 text-sm font-bold">{toast.message}</p>
                </div>
                <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'day-plan' && (
                <DayPlanView habits={habits} tasks={tasks} logs={habitLogs} user={user} accessToken={accessToken} />
              )}
              {activeTab === 'dashboard' && (
                <DashboardView habits={habits} tasks={tasks} logs={habitLogs} user={user} achievements={achievements} />
              )}
              {activeTab === 'habits' && (
                <HabitsView habits={habits} logs={habitLogs} user={user} />
              )}
              {activeTab === 'tasks' && (
                <TasksView tasks={tasks} user={user} accessToken={accessToken} />
              )}
              {activeTab === 'planner' && (
                <AIPlannerView tasks={tasks} user={user} accessToken={accessToken} />
              )}
              {activeTab === 'calendar' && (
                <CalendarView tasks={tasks} accessToken={accessToken} />
              )}
              {activeTab === 'profile' && (
                <ProfileView user={user} achievements={achievements} habits={habits} tasks={tasks} onLogout={handleLogout} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Floating Action Button for Mobile */}
        <div className="fixed bottom-24 right-6 md:hidden z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('tasks')}
            className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center border-4 border-white"
          >
            <Plus className="w-7 h-7" />
          </motion.button>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-100 px-2 py-2 flex items-center justify-around md:hidden z-50">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all py-1 px-3 rounded-2xl",
              activeTab === tab.id ? "text-indigo-600 bg-indigo-50/50" : "text-gray-400"
            )}
          >
            <tab.icon className={cn(
              "w-5 h-5",
              activeTab === tab.id ? "scale-110" : ""
            )} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
