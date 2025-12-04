
import React, { useState, useRef } from 'react';
import { Habit, BackupData } from '../types';
import { Plus, Trash2, Edit2, Save, X, Download, Upload, Database, ArrowUp, ArrowDown } from 'lucide-react';

interface HabitManagerProps {
  habits: Habit[];
  onAdd: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Habit>) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onExport: () => void;
  onImport: (data: BackupData) => void;
}

const HabitManager: React.FC<HabitManagerProps> = ({ habits, onAdd, onUpdate, onDelete, onReorder, onExport, onImport }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', objective: '', minObjective: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAdding = () => {
    setEditingId(null);
    setFormData({ name: '', objective: '', minObjective: '' });
    setIsEditing(true);
  };

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setFormData({ 
      name: habit.name, 
      objective: habit.objective, 
      minObjective: habit.minObjective 
    });
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.objective) {
      if (editingId) {
        onUpdate(editingId, formData);
      } else {
        onAdd(formData);
      }
      setFormData({ name: '', objective: '', minObjective: '' });
      setIsEditing(false);
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', objective: '', minObjective: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          onImport(json);
        } catch (error) {
          alert("Invalid file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col pb-20 space-y-12 relative">
      
      {/* Modal Overlay for Editing/Adding */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancel}>
            <div className="bg-charcoal p-8 rounded-xl border border-white/10 w-full max-w-lg shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">{editingId ? 'Edit Habit' : 'New Habit'}</h3>
                    <button onClick={handleCancel} className="text-gray-500 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Habit Name</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-obsidian border border-gray-700 rounded p-3 text-white focus:border-accent focus:outline-none"
                                placeholder="e.g. Morning Run"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Main Objective</label>
                            <input 
                                type="text" 
                                value={formData.objective}
                                onChange={(e) => setFormData({...formData, objective: e.target.value})}
                                className="w-full bg-obsidian border border-gray-700 rounded p-3 text-white focus:border-accent focus:outline-none"
                                placeholder="e.g. 5 Kilometers"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Min. Objective</label>
                            <input 
                                type="text" 
                                value={formData.minObjective}
                                onChange={(e) => setFormData({...formData, minObjective: e.target.value})}
                                className="w-full bg-obsidian border border-gray-700 rounded p-3 text-white focus:border-accent focus:outline-none"
                                placeholder="e.g. 1 Kilometer"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-accent hover:bg-emerald-400 text-obsidian p-3 rounded font-bold flex items-center justify-center transition-colors">
                        <Save size={18} className="mr-2"/> {editingId ? 'Update Configuration' : 'Save Configuration'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Configuration Section */}
      <div>
        <div className="flex justify-between items-center mb-8">
            <div>
            <h2 className="text-3xl font-bold">Daily Habits Configuration</h2>
            <p className="text-gray-400 mt-1">Define and prioritize the pillars of your routine.</p>
            </div>
            <button 
            onClick={startAdding}
            className="bg-accent text-obsidian px-4 py-2 rounded font-bold flex items-center hover:bg-emerald-400 transition-colors"
            >
             <Plus size={18} className="mr-2"/>
             Add Habit
            </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {habits.map((habit, index) => (
            <div key={habit.id} className="bg-charcoal p-4 rounded-lg border border-white/5 flex justify-between items-center group hover:border-white/20 transition-all">
                
                <div className="flex items-center space-x-5">
                    {/* Reorder Controls */}
                    <div className="flex flex-col space-y-1 bg-black/40 p-1.5 rounded border border-white/5">
                        <button 
                            onClick={() => onReorder(index, index - 1)}
                            disabled={index === 0}
                            className="p-1 rounded text-gray-500 hover:text-accent hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                            title="Move Up"
                        >
                            <ArrowUp size={16} />
                        </button>
                        <button 
                            onClick={() => onReorder(index, index + 1)}
                            disabled={index === habits.length - 1}
                            className="p-1 rounded text-gray-500 hover:text-accent hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                            title="Move Down"
                        >
                            <ArrowDown size={16} />
                        </button>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center">
                          {habit.name}
                          <span className="ml-3 text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500 font-mono">#{index + 1}</span>
                        </h3>
                        <div className="mt-1 flex items-center space-x-4">
                            <div className="text-sm text-gray-400">
                                <span className="text-accent text-xs uppercase tracking-wider font-bold mr-2">Goal</span> 
                                {habit.objective}
                            </div>
                            {habit.minObjective && (
                            <div className="text-sm text-gray-500">
                                <span className="text-yellow-500 text-xs uppercase tracking-wider font-bold mr-2">Min</span> 
                                {habit.minObjective}
                            </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <button 
                        onClick={() => startEditing(habit)}
                        className="text-gray-500 hover:text-blue-400 p-2 transition-colors border border-transparent hover:border-blue-500/30 rounded"
                        title="Edit Habit"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={() => onDelete(habit.id)}
                        className="text-gray-500 hover:text-alert p-2 transition-colors border border-transparent hover:border-red-500/30 rounded"
                        title="Delete Habit"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>

      {/* Data Control Section */}
      <div className="border-t border-white/10 pt-10">
        <h3 className="text-xl font-bold flex items-center mb-6 text-gray-300">
            <Database className="mr-2" size={20}/> Data Control
        </h3>
        <div className="bg-charcoal p-6 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-bold text-white mb-2">Backup Data</h4>
                <p className="text-xs text-gray-500 mb-4">Download a JSON file containing all your habits, logs, and tasks. Save this file to avoid data loss.</p>
                <button 
                    onClick={onExport}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-sm py-3 rounded flex items-center justify-center transition-colors"
                >
                    <Download size={16} className="mr-2"/> Export to JSON
                </button>
            </div>
            <div>
                <h4 className="font-bold text-white mb-2">Restore Data</h4>
                <p className="text-xs text-gray-500 mb-4">Upload a previously exported JSON file. <span className="text-red-400">Warning: This will overwrite current data.</span></p>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-sm py-3 rounded flex items-center justify-center transition-colors"
                >
                    <Upload size={16} className="mr-2"/> Import from JSON
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json"
                    onChange={handleFileUpload}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default HabitManager;
