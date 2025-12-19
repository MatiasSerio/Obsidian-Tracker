export interface Habit {
  id: string;
  name: string;
  objective: string; // e.g., "Read 30 mins"
  minObjective: string; // e.g., "Read 5 mins"
  createdAt: string;
}

export interface HabitLog {
  date: string; // YYYY-MM-DD
  habitId: string;
  completed: boolean; // 100% done
  partial: boolean; // Met min objective but not full
}

export interface MicroWin {
  id: string;
  text: string;
}

export interface MicroWinLog {
  date: string; // YYYY-MM-DD
  winId: string;
  completed: boolean;
}

export interface DailyTask {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  tasks: DailyTask[]; // Max 5
}

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  content: string;
}

export interface AppState {
  habits: Habit[];
  habitLogs: HabitLog[];
  microWins: MicroWin[];
  microWinLogs: MicroWinLog[];
  dayPlans: DayPlan[];
  journalEntries: JournalEntry[];
}

export interface BackupData {
  habits: Habit[];
  logs: HabitLog[];
  microWins?: MicroWin[];
  microWinLogs?: MicroWinLog[];
  dayPlans: DayPlan[];
  journalEntries: JournalEntry[];
  exportDate: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  HABITS = 'HABITS',
  TASKS = 'TASKS',
  JOURNAL = 'JOURNAL'
}