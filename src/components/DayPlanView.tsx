import React, { useState, useEffect } from 'react';
import { Habit, Task, HabitLog } from '../types';
import { User } from 'firebase/auth';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Flame, 
  Coffee, 
  Sun, 
  Moon, 
  Sunrise,
  ArrowRight,
  Zap,
  MoreVertical,
  Plus
} from 'lucide-react';
import { format, startOfToday, isSameDay, parseISO, addHours, startOfDay, endOfDay } from 'date-fns';
import { clsx } from 'clsx';
import { GoogleGenAI, Type } from "@google/genai";
import { listGoogleCalendarEvents } from '../lib/calendar';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

// Client-side Gemini instance helper
let genAIInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAIInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");
    genAIInstance = new GoogleGenAI({ apiKey: key });
  }
  return genAIInstance;
}

interface DayPlanViewProps {
  habits: Habit[];
  tasks: Task[];
  logs: HabitLog[];
  user: User;
  accessToken: string | null;
}

interface PlanItem {
  id: string;
  type: 'task' | 'habit' | 'event' | 'break';
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export default function DayPlanView({ habits, tasks, logs, user, accessToken }: DayPlanViewProps) {
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [userGuidance, setUserGuidance] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');

  const today = startOfToday();
  const dateStr = format(today, 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;

    setIsLoadingPlan(true);
    const planQuery = query(
      collection(db, 'day_plans'), 
      where('userId', '==', user.uid),
      where('date', '==', dateStr)
    );

    const unsubscribe = onSnapshot(planQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (items.length > 0) {
        // Sort by start time
        setPlan(items[0].items.sort((a: any, b: any) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ));
      } else {
        setPlan([]);
      }
      setIsLoadingPlan(false);
    });

    return unsubscribe;
  }, [user, dateStr]);

  useEffect(() => {
    if (accessToken) {
      fetchTodayEvents();
    }
  }, [accessToken]);

  const fetchTodayEvents = async () => {
    try {
      const timeMin = startOfDay(today).toISOString();
      const timeMax = endOfDay(today).toISOString();
      const events = await listGoogleCalendarEvents(accessToken!, timeMin, timeMax);
      setGoogleEvents(events);
    } catch (error) {
      console.error("Failed to fetch today's events", error);
    }
  };

  const generateAIPan = async () => {
    setIsPlanning(true);
    try {
      const ai = getGenAI();
      
      const todayTasks = tasks.filter(t => isSameDay(parseISO(t.dueDate), today));
      const activeHabits = habits; // Usually daily
      
      const prompt = `
        Help me plan my day for today, ${format(today, 'EEEE, MMMM do')}.
        
        ${userGuidance ? `User Specific Request: "${userGuidance}"` : 'The user wants a balanced and productive day.'}

        Current Tasks for Today:
        ${todayTasks.map(t => `- ${t.title} (${t.priority || 'medium'} priority)`).join('\n')}
        
        Habits to Maintain:
        ${activeHabits.map(h => `- ${h.name}`).join('\n')}
        
        External Calendar Events:
        ${googleEvents.map(e => `- ${e.summary} from ${e.start.dateTime || e.start.date} to ${e.end.dateTime || e.end.date}`).join('\n')}
        
        Create an optimized hourly schedule from 7:00 AM to 10:00 PM. 
        Mix productivity (tasks), routine (habits), and placeholders for breaks or meals.
        Be realistic. If I have many tasks, prioritize the high ones.
        
        Return the response in JSON format according to this schema:
        {
          "plan": [
            {
              "type": "task" | "habit" | "event" | "break",
              "title": "string",
              "startTime": "HH:mm",
              "durationMinutes": number
            }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['task', 'habit', 'event', 'break'] },
                    title: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    durationMinutes: { type: Type.NUMBER }
                  },
                  required: ['type', 'title', 'startTime', 'durationMinutes']
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      
      const mappedPlan = data.plan.map((item: any, idx: number) => {
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const start = addHours(startOfDay(today), hours);
        start.setMinutes(minutes);
        
        const end = new Date(start.getTime() + item.durationMinutes * 60000);

        return {
          id: `ai-${idx}-${Date.now()}`,
          ...item,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          completed: false
        } as PlanItem;
      });

      // Save to Firestore
      const planDocRef = doc(db, 'day_plans', `${user.uid}_${dateStr}`);
      await setDoc(planDocRef, {
        userId: user.uid,
        date: dateStr,
        items: mappedPlan,
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("AI Planning failed", error);
    } finally {
      setIsPlanning(false);
    }
  };

  const toggleItem = async (idx: number) => {
    const newItems = [...plan];
    newItems[idx].completed = !newItems[idx].completed;
    
    try {
      const planDocRef = doc(db, 'day_plans', `${user.uid}_${dateStr}`);
      await setDoc(planDocRef, { items: newItems }, { merge: true });
    } catch (error) {
      console.error("Failed to update plan item", error);
    }
  };

  const clearPlan = async () => {
    if (!window.confirm("Are you sure you want to clear your plan for today?")) return;
    try {
      const planDocRef = doc(db, 'day_plans', `${user.uid}_${dateStr}`);
      await deleteDoc(planDocRef);
    } catch (error) {
      console.error("Failed to clear plan", error);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const now = new Date();
    const newItem: PlanItem = {
      id: `manual-${Date.now()}`,
      type: 'task',
      title: newItemTitle,
      startTime: now.toISOString(),
      endTime: addHours(now, 1).toISOString(),
      completed: false
    };

    const newItems = [...plan, newItem].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    try {
      const planDocRef = doc(db, 'day_plans', `${user.uid}_${dateStr}`);
      await setDoc(planDocRef, { items: newItems }, { merge: true });
      setNewItemTitle('');
    } catch (error) {
      console.error("Failed to add plan item", error);
    }
  };

  const getDayIcon = (time: Date) => {
    const hour = time.getHours();
    if (hour < 12) return <Sunrise className="w-5 h-5 text-amber-500" />;
    if (hour < 18) return <Sun className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Day Plan</h2>
          <p className="text-gray-400 font-medium">Your strategy for a successful {format(today, 'EEEE')}.</p>
        </div>
        
        <button 
          onClick={generateAIPan}
          disabled={isPlanning}
          className={clsx(
            "bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all",
            isPlanning && "opacity-50 cursor-not-allowed scale-95"
          )}
        >
          {isPlanning ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          <span>{plan.length > 0 ? 'Refine Day Plan' : 'Generate Day Plan'}</span>
        </button>
      </div>

      <div className="relative">
        {/* Timeline Path */}
        <div className="absolute left-[27px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-indigo-100 via-indigo-50 to-transparent" />
        
        <div className="space-y-8">
          {plan.length > 0 ? (
            plan.map((item, idx) => (
              <div key={item.id} className="relative pl-16 group">
                {/* Time Indicator Circle */}
                <div className="absolute left-0 top-1.5 w-14 flex items-center justify-center">
                  <div className={clsx(
                    "w-3.5 h-3.5 rounded-full border-2 bg-white ring-4 ring-white z-10 transition-all group-hover:scale-125",
                    item.completed ? "border-emerald-500 ring-emerald-50" : "border-indigo-400 ring-indigo-50"
                  )} />
                </div>

                {/* Content Box */}
                <div className={clsx(
                  "bg-white p-6 rounded-[28px] border transition-all duration-300",
                  item.completed ? "border-emerald-50 bg-emerald-50/20" : "border-gray-50 shadow-sm hover:shadow-md hover:border-indigo-100"
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {format(parseISO(item.startTime), 'h:mm a')}
                        </span>
                        {item.type === 'habit' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-wider">Habit</span>
                        )}
                        {item.type === 'event' && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider">Calendar</span>
                        )}
                         {item.type === 'break' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider">Rest</span>
                        )}
                      </div>
                      
                      <h4 className={clsx(
                        "text-lg font-black leading-tight",
                        item.completed ? "text-gray-400 line-through" : "text-gray-900"
                      )}>
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleItem(idx)}
                        className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                        item.completed ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-300 hover:bg-indigo-50 hover:text-indigo-600"
                      )}>
                        {item.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 px-6 space-y-8">
              {isLoadingPlan ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Strategy...</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto">
                    <Coffee className="w-10 h-10 text-indigo-400" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black">Plan Your Perfect Day</h3>
                    <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed font-medium">
                      Tell Aura about your energy levels or specific focus for today.
                    </p>
                  </div>

                  <div className="max-w-sm mx-auto space-y-4">
                    <textarea 
                      placeholder="e.g., I have a lot of energy this morning, focus on deep work before 2 PM."
                      value={userGuidance}
                      onChange={(e) => setUserGuidance(e.target.value)}
                      className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[100px] shadow-sm resize-none"
                    />
                    <button 
                      onClick={generateAIPan}
                      disabled={isPlanning}
                      className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                    >
                      {isPlanning ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Daily Strategy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {plan.length > 0 && (
            <div className="relative pl-16 pt-4">
              <form onSubmit={addItem} className="flex items-center gap-3">
                <div className="flex-1 bg-white p-4 rounded-2xl border border-dashed border-gray-200 focus-within:border-indigo-300 transition-all">
                  <input 
                    type="text" 
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="Add manual item to plan..."
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newItemTitle.trim()}
                  className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-all disabled:opacity-50"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {plan.length > 0 && (
        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-8 rounded-[40px] shadow-2xl shadow-indigo-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-xl font-black flex items-center justify-center md:justify-start gap-2">
                  <Flame className="w-6 h-6 text-orange-400" />
                  Win the Day
                </h4>
                <p className="text-indigo-200 text-sm font-medium opacity-80">
                  You've completed {plan.filter(i => i.completed).length} of {plan.length} items.
                </p>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-1">Pace</div>
                  <div className="text-2xl font-black">Normal</div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-1">Focus</div>
                  <div className="text-2xl font-black">High</div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={clearPlan}
            className="w-full py-4 text-gray-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            Clear Day Plan
          </button>
        </div>
      )}
    </div>
  );
}
