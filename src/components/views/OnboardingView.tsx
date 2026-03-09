import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, UserPlus, ChevronRight, ChevronLeft,
  MapPin, Bell, CheckCircle, XCircle, Loader,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LegalView } from './LegalView';
import { addContact as apiAddContact, normalisePhone } from '../../lib/api';
import { v4 as uuidv4 } from 'uuid';
import { PhoneField } from '../PhoneField';

type Step = 'welcome' | 'contact' | 'setup' | 'legal';

type TestStatus = 'idle' | 'testing' | 'ok' | 'denied' | 'unavailable';

interface SetupTest {
  id:     'mic' | 'gps' | 'notif';
  labelKey:  string;
  hintKey:   string;
  icon:   React.ReactNode;
  status: TestStatus;
}

interface OnboardingViewProps {
  onComplete: () => void;
}

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === 'testing') return <Loader size={16} className="text-yellow-600 animate-spin" />;
  if (status === 'ok')      return <CheckCircle size={16} className="text-green-600" />;
  if (status === 'denied')  return <XCircle size={16} className="text-red-500" />;
  if (status === 'unavailable') return <XCircle size={16} className="text-muted-foreground" />;
  return <div className="w-4 h-4 rounded-full border border-border bg-muted" />;
}

function useStatusLabel() {
  const { t } = useTranslation();
  return (status: TestStatus): string => {
    if (status === 'idle')        return t('onboarding.permissions.toTest');
    if (status === 'testing')     return t('common.loading');
    if (status === 'ok')          return t('common.authorized') + ' ✓';
    if (status === 'denied')      return t('common.refused');
    if (status === 'unavailable') return t('permissions.deny');
    return '';
  };
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const { addContact } = useAppStore();
  const [step, setStep]       = useState<Step>('welcome');
  const [contact, setContact] = useState({ name: '', phone: '', relationship: '' });

  const [tests, setTests] = useState<SetupTest[]>([
    {
      id:       'gps',
      labelKey: 'onboarding.permissions.gps',
      hintKey:  'onboarding.permissions.gpsDesc',
      icon:     <MapPin size={18} />,
      status:   'idle',
    },
    {
      id:       'notif',
      labelKey: 'onboarding.permissions.notifications',
      hintKey:  'onboarding.permissions.notificationsDesc',
      icon:     <Bell size={18} />,
      status:   'idle',
    },
  ]);

  const setTestStatus = useCallback((id: SetupTest['id'], status: TestStatus) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t)),
    );
  }, []);

  const steps: Step[] = ['welcome', 'contact', 'setup', 'legal'];
  const stepIndex     = steps.indexOf(step);
  const progress      = ((stepIndex + 1) / steps.length) * 100;

  const goBack = () => {
    if (stepIndex > 0) {
      setStep(steps[stepIndex - 1]);
    }
  };

  const handleContactNext = async () => {
    if (contact.name && contact.phone) {
      const newContact = {
        id:           uuidv4(),
        name:         contact.name,
        phone:        normalisePhone(contact.phone),
        relationship: contact.relationship || 'Contact',
        priority:     'primary' as const,
        email:        '',
        createdAt:    new Date().toISOString(),
      };
      addContact(newContact);
      try { await apiAddContact(newContact); } catch {}
    }
    setStep('setup');
  };

  const testGPS = () => {
    if (!('geolocation' in navigator)) {
      setTestStatus('gps', 'unavailable');
      return;
    }
    setTestStatus('gps', 'testing');
    navigator.geolocation.getCurrentPosition(
      () => setTestStatus('gps', 'ok'),
      () => setTestStatus('gps', 'denied'),
      { timeout: 8000 },
    );
  };

  const testNotif = async () => {
    if (!('Notification' in window)) {
      setTestStatus('notif', 'unavailable');
      return;
    }
    setTestStatus('notif', 'testing');
    const perm = await Notification.requestPermission();
    setTestStatus('notif', perm === 'granted' ? 'ok' : 'denied');
  };

  const handleTest = (id: SetupTest['id']) => {
    if (id === 'gps')   testGPS();
    if (id === 'notif') testNotif();
  };

  const canProceedSetup = tests.find((t) => t.id === 'gps')?.status !== 'idle';

  const handleLegalAccept = () => onComplete();

  const BackButton = () => (
    <motion.button
      onClick={goBack}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 -ml-1"
      whileTap={{ scale: 0.95 }}
    >
      <ChevronLeft size={20} />
      <span className="text-base font-bold">{t('common.back') || 'Retour'}</span>
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {step !== 'welcome' && (
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#c41e2a] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">

          {step === 'welcome' && (
            <motion.div
              key="welcome"
              className="flex flex-col items-center gap-6 py-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
            >
              <motion.div
                className="w-24 h-24 rounded-3xl bg-[#c41e2a]/10 border border-[#c41e2a]/20 flex items-center justify-center"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              >
                <Shield size={42} className="text-[#c41e2a]" />
              </motion.div>

              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-3xl font-black text-foreground tracking-wider uppercase">{t('app.name')}</h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {t('onboarding.welcome.subtitle')}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full text-left">
                {[
                  { emoji: '🚨', text: t('onboarding.welcome.feature1') },
                  { emoji: '⏱', text: t('onboarding.welcome.feature2') },
                  { emoji: '📡', text: t('onboarding.welcome.feature3') },
                  { emoji: '📍', text: t('onboarding.welcome.feature4') },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={() => setStep('contact')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#c41e2a] hover:bg-[#a81823] text-white font-black text-base transition-all shadow-lg shadow-red-900/20"
                whileTap={{ scale: 0.98 }}
              >
                {t('onboarding.welcome.start')}
                <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {step === 'contact' && (
            <motion.div
              key="contact"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <BackButton />

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-[#c41e2a]" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('onboarding.contact.title')} (1/3)</span>
                </div>
                <h2 className="text-xl font-black text-foreground">{t('onboarding.contact.title')}</h2>
                <p className="text-xs text-muted-foreground">{t('onboarding.contact.subtitle')}</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('onboarding.contact.nameLabel')} *</label>
                  <input
                    type="text"
                    placeholder={t('onboarding.contact.namePlaceholder')}
                    value={contact.name}
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#c41e2a]/50 transition-colors"
                    autoFocus
                  />
                </div>

                <PhoneField
                  id="onboarding-contact-phone"
                  label={t('onboarding.contact.phoneLabel') + ' *'}
                  value={contact.phone}
                  onChange={(e164) => setContact((c) => ({ ...c, phone: e164 }))}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('onboarding.contact.relationship')}</label>
                  <input
                    type="text"
                    placeholder={t('onboarding.contact.relationshipPlaceholder')}
                    value={contact.relationship}
                    onChange={(e) => setContact((c) => ({ ...c, relationship: e.target.value }))}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#c41e2a]/50 transition-colors"
                  />
                </div>
              </div>

              <motion.button
                onClick={handleContactNext}
                disabled={!contact.name.trim() || !contact.phone.trim()}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#c41e2a] hover:bg-[#a81823] disabled:opacity-40 text-white font-black transition-all"
                whileTap={{ scale: 0.98 }}
              >
                {t('common.next')} <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {step === 'setup' && (
            <motion.div
              key="setup"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <BackButton />

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-[#c41e2a]" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('onboarding.permissions.title')} (2/3)</span>
                </div>
                <h2 className="text-xl font-black text-foreground">{t('onboarding.permissions.title')}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('onboarding.permissions.subtitle')}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {tests.map((test, i) => {
                  const isTesting = test.status === 'testing';
                  const isDone    = test.status === 'ok' || test.status === 'denied' || test.status === 'unavailable';

                  return (
                    <motion.div
                      key={test.id}
                      className={[
                        'rounded-2xl border p-4 flex items-center gap-4 transition-all duration-300',
                        test.status === 'ok'
                          ? 'border-green-500/30 bg-green-50'
                          : test.status === 'denied'
                          ? 'border-red-500/20 bg-red-50'
                          : 'border-border bg-card',
                      ].join(' ')}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <div className={[
                        'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                        test.status === 'ok'
                          ? 'bg-green-100 border-green-300 text-green-600'
                          : test.status === 'denied'
                          ? 'bg-red-100 border-red-300 text-red-500'
                          : 'bg-muted border-border text-muted-foreground',
                      ].join(' ')}>
                        {test.icon}
                      </div>

                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-sm font-black text-foreground">{t(test.labelKey)}</span>
                        <span className="text-sm text-muted-foreground leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: t(test.hintKey) }} />
                        <span className={[
                          'text-sm font-bold mt-0.5',
                          test.status === 'ok'          ? 'text-green-600'
                          : test.status === 'denied'    ? 'text-red-500'
                          : test.status === 'testing'   ? 'text-yellow-600'
                          : test.status === 'unavailable' ? 'text-muted-foreground'
                          : 'text-muted-foreground',
                        ].join(' ')}>
                          {statusLabel(test.status)}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {isDone ? (
                          <StatusIcon status={test.status} />
                        ) : (
                          <motion.button
                            onClick={() => handleTest(test.id)}
                            disabled={isTesting}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#c41e2a] hover:bg-[#a81823] disabled:opacity-50 text-white text-sm font-black uppercase tracking-wider transition-all"
                            whileTap={{ scale: 0.96 }}
                          >
                            {isTesting ? <Loader size={12} className="animate-spin" /> : null}
                            {t('common.test')}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {tests.some((t) => t.status === 'denied') && (
                <motion.div
                  className="rounded-xl border border-yellow-400/30 bg-yellow-50 px-4 py-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-sm text-yellow-700 leading-relaxed">
                    {t('permissions.description')}
                  </p>
                </motion.div>
              )}

              <motion.button
                onClick={() => setStep('legal')}
                disabled={!canProceedSetup}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#c41e2a] hover:bg-[#a81823] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black transition-all"
                whileTap={{ scale: 0.98 }}
              >
                {t('common.next')} <ChevronRight size={18} />
              </motion.button>

              <p className="text-sm text-muted-foreground text-center">
                {t('onboarding.permissions.gpsRequired')}
              </p>
            </motion.div>
          )}

          {step === 'legal' && (
            <motion.div
              key="legal"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <BackButton />

              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-[#c41e2a]" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{t('onboarding.legal.title')} (3/3)</span>
              </div>
              <LegalView onAccept={handleLegalAccept} isOnboarding />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
