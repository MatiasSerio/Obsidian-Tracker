
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { PenTool, History as HistoryIcon, Plus } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalProps {
  entries: JournalEntry[];
  onSaveEntry: (date: string, content: string) => void;
}

const Journal: React.FC<JournalProps> = ({ entries, onSaveEntry }) => {
  const [activeTab, setActiveTab] = useState<'WRITE' | 'HISTORY'>('WRITE');
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), 'd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'M'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate Date Arrays
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  // Derived Date
  const currentKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`;

  useEffect(() => {
    const entry = entries.find(e => e.date === currentKey);
    setContent(entry ? entry.content : '');
  }, [currentKey, entries]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onSaveEntry(currentKey, e.target.value);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold flex items-center">
                <PenTool className="mr-3 text-accent" /> Journal of Wins
            </h2>
            <p className="text-gray-400 mt-1">Actions and results you're proud of.</p>
        </div>
        <div className="flex bg-charcoal rounded-lg p-1 border border-white/5">
            <button 
                onClick={() => setActiveTab('WRITE')} 
                className={`px-4 py-2 rounded text-sm font-bold flex items-center ${activeTab === 'WRITE' ? 'bg-accent text-obsidian' : 'text-gray-400 hover:text-white'}`}
            >
                <Plus size={14} className="mr-2"/> New Entry
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')} 
                className={`px-4 py-2 rounded text-sm font-bold flex items-center ${activeTab === 'HISTORY' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <HistoryIcon size={14} className="mr-2"/> History
            </button>
        </div>
      </div>

      {activeTab === 'WRITE' && (
          <>
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
            <div className="flex-1 bg-[#121212] shadow-2xl relative min-h-[600px] border-l border-r border-white/5">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    className="w-full bg-transparent text-gray-300 text-xl leading-[2.5rem] border-none focus:ring-0 resize-none font-journal focus:outline-none min-h-[600px] px-8 py-2"
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
            <div className="bg-[#1a1a1a] h-20 rounded-b-sm shadow-xl border-t-4 border-gray-700 border-l border-r border-white/5 mb-8 relative z-10"></div>
          </>
      )}

      {activeTab === 'HISTORY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-20">No wins recorded yet.</p>}
              {entries.sort((a,b) => b.date.localeCompare(a.date)).map(entry => {
                  // FIX DATE BUG: Use noon (12:00:00) to avoid timezone rollovers
                  const [y, m, d] = entry.date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d, 12, 0, 0); 
                  const formattedDate = format(dateObj, 'MMMM do, yyyy');

                  // Increased threshold to ~200 chars or > 6 lines to prevent false positives for "unreadable" content
                  const isLong = entry.content.length > 200 || entry.content.split('\n').length > 6;

                  return (
                    <div key={entry.date} className="bg-charcoal p-6 rounded-lg border border-white/5 hover:border-accent/30 transition-all cursor-pointer group relative" onClick={() => {
                        setSelectedYear(y.toString());
                        setSelectedMonth(m.toString());
                        setSelectedDay(d.toString());
                        setActiveTab('WRITE');
                    }}>
                        <h3 className="font-mono text-accent text-sm mb-2">{formattedDate}</h3>
                        <p className="text-gray-300 font-journal text-xl line-clamp-3 opacity-80 group-hover:opacity-100 transition-opacity">
                            {entry.content}
                        </p>
                        {isLong && (
                            <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" title="More content available"></div>
                        )}
                    </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default Journal;
