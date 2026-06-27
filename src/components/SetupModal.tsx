import React, { useState, useEffect } from 'react';
import { getAppConfig, saveAppConfig, type AppConfig } from '../services/config';
import { initFirebase, checkIsFirebaseLive } from '../services/firebase';
import { Database, Info, Settings, Sparkles, Check, RefreshCw } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [isSaved, setIsSaved] = useState(false);
  const [isLive, setIsLive] = useState(checkIsFirebaseLive());

  useEffect(() => {
    if (isOpen) {
      setConfig(getAppConfig());
      setIsSaved(false);
      setIsLive(checkIsFirebaseLive());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    if (field === 'geminiApiKey') {
      setConfig((prev) => ({ ...prev, geminiApiKey: value }));
    } else {
      setConfig((prev) => ({
        ...prev,
        firebaseConfig: {
          ...prev.firebaseConfig,
          [field]: value,
        },
      }));
    }
  };

  const handleSave = () => {
    saveAppConfig(config);
    const successfullyInitLive = initFirebase();
    setIsLive(successfullyInitLive);
    setIsSaved(true);
    onConfigSaved();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    const emptyConfig: AppConfig = {
      geminiApiKey: '',
      firebaseConfig: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      },
    };
    setConfig(emptyConfig);
    saveAppConfig(emptyConfig);
    initFirebase();
    setIsLive(false);
    onConfigSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl glass-panel border-4 border-dex-red flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-4 text-white flex items-center justify-between border-b-4 border-red-700">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 animate-spin-slow" />
            <h2 className="text-xl font-bold tracking-wider">CATDEX SYSTEM SETTINGS</h2>
          </div>
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-red-800/50 hover:bg-red-800 rounded-lg text-sm transition font-bold"
          >
            CLOSE
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Mode Indicator */}
          <div className={`p-4 rounded-xl flex items-start gap-3 transition-colors ${
            isLive 
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' 
              : 'bg-amber-50 text-amber-950 border border-amber-200'
          }`}>
            <Database className={`w-5 h-5 mt-0.5 shrink-0 ${isLive ? 'text-emerald-600' : 'text-amber-500'}`} />
            <div>
              <p className="font-bold text-sm">
                System Mode: {isLive ? '🟢 LIVE CONNECTED' : '🟡 DEMO SANDBOX MODE'}
              </p>
              <p className="text-xs opacity-90 mt-1">
                {isLive 
                  ? 'Your app is directly synced with Firebase Auth, Firestore, and Storage. Gemini API is active.' 
                  : 'No credentials configured. The app is running inside a Local Storage sandbox with simulated AI analysis.'}
              </p>
            </div>
          </div>

          {/* Gemini Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-dex-dark font-bold text-base">
              <Sparkles className="w-5 h-5 text-dex-yellow fill-dex-yellow" />
              <h3>Gemini API Key</h3>
            </div>
            <div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={config.geminiApiKey}
                onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                className="w-full px-4 py-2 bg-white/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono"
              />
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">Google AI Studio</a></span>
              </p>
            </div>
          </div>

          {/* Firebase Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-dex-dark font-bold text-base">
              <Database className="w-5 h-5 text-dex-blue" />
              <h3>Firebase Config</h3>
            </div>
            <p className="text-xs text-slate-500">
              Set these up to save discoveries, sync photos, and display a persistent leaderboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">API KEY</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={config.firebaseConfig.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/70 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PROJECT ID</label>
                <input
                  type="text"
                  placeholder="catdex-12345"
                  value={config.firebaseConfig.projectId}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/70 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">AUTH DOMAIN</label>
                <input
                  type="text"
                  placeholder="catdex-12345.firebaseapp.com"
                  value={config.firebaseConfig.authDomain}
                  onChange={(e) => handleChange('authDomain', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/70 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">STORAGE BUCKET</label>
                <input
                  type="text"
                  placeholder="catdex-12345.appspot.com"
                  value={config.firebaseConfig.storageBucket}
                  onChange={(e) => handleChange('storageBucket', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/70 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MESSAGING SENDER ID</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={config.firebaseConfig.messagingSenderId}
                  onChange={(e) => handleChange('messagingSenderId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/70 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">APP ID</label>
                <input
                  type="text"
                  placeholder="1:9876543210:web:abc123xyz"
                  value={config.firebaseConfig.appId}
                  onChange={(e) => handleChange('appId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/70 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-between gap-3 shrink-0">
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-1.5"
          >
            RESET
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2 font-bold rounded-xl text-sm transition flex items-center gap-2 ${
              isSaved 
                ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-md' 
                : 'bg-red-600 hover:bg-red-500 text-white hover:scale-105 active:scale-95 shadow-md shadow-red-200'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                SYSTEM UPDATED!
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                SAVE CONFIG
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
