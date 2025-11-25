import React, { useState, useEffect } from 'react';
import { ViewState, Habit, HabitLog, DayPlan, DailyTask, BackupData } from './types';
import Dashboard from './components/Dashboard';
import HabitManager from './components/HabitManager';
import TaskManager from './components/TaskManager';
import { LayoutDashboard, ListTodo, Calendar, Settings, Download } from 'lucide-react';

// Default habits to load if local storage is empty
const DEFAULT_HABITS: Habit[] = [
  { id: '1', name: 'Morning Run', objective: '5km', minObjective: '1km', createdAt: new Date().toISOString() },
  { id: '2', name: 'Deep Work', objective: '4 Hours', minObjective: '1 Hour', createdAt: new Date().toISOString() },
  { id: '3', name: 'Reading', objective: '30 Pages', minObjective: '5 Pages', createdAt: new Date().toISOString() },
  { id: '4', name: 'Hydration', objective: '3 Liters', minObjective: '1 Liter', createdAt: new Date().toISOString() },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // --- State Management (In real app, move to Context) ---
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const storedHabits = localStorage.getItem('obsidian_habits');
    const storedLogs = localStorage.getItem('obsidian_logs');
    const storedPlans = localStorage.getItem('obsidian_plans');
    const storedKey = localStorage.getItem('obsidian_api_key');

    if (storedHabits) {
      setHabits(JSON.parse(storedHabits));
    } else {
      // Load defaults if empty
      setHabits(DEFAULT_HABITS);
    }

    if (storedLogs) setLogs(JSON.parse(storedLogs));
    if (storedPlans) setDayPlans(JSON.parse(storedPlans));
    if (storedKey) setApiKey(storedKey);
    
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('obsidian_habits', JSON.stringify(habits));
      localStorage.setItem('obsidian_logs', JSON.stringify(logs));
      localStorage.setItem('obsidian_plans', JSON.stringify(dayPlans));
      localStorage.setItem('obsidian_api_key', apiKey);
    }
  }, [habits, logs, dayPlans, apiKey, isLoaded]);

  // --- Handlers ---

  const addHabit = (habitData: Omit<Habit, 'id' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setHabits([...habits, newHabit]);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(habits.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    setLogs(logs.filter(l => l.habitId !== id)); // Cleanup logs
  };

  const reorderHabits = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= habits.length) return;
    const newHabits = [...habits];
    // Remove from old position
    const [movedItem] = newHabits.splice(fromIndex, 1);
    // Insert at new position
    newHabits.splice(toIndex, 0, movedItem);
    setHabits(newHabits);
  };

  // Modified to handle specific states: 'FULL', 'PARTIAL', 'NONE'
  const toggleHabit = (habitId: string, date: string, type: 'FULL' | 'PARTIAL' | 'TOGGLE') => {
    setLogs(prevLogs => {
      const existing = prevLogs.find(l => l.habitId === habitId && l.date === date);
      
      if (type === 'FULL') {
        // Toggle Full: If already full, remove it. If not, set to full.
        if (existing?.completed) {
            return prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
        }
        // Remove existing entry first if it exists (e.g. partial) then add full
        const clean = prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
        return [...clean, { date, habitId, completed: true, partial: false }];
      }
      
      if (type === 'PARTIAL') {
         // Toggle Partial: If already partial, remove it. If not, set to partial.
         if (existing?.partial) {
             return prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
         }
         const clean = prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
         return [...clean, { date, habitId, completed: false, partial: true }];
      }

      return prevLogs;
    });
  };

  const saveDayPlan = (date: string, tasks: DailyTask[]) => {
    setDayPlans(prev => {
      const filtered = prev.filter(p => p.date !== date);
      return [...filtered, { date, tasks }];
    });
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
  };

  // --- Backup Handlers ---
  const handleExportData = () => {
    const data: BackupData = {
      habits,
      logs,
      dayPlans,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obsidian_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (data: BackupData) => {
    if (confirm("Importing data will overwrite your current session. Continue?")) {
      if (data.habits) setHabits(data.habits);
      if (data.logs) setLogs(data.logs);
      if (data.dayPlans) setDayPlans(data.dayPlans);
      alert("Data restored successfully!");
    }
  };

  // --- Navigation Components ---

  const NavButton = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-bold ${
        currentView === view 
          ? 'bg-accent text-obsidian shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  if (!isLoaded) return <div className="flex items-center justify-center h-screen text-accent">Initializing Obsidian...</div>;

  return (
    <div className="flex flex-col h-screen bg-obsidian text-chalk">
      
      {/* Top Navigation Bar */}
      <header className="bg-charcoal border-b border-white/5 flex items-center justify-between px-6 py-4 shrink-0 z-50 shadow-md">
        <div className="flex items-center space-x-3 text-accent">
            <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center text-obsidian font-bold text-xl shadow-[0_0_10px_rgba(16,185,129,0.4)]">O</div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">Obsidian</span>
        </div>
        
        <nav className="flex space-x-2">
            <NavButton view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavButton view={ViewState.HABITS} icon={Settings} label="Habits" />
            <NavButton view={ViewState.TASKS} icon={Calendar} label="Daily Plan" />
        </nav>
        
         <button 
            onClick={handleExportData}
            className="text-gray-400 hover:text-accent p-2 transition-colors border border-transparent hover:border-white/10 rounded"
            title="Download Backup"
         >
            <Download size={20} />
         </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="min-h-full p-4 md:p-8 max-w-7xl mx-auto w-full">
          {currentView === ViewState.DASHBOARD && (
            <Dashboard 
              habits={habits} 
              logs={logs} 
              apiKey={apiKey}
              onToggleHabit={toggleHabit} 
            />
          )}
          {currentView === ViewState.HABITS && (
            <HabitManager 
              habits={habits} 
              onAdd={addHabit} 
              onUpdate={updateHabit}
              onDelete={deleteHabit}
              onReorder={reorderHabits}
              onExport={handleExportData}
              onImport={handleImportData}
            />
          )}
          {currentView === ViewState.TASKS && (
            <TaskManager 
              dayPlans={dayPlans} 
              onSavePlan={saveDayPlan} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;