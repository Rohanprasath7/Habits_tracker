import React from 'react';
import { Habit, Task, HabitLog, Achievement } from '../types';
import { User } from 'firebase/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { CheckCircle2, Circle, Clock, Flame, Target, TrendingUp, BarChart3, Calendar as CalendarIcon, Award, Star, Zap, Shield, AlertCircle } from 'lucide-react';
import { format, subDays, startOfToday, isSameDay } from 'date-fns';
import { clsx } from 'clsx';

interface DashboardViewProps {
  habits: Habit[];
  tasks: Task[];
  logs: HabitLog[];
  user: User;
  achievements: Achievement[];
}

export default function DashboardView({ habits, tasks, logs, user, achievements }: DashboardViewProps) {
  const today = startOfToday();
  
  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'done');
  const todayTasks = tasks.filter(t => isSameDay(new Date(t.dueDate), today));
  const todayCompletedTasks = todayTasks.filter(t => t.status === 'done');
  
  const todayLogs = logs.filter(l => l.date === format(today, 'yyyy-MM-dd') && l.completed);
  const totalHabits = habits.length;
  
  // Prepare chart data (last 7 days)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(today, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayName = format(date, 'EEE');
    
    const dayLogs = logs.filter(l => l.date === dateStr && l.completed);
    const dayTasks = tasks.filter(t => format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr && t.status === 'done');
    
    return {
      name: dayName,
      habits: dayLogs.length,
      tasks: dayTasks.length
    };
  });

  const habitsProgress = totalHabits > 0 ? (todayLogs.length / totalHabits) * 100 : 0;
  const tasksProgress = todayTasks.length > 0 ? (todayCompletedTasks.length / todayTasks.length) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs lg:text-sm font-medium mb-1 uppercase tracking-wider">Today's Habits</p>
            <h3 className="text-2xl lg:text-3xl font-black leading-none">{todayLogs.length}/{totalHabits}</h3>
            <div className="mt-2 flex items-center gap-1 text-green-600 text-[10px] lg:text-xs font-bold">
              <Flame className="w-3 h-3" />
              <span>Keep it up!</span>
            </div>
          </div>
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full border-4 border-gray-50 flex items-center justify-center relative flex-shrink-0">
            <svg className="w-14 h-14 lg:w-16 lg:h-16 absolute -rotate-90">
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-50" />
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={150.8} strokeDashoffset={150.8 * (1 - habitsProgress / 100)} className="text-indigo-600 transition-all duration-1000" />
            </svg>
            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs lg:text-sm font-medium mb-1 uppercase tracking-wider">Tasks Done</p>
            <h3 className="text-2xl lg:text-3xl font-black leading-none">{todayCompletedTasks.length}/{todayTasks.length}</h3>
            <div className="mt-2 flex items-center gap-1 text-indigo-600 text-[10px] lg:text-xs font-bold">
              <Target className="w-3 h-3" />
              <span>Daily goal reached</span>
            </div>
          </div>
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full border-4 border-gray-50 flex items-center justify-center relative flex-shrink-0">
            <svg className="w-14 h-14 lg:w-16 lg:h-16 absolute -rotate-90">
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-50" />
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={150.8} strokeDashoffset={150.8 * (1 - tasksProgress / 100)} className="text-emerald-500 transition-all duration-1000" />
            </svg>
            <CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-gray-500 text-xs lg:text-sm font-medium mb-1 uppercase tracking-wider">Daily Score</p>
            <h3 className="text-2xl lg:text-3xl font-black leading-none">{Math.round((habitsProgress + tasksProgress) / 2)}%</h3>
            <div className="mt-2 flex items-center gap-1 text-orange-500 text-[10px] lg:text-xs font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>Setting a record</span>
            </div>
          </div>
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Flame className="w-7 h-7 lg:w-8 lg:h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Streak & Achievements Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* Top Streaks */}
        <div className="bg-indigo-600 p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] text-white shadow-xl shadow-indigo-100">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h4 className="text-[10px] lg:text-xs font-black uppercase tracking-widest opacity-80">Momentum Leaders</h4>
            <Flame className="w-4 h-4 lg:w-5 h-5 text-orange-400 fill-orange-400" />
          </div>
          <div className="space-y-3 lg:space-y-4">
            {habits.filter(h => (h.currentStreak || 0) > 0).length > 0 ? (
              habits.filter(h => (h.currentStreak || 0) > 0)
                .sort((a,b) => (b.currentStreak || 0) - (a.currentStreak || 0))
                .slice(0, 3)
                .map(habit => (
                <div key={habit.id} className="flex items-center justify-between bg-white/10 p-3 lg:p-4 rounded-xl lg:rounded-2xl backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className={clsx("w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center text-xs lg:text-sm font-black flex-shrink-0", habit.color)}>
                      {habit.name[0].toUpperCase()}
                    </div>
                    <span className="font-black text-xs lg:text-sm truncate max-w-[100px] lg:max-w-[120px]">{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 lg:gap-2 font-black text-orange-300">
                    <Zap className="w-3.5 h-3.5 lg:w-4 h-4 fill-current" />
                    <span className="text-base lg:text-lg">{habit.currentStreak || 0}d</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 lg:p-8 opacity-40 space-y-2">
                <Shield className="w-6 h-6 lg:w-8 lg:h-8" />
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-center">No Active Streaks</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-amber-400 p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] text-amber-900 shadow-xl shadow-amber-50">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h4 className="text-[10px] lg:text-xs font-black uppercase tracking-widest opacity-80">Milestones</h4>
            <Award className="w-4 h-4 lg:w-5 h-5" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            {achievements.length > 0 ? (
              achievements.slice(0, 4).map(achievement => (
                <div key={achievement.id} className="bg-white/30 p-3 lg:p-4 rounded-2xl lg:rounded-3xl backdrop-blur-sm border border-white/20 flex flex-col gap-1.5 lg:gap-2">
                  <Star className="w-4 h-4 lg:w-5 h-5 fill-amber-900/40 text-amber-900/60" />
                  <span className="text-[10px] lg:text-xs font-black leading-tight truncate">{achievement.title}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center p-6 lg:p-8 opacity-40 space-y-1.5 lg:space-y-2">
                <Target className="w-6 h-6 lg:w-8 lg:h-8" />
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-center">First achievement awaits</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Progress Chart */}
        <div className="bg-white p-5 lg:p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 gap-4">
            <div>
              <h3 className="text-lg lg:text-xl font-black">Performance</h3>
              <p className="text-gray-400 text-xs lg:text-sm">7-day completion rate</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 lg:w-3 h-3 bg-indigo-600 rounded-full" />
                <span className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wider">Habits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 lg:w-3 h-3 bg-emerald-400 rounded-full" />
                <span className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wider">Tasks</span>
              </div>
            </div>
          </div>
          
          <div className="h-56 lg:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorHabits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="habits" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorHabits)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="tasks" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorTasks)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <h3 className="text-lg lg:text-xl font-black">Today's Focus</h3>
            <button className="text-indigo-600 text-[11px] lg:text-sm font-black hover:underline uppercase tracking-wider">View All</button>
          </div>
          
          <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="bg-gray-50/50 p-10 lg:p-12 rounded-[24px] lg:rounded-[32px] border-2 border-dashed border-gray-100 text-center space-y-2">
                  <Clock className="w-8 h-8 lg:w-10 lg:h-10 text-gray-200 mx-auto" />
                  <p className="text-gray-400 text-xs lg:text-sm font-bold uppercase tracking-tight">Zero tasks today. Enjoy!</p>
                </div>
              ) : (
                todayTasks
                  .sort((a, b) => {
                    const pA = a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2;
                    const pB = b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2;
                    return pA - pB;
                  })
                  .slice(0, 5)
                  .map((task) => (
                    <div key={task.id} className={clsx(
                      "bg-white p-4 lg:p-5 rounded-2xl lg:rounded-[24px] shadow-sm border flex items-center gap-3 lg:gap-4 hover:border-indigo-100 transition-all cursor-pointer group",
                      task.priority === 'high' ? "border-red-100 bg-red-50/30" : "border-gray-100"
                    )}>
                      <div className={clsx(
                        "w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                        task.status === 'done' ? "bg-emerald-50 text-emerald-500" : 
                        task.priority === 'high' ? "bg-red-100 text-red-600" : "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                      )}>
                        {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 lg:w-5 lg:h-5" /> : 
                         task.priority === 'high' ? <AlertCircle className="w-5 h-5 lg:w-5 lg:h-5" /> : <Circle className="w-5 h-5 lg:w-5 lg:h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={clsx(
                            "text-sm lg:text-base font-bold transition-all truncate",
                            task.status === 'done' ? "text-gray-400 line-through" : "text-gray-900"
                          )}>{task.title}</h4>
                          {task.priority === 'high' && <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter px-1.5 py-0.5 bg-red-100 rounded flex-shrink-0">Priority</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-bold text-gray-400">
                            <Clock className="w-2.5 h-2.5 lg:w-3 h-3" />
                            <span>{format(new Date(task.dueDate), 'h:mm a')}</span>
                          </div>
                          {task.category && (
                            <div className="text-[9px] lg:text-[10px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-50 px-1.5 rounded flex-shrink-0">
                              {task.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
