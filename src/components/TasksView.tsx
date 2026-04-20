import React, { useState } from 'react';
import { Task } from '../types';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Check, 
  Calendar as CalendarIcon,
  Clock,
  MoreVertical,
  Bell,
  CheckCircle2,
  Circle,
  Tag,
  AlertCircle,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Search
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfToday } from 'date-fns';
import { clsx } from 'clsx';

import { syncToGoogleCalendar } from '../lib/calendar';

interface TasksViewProps {
  tasks: Task[];
  user: User;
  accessToken: string | null;
}

export default function TasksView({ tasks, user, accessToken }: TasksViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [reminderAt, setReminderAt] = useState<string>('');
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState<Task['category']>('personal');

  // Filter & Sort state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      userId: user.uid,
      title,
      description,
      dueDate: new Date(dueDate).toISOString(),
      status: 'todo' as const,
      priority,
      category,
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
      isGoogleCalendarSync: syncToCalendar,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'tasks'), taskData);

    if (syncToCalendar && accessToken) {
      try {
        const event = await syncToGoogleCalendar(taskData, accessToken);
        await updateDoc(docRef, { calendarEventId: event.id });
      } catch (err) {
        console.error("Calendar sync failed", err);
      }
    }

    setTitle('');
    setDescription('');
    setReminderAt('');
    setIsAdding(false);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await updateDoc(doc(db, 'tasks', task.id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'tasks', taskId));
  };

  const priorityWeights = { high: 0, medium: 1, low: 2 };

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesCategory && matchesPriority && matchesSearch;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    
    if (sortBy === 'priority') {
      const pA = priorityWeights[a.priority || 'medium'];
      const pB = priorityWeights[b.priority || 'medium'];
      if (pA !== pB) return pA - pB;
    } else if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    
    // Default to due date sort
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const groupedTasks = sortedTasks.reduce((acc, task) => {
    const date = new Date(task.dueDate);
    let group = 'Upcoming';
    if (isToday(date)) group = 'Today';
    else if (isTomorrow(date)) group = 'Tomorrow';
    else if (isPast(date) && !isToday(date)) group = 'Overdue';
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const groups = ['Overdue', 'Today', 'Tomorrow', 'Upcoming'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">To-Do Manager</h3>
          <p className="text-gray-400 text-sm">Clear your mind, conquer your goals.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-full sm:w-auto"
        >
          {isAdding ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span>{isAdding ? 'Save Task' : 'Add Task'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAddTask} className="space-y-6">
            <div className="space-y-4">
              <input 
                autoFocus
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full text-2xl font-black border-none focus:ring-0 placeholder:text-gray-200 p-0"
              />
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes, context, or links..."
                className="w-full text-base font-medium border-none focus:ring-0 placeholder:text-gray-300 p-0 min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Priority
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={clsx(
                        "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2",
                        priority === p 
                          ? p === 'high' ? "bg-red-50 border-red-500 text-red-600" :
                            p === 'medium' ? "bg-amber-50 border-amber-500 text-amber-600" :
                            "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : "bg-white border-gray-100 text-gray-300 hover:border-gray-200"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-3 h-3" />
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-gray-50 border-transparent rounded-xl font-bold text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 p-3 italic"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="meeting">Meeting</option>
                  <option value="appointment">Appointment</option>
                  <option value="health">Health</option>
                  <option value="leisure">Leisure</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 pt-6 border-t border-gray-50">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Due Date
                </label>
                <input 
                  type="datetime-local" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-gray-50 border-transparent rounded-xl font-bold text-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Bell className="w-3 h-3" />
                  Reminder
                </label>
                <input 
                  type="datetime-local" 
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                  className="w-full bg-gray-50 border-transparent rounded-xl font-bold text-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className={clsx(
                    "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                    syncToCalendar ? "bg-blue-500" : "bg-gray-200"
                  )} onClick={() => setSyncToCalendar(!syncToCalendar)}>
                    <div className={clsx(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      syncToCalendar ? "left-7" : "left-1"
                    )} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-blue-900 leading-tight">Sync Calendar</span>
                    <span className="text-[10px] font-bold text-blue-500 leading-tight">PUSH TO GOOGLE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="submit"
                className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all font-sans shadow-lg shadow-indigo-100"
              >
                Create Task
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-8 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all font-sans"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 lg:p-4 rounded-[28px] shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-3 lg:gap-4 items-center">
        <div className="md:col-span-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 lg:py-3 bg-gray-50 border-transparent rounded-2xl text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="md:col-span-8 flex flex-wrap gap-2 justify-start md:justify-end">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider focus:ring-0 p-1 cursor-pointer"
            >
              <option value="all">Categories</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="meeting">Meeting</option>
              <option value="appointment">Appointment</option>
              <option value="health">Health</option>
              <option value="leisure">Leisure</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider focus:ring-0 p-1 cursor-pointer"
            >
              <option value="all">Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 ml-auto md:ml-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider text-indigo-700 focus:ring-0 p-1 cursor-pointer"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Groups */}
      <div className="space-y-12">
        {groups.map(group => {
          const groupTasks = groupedTasks[group] || [];
          if (groupTasks.length === 0) return null;

          return (
            <div key={group} className="space-y-4">
              <div className="flex items-center gap-4">
                <h4 className={clsx(
                  "text-xs font-black uppercase tracking-[0.2em]",
                  group === 'Overdue' ? "text-red-500" : "text-gray-400"
                )}>{group}</h4>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs font-bold text-gray-300">{groupTasks.length} tasks</span>
              </div>

              <div className="grid gap-3 lg:gap-4">
                {groupTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="bg-white p-4 lg:p-5 rounded-[24px] lg:rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4 lg:gap-5 group transition-all hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5"
                  >
                    <button 
                      onClick={() => toggleTaskStatus(task)}
                      className={clsx(
                        "w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all flex-shrink-0",
                        task.status === 'done' 
                          ? "bg-emerald-50 text-emerald-500" 
                          : "bg-gray-50 text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 border-2 border-transparent"
                      )}
                    >
                      {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6" /> : <Circle className="w-5 h-5 lg:w-6 lg:h-6" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 lg:mb-1">
                        <h4 className={clsx(
                          "text-base lg:text-lg font-bold transition-all truncate",
                          task.status === 'done' ? "text-gray-300 line-through" : "text-gray-900"
                        )}>{task.title}</h4>
                        {task.priority === 'high' && task.status !== 'done' && (
                          <span className="flex-shrink-0 bg-red-100 text-red-600 text-[8px] lg:text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">High</span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold text-gray-400">
                          <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                          <span>{format(new Date(task.dueDate), 'MMM d, h:mm a')}</span>
                        </div>
                        {task.category && (
                          <div className="flex items-center gap-1 text-[9px] lg:text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            <Tag className="w-2.5 h-2.5 lg:w-3 h-3" />
                            <span>{task.category}</span>
                          </div>
                        )}
                        {task.isGoogleCalendarSync && (
                          <div className="flex items-center gap-1 text-[9px] lg:text-[10px] font-black text-blue-500 bg-blue-50/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            <CalendarIcon className="w-2.5 h-2.5 lg:w-3 h-3" />
                            <span>Synced</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 transition-all ml-auto">
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 lg:w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && !isAdding && (
          <div className="bg-white p-20 rounded-[48px] border border-dashed border-gray-200 text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-10 h-10 text-gray-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black">Your slate is clean</h3>
              <p className="text-gray-400 max-w-sm mx-auto">High achievers plan their day in advance. Add your first task to begin the journey.</p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-6 bg-indigo-600 text-white font-bold py-4 px-10 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
