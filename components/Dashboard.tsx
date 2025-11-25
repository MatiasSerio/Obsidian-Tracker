import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Habit, HabitLog } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Line,
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { format, subDays, isSameDay, differenceInCalendarDays, subWeeks } from 'date-fns';
import { Brain, CheckCircle, AlertTriangle, Activity, Check, Minus, Grid, Zap, Target, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { analyzeProgress } from '../services/geminiService';

interface DashboardProps {
  habits: Habit[];
  logs: HabitLog[];
  apiKey: string;
  onToggleHabit: (habitId: string, date: string, type: 'FULL' | 'PARTIAL') => void;
}

// Helper for "Count Up" animation
const CountUp = ({ end, duration = 1000, suffix = '' }: { end: number, duration?: number, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const previousEnd = useRef(0);
  const hasMounted = useRef(false);

  useEffect(() => {
    let startTime: number | null = null;
    
    // Determine start value: 0 on first load, previous value on update
    const startValue = hasMounted.current ? previousEnd.current : 0;
    const change = end - startValue;
    
    // If no change, just set and return (unless it's first mount, then we still want 0->end anim)
    if (change === 0 && hasMounted.current) {
        setCount(end);
        return;
    }

    // Use shorter duration for small updates (like decrementing 1), full duration for big load
    const effectiveDuration = hasMounted.current ? 400 : duration;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = currentTime - startTime;
      const percentage = Math.min(progress / effectiveDuration, 1);
      
      // Easing function (easeOutExpo)
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(Math.round(startValue + (change * ease)));

      if (progress < effectiveDuration) {
        requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure we land exactly on the end number
        previousEnd.current = end;
      }
    };

    requestAnimationFrame(animate);
    hasMounted.current = true;
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
};

const Dashboard: React.FC<DashboardProps> = ({ habits, logs, apiKey, onToggleHabit }) => {
  const [heatmapSelectedHabitId, setHeatmapSelectedHabitId] = useState<string>(''); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [flashHabit, setFlashHabit] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Set default heatmap selection when habits load
  useEffect(() => {
    if (habits.length > 0 && !heatmapSelectedHabitId) {
        setHeatmapSelectedHabitId(habits[0].id);
    }
  }, [habits, heatmapSelectedHabitId]);

  const todayStr = format(currentTime, 'yyyy-MM-dd');

  // --- Statistics Logic ---

  // 1. Data for Chart (Last 30 Days + Weekly Comparison) - ALWAYS ALL HABITS
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(currentTime, i);
      const prevWeekD = subWeeks(d, 1);
      
      const dStr = format(d, 'yyyy-MM-dd');
      const prevWeekDStr = format(prevWeekD, 'yyyy-MM-dd');
      
      let fullCount = 0;
      let partialCount = 0;
      let prevWeekCount = 0;

      // Aggregate data for ALL habits
      const dayLogs = logs.filter(l => l.date === dStr);
      fullCount = dayLogs.filter(l => l.completed).length;
      partialCount = dayLogs.filter(l => l.partial).length;

      // Previous week comparison data
      const prevLogs = logs.filter(l => l.date === prevWeekDStr);
      prevWeekCount = prevLogs.filter(l => l.completed || l.partial).length;

      // Calculate Momentum Score (Weighted %)
      const totalHabits = habits.length || 1; // Avoid divide by zero
      const score = Math.round(((fullCount * 1) + (partialCount * 0.5)) / totalHabits * 100);

      data.push({
        date: format(d, 'MMM dd'),
        Full: fullCount,
        Partial: partialCount,
        LastWeek: prevWeekCount,
        Momentum: score,
        rawDate: dStr
      });
    }
    return data;
  }, [habits, logs, currentTime]);

  // 2. Heatmap Data (Last 90 Days) - Single Habit Specific
  const heatmapData = useMemo(() => {
    const days = [];
    if (!heatmapSelectedHabitId) return [];

    for (let i = 89; i >= 0; i--) {
      const d = subDays(currentTime, i);
      const dStr = format(d, 'yyyy-MM-dd');
      
      const log = logs.find(l => l.date === dStr && l.habitId === heatmapSelectedHabitId);
      let score = 0; 
      
      if (log) {
        if (log.completed) score = 3; // Full Green
        else if (log.partial) score = 1; // Yellow/Partial
      }

      days.push({ date: dStr, score, displayDate: format(d, 'MMM do') });
    }
    return days;
  }, [logs, heatmapSelectedHabitId, currentTime]);

  // 3. Radar Chart Data (Balance) - REVERTED TO STANDARD 30 DAY WINDOW
  const radarData = useMemo(() => {
    return habits.map(h => {
        // Calculate completion rate over last 30 days
        let score = 0;
        
        for(let i=0; i<30; i++) {
            const d = subDays(currentTime, i);
            const dStr = format(d, 'yyyy-MM-dd');
            
            const log = logs.find(l => l.habitId === h.id && l.date === dStr);
            if(log?.completed) score += 100;
            else if(log?.partial) score += 50;
        }
        
        // Standard calculation: score / 3000 (30 days * 100)
        // This means new habits start small and grow, showing "consistency" over time.
        return {
            subject: h.name,
            A: Math.round((score / 3000) * 100),
            fullMark: 100
        }
    })
  }, [habits, logs, currentTime]);

  // 4. Donut Chart Data (Distribution - Last 30 Days)
  const donutData = useMemo(() => {
    let full = 0;
    let partial = 0;
    let missed = 0;

    // Iterate last 30 days
    for (let i = 0; i < 30; i++) {
         const d = subDays(currentTime, i);
         const dStr = format(d, 'yyyy-MM-dd');
         
         habits.forEach(habit => {
            // Check if habit existed on this date
            const createdDate = habit.createdAt ? habit.createdAt.split('T')[0] : '2023-01-01';
            
            if (dStr >= createdDate) {
                const log = logs.find(l => l.habitId === habit.id && l.date === dStr);
                if (log?.completed) full++;
                else if (log?.partial) partial++;
                else missed++;
            }
         });
    }
    
    // Filter out zero values to avoid ugly chart rendering
    return [
        { name: 'Fully Done', value: full, color: '#10B981' }, 
        { name: 'Done Enough', value: partial, color: '#F59E0B' },
        { name: 'Missed', value: missed, color: '#374151' },
    ].filter(item => item.value > 0);
  }, [habits, logs, currentTime]);


  // 5. Today's Progress
  const todayLogs = logs.filter(l => l.date === todayStr);
  
  const notDoneYetCount = habits.filter(h => {
    const log = todayLogs.find(l => l.habitId === h.id);
    return !log; 
  }).length;

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await analyzeProgress(apiKey, habits, logs);
    setAiInsight(result || "No insight available.");
    setLoadingAi(false);
  };

  const getHeatmapColor = (score: number) => {
    if (score === 3) return 'bg-accent shadow-[0_0_8px_rgba(16,185,129,0.6)]'; 
    if (score === 2) return 'bg-accent/60'; 
    if (score === 1) return 'bg-yellow-500/50'; 
    return 'bg-white/5'; 
  };

  const handleTacticalClick = (id: string, type: string, action: () => void) => {
    setFlashHabit(`${id}-${type}`);
    setTimeout(() => setFlashHabit(null), 300);
    action();
  }

  return (
    <div className="flex flex-col space-y-6 pb-20">
      
      {/* Blackboard Header */}
      <div className="bg-[#1a1a1a] border-b-4 border-charcoal p-6 rounded-sm shadow-2xl relative overflow-hidden group animate-fade-in-up">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-chalkboard.png')]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end">
          <div>
            <h2 className="text-sm font-montserrat font-semibold text-gray-400 mb-1 uppercase tracking-wide">{format(currentTime, 'EEEE, MMMM do, yyyy')}</h2>
            <h1 className="text-6xl font-montserrat font-extrabold text-white tracking-tighter">{format(currentTime, 'HH:mm')}</h1>
            <p className="text-accent mt-2 font-handwriting text-lg italic">
              "Focus on the process, not the outcome."
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
               <Activity size={16} />
               <span>Today's Completion: <span className="font-mono text-accent font-bold"><CountUp end={habits.length > 0 ? Math.round((todayLogs.length / habits.length) * 100) : 0} suffix="%" /></span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Habits Section - Now Full Width */}
        <div className="w-full space-y-6">
             {/* Today's Habits */}
            <div className="bg-charcoal p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <CheckCircle className="mr-2 text-accent" /> Today's Focus
                    </h3>
                </div>
                
                <div className="space-y-3">
                    {habits.length === 0 && <p className="text-gray-500 italic">No habits configured yet.</p>}
                    {habits.map((habit, index) => {
                    const log = todayLogs.find(l => l.habitId === habit.id);
                    const isDone = log?.completed;
                    const isPartial = log?.partial;
                    const delay = `${150 + (index * 75)}ms`;
                    const flashKeyFull = `${habit.id}-FULL`;
                    const flashKeyPartial = `${habit.id}-PARTIAL`;

                    return (
                        <div 
                        key={habit.id} 
                        className="flex flex-col md:flex-row md:items-center justify-between bg-obsidian p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors opacity-0 animate-slide-in"
                        style={{ animationDelay: delay }}
                        >
                        <div className="mb-3 md:mb-0">
                            <div className="font-bold text-white text-lg">{habit.name}</div>
                            <div className="flex space-x-4 text-xs mt-1">
                            <span className="text-gray-400">Goal: <span className="text-gray-200">{habit.objective}</span></span>
                            {habit.minObjective && (
                                <span className="text-gray-500">Min: <span className="text-gray-400">{habit.minObjective}</span></span>
                            )}
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                            onClick={() => handleTacticalClick(habit.id, 'PARTIAL', () => onToggleHabit(habit.id, todayStr, 'PARTIAL'))}
                            className={`flex-1 md:flex-none px-4 py-2 rounded font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all border transform active:scale-95 duration-75 relative overflow-hidden ${
                                isPartial
                                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' 
                                : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200'
                            } ${flashHabit === flashKeyPartial ? 'animate-flash' : ''}`}
                            >
                            <Minus size={14} />
                            <span>Done Enough</span>
                            </button>
                            <button 
                            onClick={() => handleTacticalClick(habit.id, 'FULL', () => onToggleHabit(habit.id, todayStr, 'FULL'))}
                            className={`flex-1 md:flex-none px-4 py-2 rounded font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all border transform active:scale-95 duration-75 relative overflow-hidden ${
                                isDone
                                ? 'bg-accent/20 text-accent border-accent shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200'
                            } ${flashHabit === flashKeyFull ? 'animate-flash' : ''}`}
                            >
                            <Check size={14} />
                            <span>Fully Done</span>
                            </button>
                        </div>
                        </div>
                    );
                    })}
                </div>

                {/* Not Done Yet Counter */}
                <div className="mt-6 border-t border-white/5 pt-6 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                    <div className="flex items-center justify-between bg-[#111] p-4 rounded border border-red-900/30">
                        <div className="flex items-center">
                        <AlertTriangle className={`mr-3 w-6 h-6 ${notDoneYetCount > 0 ? 'text-red-500 animate-pulse-slow' : 'text-gray-600'}`} />
                        <span className={`text-lg font-alert tracking-wider uppercase ${notDoneYetCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            Not Done Yet
                        </span>
                        </div>
                        <span className={`text-3xl font-alert font-bold ${notDoneYetCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                           <CountUp end={notDoneYetCount} duration={800} />
                        </span>
                    </div>
                    {notDoneYetCount === 0 && habits.length > 0 && (
                        <p className="text-right text-accent text-xs mt-2 font-mono uppercase tracking-widest animate-pulse">Good Work.</p>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* FULL WIDTH ANALYTICS SECTION (Bottom) */}
      <div className="bg-charcoal p-6 rounded-xl border border-white/5 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          
          <h3 className="text-xl font-bold flex items-center mb-6">
              <Activity className="mr-2 text-blue-400" /> Performance Analytics
          </h3>

          {/* 1. Main Bar Chart (Performance) */}
          <div className="mb-10 h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                  <XAxis dataKey="date" stroke="#555" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" tick={{fontSize: 10}} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                      contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', color: '#fff' }}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Partial" stackId="a" fill="#F59E0B" name="Done Enough" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Full" stackId="a" fill="#10B981" name="Fully Done" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="LastWeek" stroke="#4B5563" strokeDasharray="3 3" dot={false} strokeWidth={2} name="Last Week" />
                  </BarChart>
              </ResponsiveContainer>
          </div>

          <div className="w-full h-px bg-white/5 my-8"></div>

          {/* 2. Consistency Map (Heatmap) */}
          <div className="pt-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-3 md:space-y-0">
                  <h4 className="text-sm font-bold text-gray-400 flex items-center">
                      <Grid className="w-4 h-4 mr-2" /> Consistency Map
                  </h4>
                  
                  {/* Heatmap Habit Selector */}
                   <div className="flex space-x-2 overflow-x-auto max-w-full no-scrollbar">
                      {habits.map(h => (
                      <button
                          key={h.id}
                          onClick={() => setHeatmapSelectedHabitId(h.id)}
                          className={`px-3 py-1.5 rounded-sm text-[11px] uppercase font-bold tracking-wider whitespace-nowrap transition-colors border ${
                          heatmapSelectedHabitId === h.id ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-600'
                          }`}
                      >
                          {h.name}
                      </button>
                      ))}
                  </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                  {heatmapData.length > 0 ? heatmapData.map((day) => (
                      <div 
                      key={day.date}
                      title={`${day.displayDate}: ${day.score === 3 ? 'Fully Done' : day.score === 1 ? 'Done Enough' : 'Missed'}`}
                      className={`w-3 h-3 md:w-5 md:h-5 rounded-sm transition-all duration-300 hover:scale-125 ${getHeatmapColor(day.score)}`}
                      />
                  )) : (
                       <p className="text-xs text-gray-600">Add habits to view heatmap.</p>
                  )}
              </div>
              <div className="flex justify-end items-center space-x-4 mt-4 text-[10px] text-gray-500 uppercase tracking-widest">
                  <div className="flex items-center"><div className="w-2 h-2 bg-white/5 mr-1 rounded-sm"></div> Missed</div>
                  <div className="flex items-center"><div className="w-2 h-2 bg-yellow-500/50 mr-1 rounded-sm"></div> Enough</div>
                  <div className="flex items-center"><div className="w-2 h-2 bg-accent mr-1 rounded-sm"></div> Full</div>
              </div>
          </div>

          <div className="w-full h-px bg-white/5 my-8"></div>

          {/* 3. Momentum (Area Chart) */}
          <div className="mb-10">
             <h4 className="text-sm font-bold text-gray-400 mb-6 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" /> Momentum (30 Day Trend)
             </h4>
             <div className="h-[250px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMomentum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                      contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', color: '#fff' }}
                      formatter={(value: number) => [`${value}%`, 'Score']}
                  />
                  <Area type="monotone" dataKey="Momentum" stroke="#10B981" fillOpacity={1} fill="url(#colorMomentum)" />
                </AreaChart>
              </ResponsiveContainer>
             </div>
          </div>

          <div className="w-full h-px bg-white/5 my-8"></div>

          {/* 4. Habit Balance & Distribution (Side by Side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              
              {/* Radar Chart (Balance) */}
             <div>
                <h3 className="font-bold text-gray-400 text-sm flex items-center mb-4"><Target className="mr-2 text-purple-400" size={16}/> Habit Balance (30d)</h3>
                <div className="h-[250px] w-full bg-black/20 rounded-lg border border-white/5 min-w-0">
                    {habits.length >= 3 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Consistency"
                                    dataKey="A"
                                    stroke="#8B5CF6"
                                    strokeWidth={2}
                                    fill="#8B5CF6"
                                    fillOpacity={0.3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-gray-500 text-center">
                            Add at least 3 habits<br/>to activate Radar.
                        </div>
                    )}
                </div>
             </div>

             {/* Donut Chart (Distribution) */}
             <div>
                <h3 className="font-bold text-gray-400 text-sm flex items-center mb-4"><PieChartIcon className="mr-2 text-amber-400" size={16}/> Distribution (30d)</h3>
                <div className="h-[250px] w-full flex items-center justify-center bg-black/20 rounded-lg border border-white/5 min-w-0">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                         >
                            {donutData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                            ))}
                         </Pie>
                         <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', color: '#fff' }} />
                         <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>

          <div className="w-full h-px bg-white/5 my-8"></div>

          {/* 5. AI Coach (Bottom) */}
          <div className="bg-black/20 p-6 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-300 flex items-center">
                    <Brain className="w-4 h-4 mr-2" /> AI Coach
                    </h4>
                    <button 
                    onClick={handleAiAnalysis}
                    disabled={loadingAi}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                    >
                    {loadingAi ? 'Thinking...' : 'Analyze'}
                    </button>
                </div>
                {aiInsight ? (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30 text-sm text-purple-100 animate-fade-in-up">
                    {aiInsight}
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 italic">Generate an insight based on your recent performance.</p>
                )}
            </div>

      </div>
    </div>
  );
};

export default Dashboard;