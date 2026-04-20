import React from 'react';
import { User } from 'firebase/auth';
import { Achievement, Habit, Task } from '../types';
import { Award, Shield, Zap, Target, Star, Calendar, CheckCircle2, Flame, Award as Trophy, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface ProfileViewProps {
  user: User;
  achievements: Achievement[];
  habits: Habit[];
  tasks: Task[];
  onLogout: () => void;
}

export default function ProfileView({ user, achievements, habits, tasks, onLogout }: ProfileViewProps) {
  const stats = [
    { label: 'Total Habits', value: habits.length, icon: Flame, color: 'text-orange-500' },
    { label: 'Tasks Done', value: tasks.filter(t => t.status === 'done').length, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Achievements', value: achievements.length, icon: Trophy, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 lg:gap-8">
        <div className="relative flex-shrink-0">
          <img 
            src={user.photoURL || ''} 
            className="w-24 h-24 lg:w-32 lg:h-32 rounded-[32px] lg:rounded-[40px] border-4 border-indigo-50 shadow-lg object-cover" 
            alt={user.displayName || ''} 
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-1 -right-1 bg-indigo-600 p-2.5 lg:p-3 rounded-xl lg:rounded-2xl shadow-lg border-2 border-white">
            <Zap className="w-4 h-4 lg:w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="text-center md:text-left space-y-2 flex-1 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl lg:text-4xl font-black text-gray-900 truncate">{user.displayName}</h2>
              <p className="text-gray-500 font-medium text-sm lg:text-base break-all">{user.email}</p>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 font-black py-3 px-6 rounded-2xl transition-all border border-red-100 w-full md:w-auto"
            >
              <LogOut className="w-4 h-4 lg:w-5 h-5" />
              <span className="text-sm lg:text-base">Sign Out</span>
            </button>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <span className="text-xs lg:text-sm font-black">{stat.value}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievement Shelf */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-500" />
              Trophy Cabinet
            </h3>
            <span className="text-sm font-bold text-gray-400">{achievements.length} Unlocked</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <motion.div 
                  key={achievement.id}
                  whileHover={{ y: -4 }}
                  className="bg-white p-5 lg:p-6 rounded-[28px] lg:rounded-[32px] shadow-sm border border-gray-100 flex items-start gap-4"
                >
                  <div className="bg-amber-50 p-3 lg:p-4 rounded-xl lg:rounded-2xl flex-shrink-0">
                    <Star className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 fill-amber-500/20" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-black text-gray-900 text-sm lg:text-base truncate">{achievement.title}</h4>
                    <p className="text-xs lg:text-sm text-gray-500 font-medium leading-tight line-clamp-2">{achievement.description}</p>
                    <p className="text-[9px] lg:text-[10px] font-black text-gray-300 uppercase tracking-widest pt-1.5">
                      {format(new Date(achievement.unlockedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full bg-white/50 border-2 border-dashed border-gray-100 p-10 lg:p-12 rounded-[32px] lg:rounded-[40px] text-center space-y-4">
                <Target className="w-10 h-10 lg:w-12 lg:h-12 text-gray-200 mx-auto" />
                <p className="text-gray-400 text-sm lg:text-base font-bold uppercase tracking-tight">Push your limits to unlock trophies!</p>
              </div>
            )}
          </div>
        </div>

        {/* Momentum & Streaks */}
        <div className="space-y-6">
          <h3 className="text-xl font-black flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-600" />
            Momentum Info
          </h3>
          
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Top Habit Streaks</p>
              <div className="space-y-3">
                {habits.sort((a,b) => (b.currentStreak || 0) - (a.currentStreak || 0)).slice(0, 5).map(habit => (
                  <div key={habit.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${habit.color} flex items-center justify-center text-xs font-black`}>
                        {habit.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-gray-700">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-black text-orange-500 text-sm">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{habit.currentStreak || 0}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50 space-y-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Personal Bests</p>
              <div className="space-y-3">
                {habits.sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0)).slice(0, 3).map(habit => (
                  <div key={habit.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-500">{habit.name}</span>
                    <span className="text-sm font-black text-indigo-600">{habit.longestStreak || 0}d Max</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
