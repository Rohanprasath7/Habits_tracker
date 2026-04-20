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
  return <h1 className="p-10 text-3xl font-bold">Aura is loading... (Internal Test)</h1>;
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
