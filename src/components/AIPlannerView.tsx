import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc } from 'firebase/firestore';
import { parseDayPlan, ExtractedEvent } from '../lib/gemini';
import { 
  Sparkles, 
  Send, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowRight,
  BrainCircuit,
  Loader2,
  CalendarDays,
  ListTodo,
  Edit2,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { format, addHours, startOfToday } from 'date-fns';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

import { syncToGoogleCalendar } from '../lib/calendar';

interface AIPlannerViewProps {
  tasks: Task[];
  user: User;
  accessToken: string | null;
}

export default function AIPlannerView({ tasks, user, accessToken }: AIPlannerViewProps) {
  const [paragraph, setParagraph] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [suggestions, setSuggestions] = useState<ExtractedEvent[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleParse = async () => {
    if (!paragraph.trim() || isParsing) return;
    
    setIsParsing(true);
    setSuggestions([]);
    setAddedIds(new Set());
    setEditingIndex(null);
    
    try {
      const results = await parseDayPlan(paragraph);
      setSuggestions(results);
    } catch (error) {
      console.error("Parsing failed", error);
    } finally {
      setIsParsing(false);
    }
  };

  const addSuggestion = async (suggestion: ExtractedEvent, index: number) => {
    if (addedIds.has(index)) return;
    try {
      // Default to today at current hour + index offset if no time provided
      const defaultDate = addHours(startOfToday(), 9 + index);
      const dueDate = suggestion.startTime ? new Date(suggestion.startTime) : defaultDate;

      const taskData = {
        userId: user.uid,
        title: suggestion.title,
        description: suggestion.description || `AI extracted from day plan: "${paragraph.slice(0, 50)}..."`,
        dueDate: dueDate.toISOString(),
        status: 'todo' as const,
        priority: suggestion.priority || 'medium',
        category: suggestion.category || 'personal',
        isGoogleCalendarSync: suggestion.type === 'meeting' || suggestion.type === 'schedule',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'tasks'), taskData);

      if (taskData.isGoogleCalendarSync && accessToken) {
        try {
          const event = await syncToGoogleCalendar(taskData, accessToken);
          await updateDoc(docRef, { calendarEventId: event.id });
        } catch (err) {
          console.error("Calendar sync failed", err);
        }
      }

      setAddedIds(prev => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      
      if (editingIndex === index) setEditingIndex(null);
    } catch (error) {
      console.error("Failed to add suggestion", error);
    }
  };

  const updateSuggestion = (index: number, updates: Partial<ExtractedEvent>) => {
    setSuggestions(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className="space-y-6 lg:space-y-12 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="text-center space-y-3 lg:space-y-4 px-2">
        <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-indigo-600 font-bold text-[10px] lg:text-xs uppercase tracking-widest border border-indigo-100">
          <BrainCircuit className="w-3.5 h-3.5 lg:w-4 h-4" />
          <span>Intelligence Engine</span>
        </div>
        <h3 className="text-2xl lg:text-4xl font-black tracking-tight">Design Your Day</h3>
        <p className="text-gray-400 text-sm lg:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Tell Aura about your day. Our AI will automatically identify tasks, meetings, and schedules.
        </p>
      </div>

      <div className="bg-white p-5 lg:p-8 rounded-[32px] lg:rounded-[40px] shadow-sm border border-gray-100 space-y-4 lg:space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity hidden lg:block">
          <Sparkles className="w-32 h-32" />
        </div>
        
        <label className="text-[10px] lg:text-sm font-black text-gray-400 uppercase tracking-widest block">The Master Plan</label>
        <textarea 
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          placeholder="I have a meeting with Sarah at 10am... Then finish the proposal by 2pm..."
          className="w-full min-h-[160px] lg:min-h-[200px] text-lg lg:text-xl font-bold border-none focus:ring-0 placeholder:text-gray-200 p-0 resize-none leading-relaxed"
        />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 lg:pt-6 border-t border-gray-50 gap-4">
          <p className="text-[11px] lg:text-sm text-gray-400 font-medium italic">✨ Try: meetings, deadlines, chores...</p>
          <button 
            disabled={!paragraph.trim() || isParsing}
            onClick={handleParse}
            className={clsx(
              "flex items-center justify-center gap-3 font-bold py-3.5 lg:py-4 px-8 lg:px-10 rounded-2xl transition-all shadow-xl w-full sm:w-auto",
              !paragraph.trim() || isParsing 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
            )}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing Patterns...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Simulate Day</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Extracted Insights</h4>
              <div className="flex-1 h-px bg-indigo-100" />
            </div>

            <div className="grid gap-4">
              {suggestions.map((item, index) => {
                const isAdded = addedIds.has(index);
                const isEditing = editingIndex === index;

                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={clsx(
                      "flex flex-col gap-4 p-4 lg:p-6 rounded-[32px] border transition-all",
                      isAdded ? "bg-emerald-50 border-emerald-100 opacity-60" : "bg-white border-gray-100 shadow-sm hover:shadow-md",
                      isEditing && "ring-2 ring-indigo-500 border-transparent shadow-xl"
                    )}
                  >
                    {!isEditing ? (
                      <div className="flex items-center gap-4 lg:gap-6">
                        <div className={clsx(
                          "w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0",
                          item.type === 'meeting' ? "bg-blue-50 text-blue-500" :
                          item.type === 'schedule' ? "bg-purple-50 text-purple-500" :
                          "bg-orange-50 text-orange-500"
                        )}>
                          {item.type === 'meeting' ? <CalendarDays className="w-5 h-5 lg:w-7 lg:h-7" /> :
                          item.type === 'schedule' ? <Clock className="w-5 h-5 lg:w-7 lg:h-7" /> :
                          <ListTodo className="w-5 h-5 lg:w-7 lg:h-7" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2 mb-1">
                            <span className={clsx(
                              "w-fit text-[8px] lg:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              item.type === 'meeting' ? "text-blue-600 border-blue-100 bg-blue-50/50" :
                              item.type === 'schedule' ? "text-purple-600 border-purple-100 bg-purple-50/50" :
                              "text-orange-600 border-orange-100 bg-orange-50/50"
                            )}>
                              {item.type}
                            </span>
                            <h5 className="font-bold text-sm lg:text-lg text-gray-900 truncate">{item.title}</h5>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-gray-400 text-xs lg:text-sm font-medium line-clamp-1 flex-1">{item.description}</p>
                            {item.startTime && (
                              <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold text-gray-400 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(item.startTime), 'p')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                          {!isAdded && (
                            <button
                              onClick={() => setEditingIndex(index)}
                              className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-all"
                            >
                              <Edit2 className="w-5 h-5 lg:w-6 h-6" />
                            </button>
                          )}
                          <button
                            onClick={() => !isAdded && addSuggestion(item, index)}
                            disabled={isAdded}
                            className={clsx(
                              "w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all",
                              isAdded ? "text-emerald-500" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            )}
                          >
                            {isAdded ? <CheckCircle2 className="w-5 h-5 lg:w-7 lg:h-7" /> : <Plus className="w-5 h-5 lg:w-7 lg:h-7" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Title</label>
                            <input 
                              autoFocus
                              type="text"
                              value={item.title}
                              onChange={(e) => updateSuggestion(index, { title: e.target.value })}
                              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 font-bold text-gray-900 focus:ring-2 ring-indigo-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Time</label>
                            <input 
                              type="datetime-local"
                              value={item.startTime ? format(new Date(item.startTime), "yyyy-MM-dd'T'HH:mm") : format(addHours(startOfToday(), 9 + index), "yyyy-MM-dd'T'HH:mm")}
                              onChange={(e) => updateSuggestion(index, { startTime: new Date(e.target.value).toISOString() })}
                              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 font-bold text-gray-900 focus:ring-2 ring-indigo-500/20"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Description</label>
                          <textarea 
                            value={item.description || ''}
                            onChange={(e) => updateSuggestion(index, { description: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 font-bold text-gray-900 focus:ring-2 ring-indigo-500/20 min-h-[80px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Type</label>
                            <select 
                              value={item.type}
                              onChange={(e) => updateSuggestion(index, { type: e.target.value as any })}
                              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 ring-indigo-500/20"
                            >
                              <option value="task">Task</option>
                              <option value="meeting">Meeting</option>
                              <option value="schedule">Schedule</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                            <select 
                              value={item.category}
                              onChange={(e) => updateSuggestion(index, { category: e.target.value as any })}
                              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 ring-indigo-500/20"
                            >
                              {['work', 'personal', 'meeting', 'appointment', 'health', 'leisure'].map(cat => (
                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Priority</label>
                            <div className="flex gap-2">
                              {['low', 'medium', 'high'].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => updateSuggestion(index, { priority: p as any })}
                                  className={clsx(
                                    "flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider border",
                                    item.priority === p 
                                      ? "bg-indigo-600 text-white border-transparent" 
                                      : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => addSuggestion(item, index)}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                          >
                            <Check className="w-5 h-5" />
                            <span>Save & Add</span>
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-6 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                          >
                            <X className="w-5 h-5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => removeSuggestion(index)}
                            className="p-3.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-indigo-900 text-white p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-indigo-100">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-lg lg:text-xl font-bold flex items-center justify-center sm:justify-start gap-2">
                  <Sparkles className="w-4 h-4 lg:w-5 h-5 text-indigo-300" />
                  Blueprint Ready
                </h4>
                <p className="text-indigo-200 text-xs lg:text-sm font-medium opacity-80">Verified by Aura Intelligence Engine.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setSuggestions([])}
                  className="bg-white/10 text-white border border-white/20 font-bold py-3 px-6 rounded-2xl hover:bg-white/20 transition-all text-sm w-full sm:w-auto"
                >
                  Clear
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'calendar' }))}
                  className="bg-white text-indigo-900 font-black py-3 lg:py-4 px-6 lg:px-8 rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <span>View Schedule</span>
                  <ArrowRight className="w-4 h-4 lg:w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
