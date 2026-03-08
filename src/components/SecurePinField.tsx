import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface SecurePinFieldProps {
  id:           string;
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  maxLength?:   number;
  hint?:        string;
  accentClass?: string;
}

export const SecurePinField: React.FC<SecurePinFieldProps> = ({
  id, label, value, onChange, maxLength = 4, hint,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/40 transition-colors">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
          placeholder={'•'.repeat(maxLength)}
          maxLength={maxLength}
          className="flex-1 bg-transparent text-sm text-foreground placeholder-gray-600 focus:outline-none font-mono tracking-widest"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && <p className="text-sm text-gray-600 leading-relaxed">{hint}</p>}
    </div>
  );
};
