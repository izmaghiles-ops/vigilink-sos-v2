import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

interface DuressKeypadProps {
  normalCode?: string;
  duressCode?: string;
  onNormal?:            () => void;
  onDuress?:            () => void;
  onCancel?:            () => void;
  onNormalDeactivate?:  () => void;
  onDuressDetected?:    () => void;
}

export const DuressKeypad: React.FC<DuressKeypadProps> = (props) => {
  const { user } = useAppStore();
  const normalCode = props.normalCode ?? user.normalCode ?? '1234';
  const duressCode = props.duressCode ?? user.duressCode ?? '9999';
  const onNormal   = props.onNormal  ?? props.onNormalDeactivate ?? (() => {});
  const onDuress   = props.onDuress  ?? props.onDuressDetected   ?? (() => {});
  const onCancel   = props.onCancel  ?? (() => {});
  const [entry, setEntry] = useState('');

  const handleKey = (k: string) => {
    const next = (entry + k).slice(-4);
    setEntry(next);
    if (next === normalCode) { setEntry(''); onNormal(); }
    else if (next === duressCode) { setEntry(''); onDuress(); }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-2 mb-2">
        {[0,1,2,3].map((i) => (
          <div key={i}
            className={`w-3 h-3 rounded-full transition-all ${i < entry.length ? 'bg-red-500' : 'bg-white/20'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {keys.map((k, i) => (
          k === '' ? <div key={i} /> :
          k === '⌫' ? (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => setEntry(e => e.slice(0,-1))}
              className="h-14 rounded-2xl bg-white/10 text-white text-lg font-bold hover:bg-white/20 transition-colors">
              {k}
            </motion.button>
          ) : (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => handleKey(k)}
              className="h-14 rounded-2xl bg-white/10 text-white text-lg font-bold hover:bg-white/20 transition-colors">
              {k}
            </motion.button>
          )
        ))}
      </div>
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-400 transition-colors mt-2">
        Annuler
      </button>
    </div>
  );
};
