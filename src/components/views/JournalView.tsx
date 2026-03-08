import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { BookOpen, ArrowLeft, Plus, Trash2, Camera, Lock, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function JournalView() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const journalEntries = useAppStore((s) => s.journalEntries);
  const addJournalEntry = useAppStore((s) => s.addJournalEntry);
  const removeJournalEntry = useAppStore((s) => s.removeJournalEntry);

  const isLocked = user.subscription === 'free';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...journalEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setPhotoError('Max 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) return;
    addJournalEntry({
      id: uuidv4(),
      date,
      title: title.trim(),
      description: description.trim(),
      photo,
      createdAt: Date.now(),
    });
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPhoto(undefined);
    setPhotoError('');
    setShowForm(false);
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <button onClick={() => setView('settings')} className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <BookOpen size={20} className="text-yellow-400" />
          <h1 className="text-lg font-bold">{t('journal.title')}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <Lock size={48} className="text-gray-500" />
          <p className="text-gray-400 text-sm">{t('journal.proOnly')}</p>
          <button
            type="button"
            onClick={() => setView('upgrade')}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            {t('upgrade.upgrade')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={() => setView('settings')} className="p-2 rounded-lg hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <BookOpen size={20} className="text-yellow-400" />
        <h1 className="text-lg font-bold flex-1">{t('journal.title')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30"
        >
          <Plus size={16} />
          {t('journal.addEntry')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('journal.entryTitle')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('journal.entryDate')}</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('journal.entryDescription')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 resize-none"
              />
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-gray-300 text-sm hover:bg-white/15"
              >
                <Camera size={16} />
                {t('journal.addPhoto')}
              </button>
              {photoError && <p className="text-red-400 text-xs mt-1">{photoError}</p>}
              {photo && (
                <img src={photo} alt="preview" className="mt-2 w-20 h-20 object-cover rounded-lg border border-white/10" />
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !description.trim()}
              className="w-full py-2 rounded-lg bg-yellow-500 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-400"
            >
              {t('journal.save')}
            </button>
          </div>
        )}

        {sorted.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <BookOpen size={40} className="text-gray-600" />
            <p className="text-gray-500 text-sm max-w-xs">{t('journal.empty')}</p>
          </div>
        )}

        {sorted.map((entry) => (
          <div
            key={entry.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{entry.title}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Calendar size={12} />
                  {entry.date}
                </p>
              </div>
              <button
                onClick={() => removeJournalEntry(entry.id)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 shrink-0"
                title={t('journal.delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 line-clamp-3">{entry.description}</p>
            {entry.photo && (
              <img src={entry.photo} alt="" className="w-16 h-16 object-cover rounded-lg border border-white/10" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
