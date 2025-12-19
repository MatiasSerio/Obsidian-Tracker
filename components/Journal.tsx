import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { PenTool, History as HistoryIcon, Plus, Check, Trash2, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { JournalEntry, MicroWin, MicroWinLog } from '../types';

interface JournalProps {
  entries: JournalEntry[];
  onSaveEntry: (date: string, content: string) => void;
  microWins: MicroWin[];
  microWinLogs: MicroWinLog[];
  onToggleMicroWin: (winId: string, date: string) => void;
  onAddMicroWin: (text: string) => void;
  onDeleteMicroWin: (id: string) => void;
  onReorderMicroWins: (fromIndex: number, toIndex: number) => void;
}

const Journal: React.FC<JournalProps> = ({ 
    entries, 
    onSaveEntry, 
    microWins, 
    microWinLogs, 
    onToggleMicroWin, 
    onAddMicroWin, 
    onDeleteMicroWin, 
    onReorderMicroWins 
}) => {
  const [activeTab, setActiveTab] = useState<'WRITE' | 'HISTORY'>('WRITE');
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), 'd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'M'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
  const [content, setContent] = useState('');
  const [isMicroWinConfigOpen, setIsMicroWinConfigOpen] = useState(false);
  const [newMicroWinText, setNewMicroWinText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`;

  // Generate Date Arrays
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    const entry = entries.find(e => e.date === currentKey);
    setContent(entry ? entry.content : '');
  }, [currentKey, entries]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onSaveEntry(currentKey, e.target.value);
  };

  /**
   * Synthesizes a clean, high-pitched double notification chime.
   */
  const playWinSound = () => {
    try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;
        
        const playTone = (freq: number, time: number, vol: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(vol, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + dur);
        };

        // Elegant double chime (A5 to D6) - professional and satisfying
        playTone(880.00, now, 0.1, 0.4); 
        playTone(1174.66, now + 0.07, 0.08, 0.3);
    } catch (e) { 
      console.debug("Audio context blocked or failed", e); 
    }
  };

  const handleToggleWin = (id: string) => {
    const isNowDone = !microWinLogs.find(l => l.winId === id && l.date === todayStr)?.completed;
    if (isNowDone) playWinSound();
    onToggleMicroWin(id, todayStr);
  };

  const handleAddMicroWin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMicroWinText.trim()) {
        onAddMicroWin(newMicroWinText.trim());
        setNewMicroWinText('');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto pb-20 space-y-12">
      
      {/* 1. Micro Wins Section */}
      <section className="animate-fade-in-up">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-3xl font-bold flex items-center text-white">
                    Micro Wins
                </h2>
            </div>
            <button 
                onClick={() => setIsMicroWinConfigOpen(!isMicroWinConfigOpen)}
                className={`p-2 rounded-lg transition-all ${isMicroWinConfigOpen ? 'bg-accent text-obsidian' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                title="Configure Micro Wins"
            >
                <Settings2 size={20} />
            </button>
        </div>

        <div className="bg-charcoal p-6 rounded-xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <p className="text-gray-400 italic text-sm mb-8 leading-relaxed border-l-2 border-accent/30 pl-4">
                "Think of your life like a smartphone battery. Every win, no matter how small, is a charging session. 
                Ignore them, and you walk with 20% battery all day. Celebrate them? You're at 100%."
            </p>

            {isMicroWinConfigOpen && (
                <div className="mb-8 p-4 bg-obsidian rounded-lg border border-white/10 animate-fade-in-up">
                    <h4 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">Manage Wins</h4>
                    <form onSubmit={handleAddMicroWin} className="flex space-x-2 mb-4">
                        <input 
                            type="text" 
                            value={newMicroWinText}
                            onChange={(e) => setNewMicroWinText(e.target.value)}
                            placeholder="Add a reusable micro-win..."
                            className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-accent outline-none"
                        />
                        <button type="submit" className="bg-accent text-obsidian px-4 py-2 rounded font-bold hover:bg-emerald-400 transition-colors">
                            <Plus size={18} />
                        </button>
                    </form>
                    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                        {microWins.map((win, idx) => (
                            <div key={win.id} className="flex items-center justify-between bg-white/5 p-2 rounded text-sm group">
                                <span className="text-gray-300">{win.text}</span>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onReorderMicroWins(idx, idx - 1)} className="p-1 text-gray-500 hover:text-white"><ArrowUp size={14}/></button>
                                    <button onClick={() => onReorderMicroWins(idx, idx + 1)} className="p-1 text-gray-500 hover:text-white"><ArrowDown size={14}/></button>
                                    <button onClick={() => onDeleteMicroWin(win.id)} className="p-1 text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Checklist Layout: Text Left, Square Checkbox Right */}
            <div className="flex flex-col space-y-1">
                {microWins.length === 0 && !isMicroWinConfigOpen && (
                    <p className="text-gray-600 text-center py-4">No micro-wins defined. Click the gear icon to add some!</p>
                )}
                {microWins.map((win, idx) => {
                    const isDone = microWinLogs.find(l => l.winId === win.id && l.date === todayStr)?.completed;
                    const delay = `${idx * 40}ms`;
                    return (
                        <button 
                            key={win.id}
                            onClick={() => handleToggleWin(win.id)}
                            className={`flex items-center w-full p-4 rounded transition-all group border-b border-white/5 last:border-0 ${
                                isDone ? 'text-gray-500' : 'text-gray-200 hover:bg-white/5'
                            }`}
                            style={{ animationDelay: delay }}
                        >
                            <span className={`text-base font-semibold tracking-wide flex-1 text-left transition-all ${isDone ? 'line-through opacity-50' : ''}`}>
                                {win.text}
                            </span>
                            
                            <div className={`ml-4 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                isDone 
                                ? 'bg-accent border-accent text-obsidian' 
                                : 'border-gray-600 group-hover:border-gray-400'
                            }`}>
                                {isDone ? <Check size={18} strokeWidth={3} /> : null}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
      </section>

      {/* 2. Journal of Wins Section */}
      <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="mb-8 flex justify-between items-end">
          <div>
              <h2 className="text-3xl font-bold flex items-center">
                  <PenTool className="mr-3 text-blue-400" /> Journal of Wins
              </h2>
              <p className="text-gray-400 mt-1">Actions and results you're proud of.</p>
          </div>
          <div className="flex bg-charcoal rounded-lg p-1 border border-white/5">
              <button 
                  onClick={() => setActiveTab('WRITE')} 
                  className={`px-4 py-2 rounded text-sm font-bold flex items-center transition-all ${activeTab === 'WRITE' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                  <Plus size={14} className="mr-2"/> New Entry
              </button>
              <button 
                  onClick={() => setActiveTab('HISTORY')} 
                  className={`px-4 py-2 rounded text-sm font-bold flex items-center transition-all ${activeTab === 'HISTORY' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                  <HistoryIcon size={14} className="mr-2"/> History
              </button>
          </div>
        </div>

        {activeTab === 'WRITE' && (
            <div className="animate-fade-in-up">
              {/* The "Sheet" Header - Date Selectors */}
              <div className="bg-[#1a1a1a] text-gray-300 p-8 rounded-t-sm shadow-xl relative z-10 border-b border-gray-700">
                  <div className="flex items-end space-x-2 font-montserrat text-2xl font-bold">
                      <div className="flex flex-col">
                          <select 
                              value={selectedDay} 
                              onChange={(e) => setSelectedDay(e.target.value)}
                              className="bg-transparent border-b-2 border-gray-600 focus:outline-none appearance-none cursor-pointer text-center w-16 hover:border-accent transition-colors"
                          >
                              {days.map(d => <option key={d} value={d} className="bg-charcoal">{d}</option>)}
                          </select>
                      </div>
                      <span>/</span>
                      <div className="flex flex-col">
                          <select 
                              value={selectedMonth} 
                              onChange={(e) => setSelectedMonth(e.target.value)}
                              className="bg-transparent border-b-2 border-gray-600 focus:outline-none appearance-none cursor-pointer text-center hover:border-accent transition-colors"
                              style={{ width: `${(months[parseInt(selectedMonth)-1] || "").length + 2}ch` }}
                          >
                              {months.map((m, i) => <option key={m} value={i + 1} className="bg-charcoal">{m}</option>)}
                          </select>
                      </div>
                      <span>/</span>
                      <div className="flex flex-col">
                           <select 
                              value={selectedYear} 
                              onChange={(e) => setSelectedYear(e.target.value)}
                              className="bg-transparent border-b-2 border-gray-600 focus:outline-none appearance-none cursor-pointer text-center w-24 hover:border-accent transition-colors"
                          >
                              {years.map(y => <option key={y} value={y} className="bg-charcoal">{y}</option>)}
                          </select>
                      </div>
                  </div>
              </div>

              {/* The "Sheet" Body - Dark Lined Paper */}
              <div className="flex-1 bg-[#121212] shadow-2xl relative min-h-[500px] border-l border-r border-white/5">
                  <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={handleChange}
                      className="w-full bg-transparent text-gray-300 text-xl leading-[2.5rem] border-none focus:ring-0 resize-none font-journal focus:outline-none min-h-[500px] px-8 py-2"
                      style={{
                          backgroundImage: 'linear-gradient(transparent 95%, #2a2a2a 95%)',
                          backgroundSize: '100% 2.5rem',
                          lineHeight: '2.5rem'
                      }}
                      spellCheck={false}
                      placeholder="Today's wins..."
                  />
              </div>
              
               {/* The "Sheet" Footer - A black header at the bottom */}
              <div className="bg-[#1a1a1a] h-12 rounded-b-sm shadow-xl border-t-4 border-gray-700 border-l border-r border-white/5 mb-8 relative z-10"></div>
            </div>
        )}

        {activeTab === 'HISTORY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                {entries.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-20">No wins recorded yet.</p>}
                {entries.sort((a,b) => b.date.localeCompare(a.date)).map(entry => {
                    const [y, m, d] = entry.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d, 12, 0, 0); 
                    const formattedDate = format(dateObj, 'MMMM do, yyyy');
                    const isLong = entry.content.length > 200 || entry.content.split('\n').length > 6;

                    return (
                      <div key={entry.date} className="bg-charcoal p-6 rounded-lg border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group relative" onClick={() => {
                          setSelectedYear(y.toString());
                          setSelectedMonth(m.toString());
                          setSelectedDay(d.toString());
                          setActiveTab('WRITE');
                      }}>
                          <h3 className="font-mono text-blue-400 text-sm mb-2">{formattedDate}</h3>
                          <p className="text-gray-300 font-journal text-xl line-clamp-3 opacity-80 group-hover:opacity-100 transition-opacity">
                              {entry.content}
                          </p>
                          {isLong && (
                              <div className="absolute bottom-4 right-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" title="More content available"></div>
                          )}
                      </div>
                    );
                })}
            </div>
        )}
      </section>
    </div>
  );
};

export default Journal;