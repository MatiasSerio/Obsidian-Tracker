
import React, { useState } from 'react';
import { DayPlan, DailyTask } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, X, CheckSquare, Square, Calendar as CalendarIcon, AlignLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskManagerProps {
  dayPlans: DayPlan[];
  onSavePlan: (date: string, tasks: DailyTask[]) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ dayPlans, onSavePlan }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Sidebar State
  const [tempTasks, setTempTasks] = useState<DailyTask[]>([]);
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);

  // Calendar Logic - Robust Generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Explicitly start on Sunday (weekStartsOn: 0) to align with headers ['Sun', 'Mon'...]
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    const existingPlan = dayPlans.find(p => p.date === dateStr);
    
    // Initialize with 5 empty slots or existing tasks
    if (existingPlan) {
      // Ensure always 5 slots
      const padded = [...existingPlan.tasks];
      while (padded.length < 5) padded.push({ id: Math.random().toString(), text: '', completed: false, notes: '' });
      setTempTasks(padded);
    } else {
      setTempTasks(Array(5).fill(null).map(() => ({ id: Math.random().toString(), text: '', completed: false, notes: '' })));
    }
    
    setExpandedTaskIndex(null); // Reset expansion
    setIsSidebarOpen(true);
  };

  const handleTaskChange = (index: number, text: string) => {
    const newTasks = [...tempTasks];
    newTasks[index].text = text;
    setTempTasks(newTasks);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const newTasks = [...tempTasks];
    newTasks[index].notes = notes;
    setTempTasks(newTasks);
  };

  const handleTaskToggle = (index: number) => {
    const newTasks = [...tempTasks];
    newTasks[index].completed = !newTasks[index].completed;
    setTempTasks(newTasks);
  };

  const saveTasks = () => {
    if (selectedDate) {
      onSavePlan(format(selectedDate, 'yyyy-MM-dd'), tempTasks);
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className={`flex-1 flex flex-col pb-20 transition-all duration-300 ${isSidebarOpen ? 'blur-sm grayscale-[0.5]' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Mission Control</h2>
          <div className="flex items-center space-x-4">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded"><ChevronLeft /></button>
            <span className="text-xl font-mono">{format(currentDate, 'MMMM yyyy')}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded"><ChevronRight /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-gray-500 font-mono text-sm uppercase">{d}</div>
          ))}
          
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const plan = dayPlans.find(p => p.date === dateStr);
            const taskCount = plan ? plan.tasks.filter(t => t.text.trim() !== '').length : 0;
            const completedCount = plan ? plan.tasks.filter(t => t.completed && t.text.trim() !== '').length : 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <button
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={`
                  relative border rounded-lg p-3 min-h-[100px] flex flex-col items-start justify-between transition-colors
                  ${isToday(day) ? 'bg-white/5 border-accent' : 'border-white/10 bg-charcoal'}
                  ${!isCurrentMonth ? 'opacity-30 grayscale' : 'hover:border-accent'}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <span className={`text-lg font-bold ${isToday(day) ? 'text-accent' : isCurrentMonth ? 'text-gray-300' : 'text-gray-600'}`}>
                  {format(day, 'd')}
                </span>
                
                {taskCount > 0 && isCurrentMonth && (
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Tasks</span>
                      <span>{completedCount}/{taskCount}</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-accent h-full transition-all duration-500" 
                        style={{ width: `${(completedCount / taskCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - Now Fixed */}
      <div className={`
        fixed right-0 top-0 bottom-0 w-full md:w-96 bg-[#161616] border-l border-white/10 shadow-2xl z-50 transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-2xl font-bold">{selectedDate ? format(selectedDate, 'MMMM do') : ''}</h3>
              <p className="text-gray-400 text-sm">Top 5 Priorities</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            {tempTasks.map((task, idx) => (
              <div key={task.id} className="group flex flex-col">
                <div className="flex items-center space-x-3 mb-1">
                  <span className="text-gray-600 font-mono text-xl font-bold">0{idx + 1}</span>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => handleTaskChange(idx, e.target.value)}
                      placeholder="Enter task..."
                      className={`
                        w-full bg-transparent border-b border-gray-700 py-2 px-1 focus:outline-none focus:border-accent transition-colors
                        ${task.completed ? 'text-gray-500' : 'text-white'}
                      `}
                    />
                    {/* Tactical Strike-Through Animation - Grey */}
                    <div className={`absolute top-1/2 left-0 h-[2px] bg-gray-500 transform -translate-y-1/2 pointer-events-none transition-all ${task.completed ? 'animate-task-strike opacity-80' : 'w-0 opacity-0'}`}></div>
                  </div>
                  
                  {/* Notes Toggle Button */}
                  <button
                    onClick={() => setExpandedTaskIndex(expandedTaskIndex === idx ? null : idx)}
                    className={`p-1 transition-colors ${expandedTaskIndex === idx || task.notes ? 'text-blue-400' : 'text-gray-600 hover:text-gray-300'}`}
                    title="Add Notes"
                  >
                     <AlignLeft size={16} />
                  </button>

                  <button 
                    onClick={() => handleTaskToggle(idx)}
                    className={`text-gray-500 hover:text-accent transition-colors ${task.completed ? 'text-accent' : ''}`}
                    disabled={!task.text}
                  >
                    {task.completed ? <CheckSquare /> : <Square />}
                  </button>
                </div>

                {/* Notes Area - Expandable */}
                <div className={`
                    ml-8 pl-1 transition-all duration-300 ease-in-out overflow-hidden
                    ${expandedTaskIndex === idx ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'}
                `}>
                    <textarea
                        value={task.notes || ''}
                        onChange={(e) => handleNotesChange(idx, e.target.value)}
                        placeholder="Additional tactical details..."
                        className="w-full bg-white/5 border-l-2 border-blue-500/30 text-xs text-gray-300 p-2 rounded-r focus:outline-none focus:bg-white/10 focus:border-blue-500 min-h-[80px] resize-none"
                    />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={saveTasks}
            className="w-full bg-accent text-obsidian font-bold py-3 rounded hover:bg-emerald-400 transition-colors mt-4 active:scale-95 duration-75"
          >
            Save Priorities
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
