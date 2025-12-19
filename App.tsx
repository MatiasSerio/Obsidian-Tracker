import React, { useState, useEffect } from 'react';
import { ViewState, Habit, HabitLog, DayPlan, DailyTask, BackupData, JournalEntry, MicroWin, MicroWinLog } from './types';
import Dashboard from './components/Dashboard';
import HabitManager from './components/HabitManager';
import TaskManager from './components/TaskManager';
import Journal from './components/Journal';
import { LayoutDashboard, Settings, Calendar, Trophy } from 'lucide-react';
import { subDays, format } from 'date-fns';

// Default habits - Created 7 days ago so past logs count in calculation
const DEFAULT_HABITS: Habit[] = [
  { id: '1', name: 'Morning Run', objective: '5km', minObjective: '1km', createdAt: subDays(new Date(), 7).toISOString() },
  { id: '2', name: 'Deep Work', objective: '4 Hours', minObjective: '1 Hour', createdAt: subDays(new Date(), 7).toISOString() },
  { id: '3', name: 'Reading', objective: '30 Pages', minObjective: '5 Pages', createdAt: subDays(new Date(), 7).toISOString() },
];

const DEFAULT_MICRO_WINS: MicroWin[] = [
  { id: 'm1', text: 'Woke up at 9am' },
  { id: 'm2', text: 'Made my bed at 9:30' },
  { id: 'm3', text: 'Opened Spreadsheet' },
];

// Preview Data Generator
const generatePreviewLogs = (): HabitLog[] => {
  const logs: HabitLog[] = [];
  const today = new Date();
  
  // Morning Run: 5 days fully done (Today + 4 past days)
  for (let i = 0; i < 5; i++) {
    logs.push({
      date: format(subDays(today, i), 'yyyy-MM-dd'),
      habitId: '1',
      completed: true,
      partial: false
    });
  }

  // Deep Work: 1 day done enough (today), 2 days fully done (yesterday, day before)
  logs.push({ date: format(today, 'yyyy-MM-dd'), habitId: '2', completed: false, partial: true });
  logs.push({ date: format(subDays(today, 1), 'yyyy-MM-dd'), habitId: '2', completed: true, partial: false });
  logs.push({ date: format(subDays(today, 2), 'yyyy-MM-dd'), habitId: '2', completed: true, partial: false });

  return logs;
};

