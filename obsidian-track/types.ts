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

export interface AppState {
  habits: Habit[];
  habitLogs: HabitLog[];
  dayPlans: DayPlan[];
}

export interface BackupData {
  habits: Habit[];
  logs: HabitLog[];
  dayPlans: DayPlan[];
  exportDate: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  HABITS = 'HABITS',
  TASKS = 'TASKS'
}