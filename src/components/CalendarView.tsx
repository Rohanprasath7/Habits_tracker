import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import { listGoogleCalendarEvents } from '../lib/calendar';

interface CalendarViewProps {
  tasks: Task[];
  accessToken: string | null;
}

export default function CalendarView({ tasks, accessToken }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accessToken) {
      fetchGoogleEvents();
    }
  }, [currentMonth, accessToken]);

  const fetchGoogleEvents = async () => {
    setIsLoading(true);
    try {
      const timeMin = startOfMonth(currentMonth).toISOString();
      const timeMax = endOfMonth(currentMonth).toISOString();
      const events = await listGoogleCalendarEvents(accessToken!, timeMin, timeMax);
      setGoogleEvents(events);
    } catch (error) {
      console.error("Failed to fetch Google events", error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">Schedule Overview</h3>
          <p className="text-gray-400 text-sm">Visualize your commitments across time.</p>
        </div>
        
        <div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 text-sm font-black uppercase tracking-widest min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-900"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = tasks.filter(t => isSameDay(parseISO(t.dueDate), day));
            const dayEvents = googleEvents.filter(e => {
              const start = e.start.dateTime || e.start.date;
              return isSameDay(parseISO(start), day);
            });

            return (
              <div 
                key={day.toString()} 
                className={clsx(
                  "min-h-[100px] lg:min-h-[140px] p-2 border-r border-b border-gray-50 transition-colors relative group",
                  !isSameMonth(day, monthStart) ? "bg-gray-50/50" : "bg-white hover:bg-indigo-50/10",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={clsx(
                    "text-xs font-black w-7 h-7 flex items-center justify-center rounded-full",
                    isToday(day) ? "bg-indigo-600 text-white" : "text-gray-400",
                    !isSameMonth(day, monthStart) && "opacity-30"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div 
                      key={task.id}
                      className={clsx(
                        "text-[9px] font-bold px-1.5 py-1 rounded-md truncate border",
                        task.status === 'done' 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 line-through" 
                          : "bg-indigo-50 text-indigo-700 border-indigo-100"
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayEvents.slice(0, 2).map((event, i) => (
                    <div 
                      key={event.id || i}
                      className="text-[9px] font-bold px-1.5 py-1 rounded-md truncate bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1"
                    >
                      <CalendarIcon className="w-2 h-2" />
                      {event.summary}
                    </div>
                  ))}
                  {(dayTasks.length + dayEvents.length) > 5 && (
                    <div className="text-[8px] font-black text-gray-300 pl-1 uppercase">
                      + {(dayTasks.length + dayEvents.length) - 5} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 pt-4 px-4 bg-gray-50 p-6 rounded-[24px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-50 border border-indigo-100 rounded" />
          <span>Local Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-50 border border-blue-100 rounded" />
          <span>Google Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-50 border border-emerald-100 rounded" />
          <span>Completed</span>
        </div>
        
        {!accessToken && (
          <div className="ml-auto text-amber-500 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Connect Google Calendar to sync external events
          </div>
        )}
      </div>
    </div>
  );
}
