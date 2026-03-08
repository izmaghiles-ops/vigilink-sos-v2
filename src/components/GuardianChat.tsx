import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Send, Shield, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage } from '../lib/api';

const BTN_SIZE = 48;
const EDGE_MARGIN = 8;

interface Message {
  id:         string;
  role:       'user' | 'agent';
  contenu:    string;
  enCours?:   boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export const GuardianChat: React.FC = () => {
  const { t } = useTranslation();

  const [ouvert,   setOuvert]   = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([
    { id: 'bienvenue', role: 'agent', contenu: t('chat.welcome') },
  ]);
  const [saisie,   setSaisie]   = useState('');
  const [envoi,    setEnvoi]    = useState(false);
  const basRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth - BTN_SIZE - EDGE_MARGIN,
        y: window.innerHeight - BTN_SIZE - 100,
      };
    }
    return { x: 300, y: 500 };
  });

  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => ({
        x: clamp(prev.x, EDGE_MARGIN, window.innerWidth - BTN_SIZE - EDGE_MARGIN),
        y: clamp(prev.y, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDragStart = useCallback(() => {
    hasDragged.current = false;
  }, []);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 3 || Math.abs(info.offset.y) > 3) {
      hasDragged.current = true;
    }
  }, []);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (!hasDragged.current) return;
    setPos((prev) => {
      const rawX = prev.x + info.offset.x;
      const rawY = prev.y + info.offset.y;
      const maxX = window.innerWidth - BTN_SIZE - EDGE_MARGIN;
      const maxY = window.innerHeight - BTN_SIZE - EDGE_MARGIN;
      const cx = clamp(rawX, EDGE_MARGIN, maxX);
      const cy = clamp(rawY, EDGE_MARGIN, maxY);
      const snapX = cx < window.innerWidth / 2 ? EDGE_MARGIN : maxX;
      return { x: snapX, y: cy };
    });
  }, []);

  const handleClick = useCallback(() => {
    if (hasDragged.current) return;
    setOuvert((p) => !p);
  }, []);

  const handleEnvoyer = useCallback(async () => {
    if (!saisie.trim() || envoi) return;
    const texte = saisie.trim();
    setSaisie('');
    setEnvoi(true);

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', contenu: texte };
    const agentId = `a-${Date.now()}`;
    const agentMsg: Message = { id: agentId, role: 'agent', contenu: '', enCours: true };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

    const history = messages
      .filter((m) => m.id !== 'bienvenue')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.contenu,
      }));
    history.push({ role: 'user', content: texte });

    try {
      await sendChatMessage(texte, history, (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId ? { ...m, contenu: m.contenu + chunk } : m
          )
        );
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentId
            ? { ...m, contenu: t('chat.error'), enCours: false }
            : m
        )
      );
    }

    setMessages((prev) =>
      prev.map((m) => m.id === agentId ? { ...m, enCours: false } : m)
    );
    setEnvoi(false);
  }, [saisie, envoi, messages, t]);

  const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
  const isLeft = pos.x < winW / 2;
  const chatW = Math.min(320, winW - EDGE_MARGIN * 2);
  const chatH = Math.min(winH * 0.55, 420);
  const chatX = isLeft
    ? clamp(pos.x, EDGE_MARGIN, winW - chatW - EDGE_MARGIN)
    : clamp(pos.x + BTN_SIZE - chatW, EDGE_MARGIN, winW - chatW - EDGE_MARGIN);
  const chatYAbove = pos.y - chatH - 8;
  const chatYBelow = pos.y + BTN_SIZE + 8;
  const chatY = chatYAbove >= EDGE_MARGIN ? chatYAbove : chatYBelow;

  return (
    <>
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className="fixed z-50 w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 flex items-center justify-center transition-colors cursor-grab active:cursor-grabbing"
        style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
        whileTap={{ scale: 0.92 }}
        aria-label={`${t('chat.title')} Vigilink-SOS`}
      >
        <AnimatePresence mode="wait">
          {ouvert ? (
            <motion.span
              key="fermer"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={18} />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Shield size={18} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            className="fixed z-40 flex flex-col rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden"
            style={{
              left: chatX,
              top: chatY,
              width: chatW,
              maxHeight: chatH,
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-red-950/20">
              <Shield size={15} className="text-red-400" />
              <span className="text-sm font-bold text-white">{t('app.name')} {t('chat.title')}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-sm text-gray-500">{t('network.online')}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                      m.role === 'user'
                        ? 'bg-red-700 text-white rounded-br-sm'
                        : 'bg-white/8 text-gray-200 rounded-bl-sm border border-white/5',
                    ].join(' ')}
                  >
                    {m.contenu}
                    {m.enCours && (
                      <span className="inline-block w-1 h-3 bg-red-400 ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={basRef} />
            </div>

            <div className="flex gap-2 p-3 border-t border-white/10">
              <input
                type="text"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEnvoyer()}
                placeholder={t('chat.placeholder')}
                disabled={envoi}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 disabled:opacity-40"
              />
              <button
                onClick={handleEnvoyer}
                disabled={!saisie.trim() || envoi}
                className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
              >
                {envoi
                  ? <Loader size={12} className="animate-spin" />
                  : <Send size={12} />
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
