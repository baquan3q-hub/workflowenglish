import React, { useState } from 'react';
import { BookOpen, Upload, Wand2, FileText, AlertCircle } from 'lucide-react';
import { DifficultyLevel, UserSettings } from '../types';
import { Button, Select } from '../components/Common';

interface DashboardProps {
  onGenerate: (text: string, settings: UserSettings) => void;
  isLoading: boolean;
}

const TOPICS = [
  "General Communication",
  "Business & Office",
  "Travel & Tourism",
  "Academic & IELTS",
  "Technology",
  "Food & Dining",
  "Health & Lifestyle"
];

const Dashboard: React.FC<DashboardProps> = ({ onGenerate, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    level: DifficultyLevel.B1,
    topic: TOPICS[0]
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (file) {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setInputText(content);
        };
        reader.onerror = () => {
          setError("Failed to read file.");
        };
        reader.readAsText(file);
      } else {
        setError("Please upload a valid .txt file. PDF parsing requires server-side processing.");
      }
    }
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      onGenerate(inputText, settings);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-fade-in px-4 sm:px-0">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-3 sm:mb-4">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">VocabMaster</h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
          Transform your vocabulary list into an immersive learning experience with AI.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 space-y-5 sm:space-y-6">
        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Target Level"
            value={settings.level}
            onChange={(e) => setSettings({ ...settings, level: e.target.value as DifficultyLevel })}
          >
            {Object.values(DifficultyLevel).map(level => (
              <option key={level} value={level}>{level} - {getLevelDesc(level)}</option>
            ))}
          </Select>

          <Select
            label="Topic Context"
            value={settings.topic}
            onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
          >
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
            <span>Vocabulary List</span>
            <span className="text-slate-400 font-normal text-xs">Enter words, comma separated or pasted text</span>
          </label>
          <textarea
            className="w-full h-40 p-4 rounded-xl border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 transition-colors"
            placeholder="e.g. Serendipity, Ephemeral, Luminous..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="relative overflow-hidden">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".txt"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            >
              <FileText className="w-4 h-4" />
              Import from .txt
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!inputText.trim()}
            className="w-full md:w-auto min-w-[200px]"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Lesson
          </Button>
        </div>
      </div>
    </div>
  );
};

const getLevelDesc = (level: DifficultyLevel) => {
  switch (level) {
    case 'A1': return 'Beginner';
    case 'A2': return 'Elementary';
    case 'B1': return 'Intermediate';
    case 'B2': return 'Upper Intermediate';
    case 'C1': return 'Advanced';
    case 'C2': return 'Proficient';
    default: return '';
  }
}

export default Dashboard;