import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, ArrowLeft, Plus, X, Lock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

interface TagInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}

const TagInput: React.FC<TagInputProps> = ({ items, onChange, placeholder }) => {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      if (!items.includes(value.trim())) {
        onChange([...items, value.trim()]);
      }
      setValue('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="hover:text-red-100 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
        <button
          type="button"
          onClick={() => {
            if (value.trim() && !items.includes(value.trim())) {
              onChange([...items, value.trim()]);
              setValue('');
            }
          }}
          className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export const MedicalProfileView: React.FC = () => {
  const { t } = useTranslation();
  const { user, medicalProfile, setMedicalProfile, setView } = useAppStore();

  const isPro = user.subscription === 'pro';
  const isPlatinum = user.subscription === 'platinum';
  const hasAccess = isPro || isPlatinum;

  const [bloodType, setBloodType] = useState(medicalProfile.bloodType);
  const [allergies, setAllergies] = useState<string[]>([...medicalProfile.allergies]);
  const [medications, setMedications] = useState<string[]>([...medicalProfile.medications]);
  const [conditions, setConditions] = useState<string[]>([...medicalProfile.conditions]);
  const [emergencyNotes, setEmergencyNotes] = useState(medicalProfile.emergencyNotes);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setMedicalProfile({ bloodType, allergies, medications, conditions, emergencyNotes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => setView('settings')}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <Heart size={20} className="text-red-400" />
        <h1 className="text-lg font-bold">{t('medical.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        {!hasAccess ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="p-4 rounded-full bg-card border border-border">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">{t('medical.proOnly')}</p>
            <button
              type="button"
              onClick={() => setView('upgrade')}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              {t('upgrade.upgrade')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('medical.bloodType')}
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 appearance-none"
              >
                <option value="">{t('medical.unknown')}</option>
                {BLOOD_TYPES.filter(bt => bt !== 'Unknown').map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('medical.allergies')}
              </label>
              <TagInput
                items={allergies}
                onChange={setAllergies}
                placeholder={t('medical.addItem')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('medical.medications')}
              </label>
              <TagInput
                items={medications}
                onChange={setMedications}
                placeholder={t('medical.addItem')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('medical.conditions')}
              </label>
              <TagInput
                items={conditions}
                onChange={setConditions}
                placeholder={t('medical.addItem')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('medical.emergencyNotes')}
              </label>
              <textarea
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                rows={4}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none"
                placeholder={t('medical.emergencyNotes')}
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {saved ? '✓' : t('medical.save')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