const DEFAULT_LOGS = generatePreviewLogs();

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // --- State Management ---
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [microWins, setMicroWins] = useState<MicroWin[]>([]);
  const [microWinLogs, setMicroWinLogs] = useState<MicroWinLog[]>([]);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const storedHabits = localStorage.getItem('obsidian_habits');
    const storedLogs = localStorage.getItem('obsidian_logs');
    const storedMicroWins = localStorage.getItem('obsidian_microwins');
    const storedMicroWinLogs = localStorage.getItem('obsidian_microwin_logs');
    const storedPlans = localStorage.getItem('obsidian_plans');
    const storedJournal = localStorage.getItem('obsidian_journal');

    if (storedHabits) setHabits(JSON.parse(storedHabits));
    else setHabits(DEFAULT_HABITS);

    if (storedLogs) setLogs(JSON.parse(storedLogs));
    else setLogs(DEFAULT_LOGS);

    if (storedMicroWins) setMicroWins(JSON.parse(storedMicroWins));
    else setMicroWins(DEFAULT_MICRO_WINS);

    if (storedMicroWinLogs) setMicroWinLogs(JSON.parse(storedMicroWinLogs));
    
    if (storedPlans) setDayPlans(JSON.parse(storedPlans));
    if (storedJournal) setJournalEntries(JSON.parse(storedJournal));
    
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('obsidian_habits', JSON.stringify(habits));
      localStorage.setItem('obsidian_logs', JSON.stringify(logs));
      localStorage.setItem('obsidian_microwins', JSON.stringify(microWins));
      localStorage.setItem('obsidian_microwin_logs', JSON.stringify(microWinLogs));
      localStorage.setItem('obsidian_plans', JSON.stringify(dayPlans));
      localStorage.setItem('obsidian_journal', JSON.stringify(journalEntries));
    }
  }, [habits, logs, microWins, microWinLogs, dayPlans, journalEntries, isLoaded]);

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
    setLogs(logs.filter(l => l.habitId !== id)); 
  };

  const reorderHabits = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= habits.length) return;
    const newHabits = [...habits];
    const [movedItem] = newHabits.splice(fromIndex, 1);
    newHabits.splice(toIndex, 0, movedItem);
    setHabits(newHabits);
  };

  const toggleHabit = (habitId: string, date: string, type: 'FULL' | 'PARTIAL' | 'TOGGLE') => {
    setLogs(prevLogs => {
      const existing = prevLogs.find(l => l.habitId === habitId && l.date === date);
      if (type === 'FULL') {
        if (existing?.completed) {
            return prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
        }
        const clean = prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
        return [...clean, { date, habitId, completed: true, partial: false }];
      }
      if (type === 'PARTIAL') {
         if (existing?.partial) {
             return prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
         }
         const clean = prevLogs.filter(l => !(l.habitId === habitId && l.date === date));
         return [...clean, { date, habitId, completed: false, partial: true }];
      }
      return prevLogs;
    });
  };

  // --- Micro Win Handlers ---
  const addMicroWin = (text: string) => {
    const newWin: MicroWin = { id: crypto.randomUUID(), text };
    setMicroWins([...microWins, newWin]);
  };

  const deleteMicroWin = (id: string) => {
    setMicroWins(microWins.filter(w => w.id !== id));
    setMicroWinLogs(microWinLogs.filter(l => l.winId !== id));
  };

  const reorderMicroWins = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= microWins.length) return;
    const newWins = [...microWins];
    const [moved] = newWins.splice(fromIndex, 1);
    newWins.splice(toIndex, 0, moved);
    setMicroWins(newWins);
  };

  const toggleMicroWin = (winId: string, date: string) => {
    setMicroWinLogs(prev => {
        const existing = prev.find(l => l.winId === winId && l.date === date);
        if (existing) {
            return prev.filter(l => !(l.winId === winId && l.date === date));
        }
        return [...prev, { date, winId, completed: true }];
    });
  };

  const saveDayPlan = (date: string, tasks: DailyTask[]) => {
    setDayPlans(prev => {
      const filtered = prev.filter(p => p.date !== date);
      return [...filtered, { date, tasks }];
    });
  };

  const saveJournalEntry = (date: string, content: string) => {
    setJournalEntries(prev => {
      const filtered = prev.filter(e => e.date !== date);
      if (content.trim() === '') return filtered;
      return [...filtered, { date, content }];
    });
  };

  // --- Backup Handlers ---
  const handleExportData = () => {
    const data: BackupData = {
      habits,
      logs,
      microWins,
      microWinLogs,
      dayPlans,
      journalEntries,
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
      if (data.microWins) setMicroWins(data.microWins);
      if (data.microWinLogs) setMicroWinLogs(data.microWinLogs);
      if (data.dayPlans) setDayPlans(data.dayPlans);
      if (data.journalEntries) setJournalEntries(data.journalEntries);
      alert("Data restored successfully!");
    }
  };

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
            <NavButton view={ViewState.JOURNAL} icon={Trophy} label="Wins" />
        </nav>
        
        {/* Placeholder for layout balance */}
        <div className="w-8"></div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="min-h-full p-4 md:p-8 max-w-7xl mx-auto w-full">
          {currentView === ViewState.DASHBOARD && (
            <Dashboard 
              habits={habits} 
              logs={logs} 
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
          {currentView === ViewState.JOURNAL && (
            <Journal 
               entries={journalEntries}
               onSaveEntry={saveJournalEntry}
               microWins={microWins}
               microWinLogs={microWinLogs}
               onToggleMicroWin={toggleMicroWin}
               onAddMicroWin={addMicroWin}
               onDeleteMicroWin={deleteMicroWin}
               onReorderMicroWins={reorderMicroWins}
            />
          )}
        </div>
      </main>

      {/* Version Tag */}
      <div className="fixed bottom-4 left-4 text-[10px] text-gray-700 font-mono select-none pointer-events-none">v1.5</div>
    </div>
  );
};

export default App;