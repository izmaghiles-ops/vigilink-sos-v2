import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Shield, CheckCircle, Bell, BellOff,
  MapPin, Settings2, FileText, Phone, AlertTriangle,
  ChevronRight, ChevronDown, Crown, Zap, LogOut,
  Smartphone, EyeOff, HelpCircle, Mail, Bug,
  Gift, UserCheck, Globe, X, Brain, PhoneCall,
  Heart, QrCode, BookOpen, Users, Plane, Headphones,
  XOctagon, ArrowDownCircle, CreditCard,
} from 'lucide-react';
import { useAppStore }     from '../../store/useAppStore';
import { useAuthStore }    from '../../store/useAuthStore';
import { DevPlanSwitcher } from '../DevPlanSwitcher';
import { SecurePinField }  from '../SecurePinField';
import { normalisePhone }  from '../../lib/api';
import { PlatinumConfig, PLATINUM_CONFIG_DEFAUT, ALZHEIMER_MODE_DEFAULT, FAKE_CALL_DEFAULT } from '../../types';
import { PhoneField } from '../PhoneField';
import { LANGUAGES } from '../../i18n/languages';

const Accordion: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  sectionKey: string;
  openKey: string | null;
  onToggle: (key: string) => void;
}> = ({ icon, title, children, sectionKey, openKey, onToggle }) => {
  const isOpen = openKey === sectionKey;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-5 py-5 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#c41e2a]">{icon}</span>
          <h3 className="text-base font-bold text-foreground uppercase tracking-wider">{title}</h3>
        </div>
        <ChevronDown
          size={22}
          className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FieldProps {
  id:         string;
  label:      string;
  type?:      string;
  value:      string;
  onChange:   (v: string) => void;
  maxLength?: number;
  pattern?:   string;
}
const Field: React.FC<FieldProps> = ({ id, label, type = 'text', value, onChange, maxLength, pattern }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm text-muted-foreground uppercase tracking-wider font-bold">{label}</label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      pattern={pattern}
      className="bg-card border border-border rounded-xl px-4 py-4 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/50 transition-colors"
    />
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  colorClass?: string;
}> = ({ checked, onChange, colorClass = 'bg-yellow-500' }) => (
  <button
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    className={[
      'relative inline-flex h-8 w-14 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
      checked ? colorClass : 'bg-muted',
    ].join(' ')}
  >
    <span className={[
      'inline-block h-7 w-7 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out',
      checked ? 'translate-x-6' : 'translate-x-0',
    ].join(' ')} />
  </button>
);

export const SettingsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, setUser, setView, contacts, setPlatinumConfig, alzheimerMode, setAlzheimerMode, fakeCallConfig, setFakeCallConfig } = useAppStore();
  const { logout, syncNom, syncContacts: authSyncContacts, syncPlatinumConfig, syncSettings, changerMotDePasse } = useAuthStore();

  const isPro      = user.subscription === 'pro' || user.subscription === 'trial';
  const isPlatinum = user.subscription === 'platinum';
  const isGuest    = user.sponsorRole  === 'guest';
  const isSponsor  = user.sponsorRole  === 'sponsor';

  const [langOpen, setLangOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (key: string) => {
    setOpenSection((prev) => (prev === key ? null : key));
    if (key !== 'language') setLangOpen(false);
  };

  const handleLogout = () => {
    authSyncContacts(contacts);
    syncNom(user.name);
    logout();
    useAppStore.getState().setAdminSession(false);
    setView('home');
  };

  const [saved,           setSaved]           = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [pwdForm, setPwdForm] = useState({ current: '', nouveau: '', confirm: '' });
  const [pwdMsg,  setPwdMsg]  = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChangePassword = () => {
    setPwdMsg(null);
    if (!pwdForm.current || !pwdForm.nouveau) {
      setPwdMsg({ type: 'err', text: t('settings.errors.fillAllFields') });
      return;
    }
    if (pwdForm.nouveau.length < 4) {
      setPwdMsg({ type: 'err', text: t('settings.errors.passwordTooShort') });
      return;
    }
    if (pwdForm.nouveau !== pwdForm.confirm) {
      setPwdMsg({ type: 'err', text: t('settings.errors.passwordMismatch') });
      return;
    }
    const result = changerMotDePasse(pwdForm.current, pwdForm.nouveau);
    if (result === 'ok') {
      setPwdMsg({ type: 'ok', text: t('settings.errors.passwordChanged') });
      setPwdForm({ current: '', nouveau: '', confirm: '' });
      setTimeout(() => setPwdMsg(null), 3000);
    } else if (result === 'wrong_current') {
      setPwdMsg({ type: 'err', text: t('settings.errors.wrongCurrent') });
    } else if (result === 'same_password') {
      setPwdMsg({ type: 'err', text: t('settings.errors.samePassword') });
    }
  };

  const [form, setForm] = useState({
    name:        user.name        ?? '',
    phone:       user.phone       ?? '',
    normalCode:  user.normalCode  ?? '1234',
    duressCode:  user.duressCode  ?? '9999',
    proPhone1:   user.proPhone1   ?? '',
    proPhone2:   user.proPhone2   ?? '',
  });

  const [emailField, setEmailField] = useState(user.email ?? '');

  const [platForm, setPlatForm] = useState<PlatinumConfig>(
    () => user.platinumConfig ?? PLATINUM_CONFIG_DEFAUT,
  );

  const updatePlat = <K extends keyof PlatinumConfig>(key: K, value: PlatinumConfig[K]) => {
    setPlatForm((prev) => {
      const updated = { ...prev, [key]: value };
      setPlatinumConfig(updated);
      syncPlatinumConfig(updated);
      return updated;
    });
  };


  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  const demanderNotifs = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const handleSave = () => {
    if (form.normalCode === form.duressCode) {
      alert(t('settings.errors.codesMustDiffer'));
      return;
    }

    const updatedUser = {
      name:       form.name.trim(),
      phone:      form.phone,
      normalCode: form.normalCode,
      duressCode: form.duressCode,
      proPhone1:  form.proPhone1.trim() ? normalisePhone(form.proPhone1.trim()) : '',
      proPhone2:  form.proPhone2.trim() ? normalisePhone(form.proPhone2.trim()) : '',
    };

    setUser(updatedUser);

    syncNom(updatedUser.name);
    authSyncContacts(contacts);
    syncSettings({
      normalCode: updatedUser.normalCode,
      duressCode: updatedUser.duressCode,
      proPhone1:  updatedUser.proPhone1,
      proPhone2:  updatedUser.proPhone2,
    });

    if (isPlatinum) {
      setPlatinumConfig(platForm);
      syncPlatinumConfig(platForm);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('vigilink-language', code);
    setLangOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === (i18n.language?.split('-')[0] || 'fr'));

  const aDesContacts = contacts.length > 0;
  const nbContacts   = contacts.length;

  return (
    <div className="flex flex-col gap-5 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">{t('settings.title')}</h2>
      </div>

      <button
        onClick={() => setView('contacts')}
        className={[
          'btn-3d flex items-center justify-between w-full rounded-2xl border px-5 py-5 transition-all',
          aDesContacts
            ? 'border-border bg-card hover:bg-muted'
            : 'border-red-300 bg-red-50 hover:bg-red-100',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          {aDesContacts
            ? <Phone size={22} className="text-green-600 shrink-0" />
            : <AlertTriangle size={22} className="text-[#c41e2a] shrink-0" />}
          <div className="flex flex-col items-start gap-1">
            <span className={`text-lg font-bold ${aDesContacts ? 'text-foreground' : 'text-[#c41e2a]'}`}>
              {t('settings.contactsShortcut')}
            </span>
            <span className="text-sm text-muted-foreground">
              {aDesContacts
                ? t('settings.contactsCount', { count: nbContacts })
                : t('settings.noContacts')}
            </span>
          </div>
        </div>
        <ChevronRight size={20} className="text-muted-foreground" />
      </button>

      <Accordion icon={<User size={16} />} title={t('settings.profile')} sectionKey="profile" openKey={openSection} onToggle={toggleSection}>
        <Field
          id="settings-nom"
          label={t('settings.nameLabel')}
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        />
        <PhoneField
          id="settings-telephone"
          label={t('settings.phoneLabel')}
          value={form.phone}
          onChange={(e164) => setForm((f) => ({ ...f, phone: e164 }))}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="settings-email" className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
            {t('settings.emailLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="settings-email"
              type="email"
              value={emailField}
              onChange={(e) => setEmailField(e.target.value)}
              placeholder={t('settings.emailPlaceholder')}
              className="flex-1 rounded-xl bg-card border border-border text-foreground text-base px-4 py-4 placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50"
            />
            <button
              onClick={() => {
                const email = emailField.trim();
                setUser({ email: email || undefined });
              }}
              className="btn-3d btn-3d-red px-5 py-4 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-all shrink-0"
            >
              {t('common.save')}
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('settings.emailDesc')}
          </p>
        </div>
      </Accordion>

      <Accordion icon={<Globe size={16} />} title={t('settings.language')} sectionKey="language" openKey={openSection} onToggle={toggleSection}>
        <p className="text-sm text-muted-foreground leading-relaxed">{t('settings.languageDesc')}</p>
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center justify-between w-full rounded-xl bg-card border border-border px-4 py-3 hover:bg-muted transition-all"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{currentLang?.flag ?? '🌐'}</span>
            <span className="text-sm text-foreground font-medium">{currentLang?.nativeName ?? i18n.language}</span>
          </div>
          <ChevronRight size={14} className={`text-muted-foreground transition-transform ${langOpen ? 'rotate-90' : ''}`} />
        </button>
        {langOpen && (
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={[
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors',
                  (i18n.language?.split('-')[0] || 'fr') === lang.code
                    ? 'bg-red-100 text-foreground'
                    : 'text-foreground hover:bg-muted',
                ].join(' ')}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{lang.nativeName}</span>
                  <span className="text-sm text-muted-foreground">{lang.name}</span>
                </div>
                {(i18n.language?.split('-')[0] || 'fr') === lang.code && (
                  <CheckCircle size={14} className="text-[#c41e2a] ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </Accordion>

      <Accordion icon={<Lock size={16} />} title={t('settings.changePassword')} sectionKey="password" openKey={openSection} onToggle={toggleSection}>
        <Field
          id="settings-pwd-current"
          label={t('settings.currentPassword')}
          type="password"
          value={pwdForm.current}
          onChange={(v) => setPwdForm((f) => ({ ...f, current: v }))}
        />
        <Field
          id="settings-pwd-nouveau"
          label={t('settings.newPassword')}
          type="password"
          value={pwdForm.nouveau}
          onChange={(v) => setPwdForm((f) => ({ ...f, nouveau: v }))}
        />
        <Field
          id="settings-pwd-confirm"
          label={t('settings.confirmPassword')}
          type="password"
          value={pwdForm.confirm}
          onChange={(v) => setPwdForm((f) => ({ ...f, confirm: v }))}
        />
        {pwdMsg && (
          <p className={`text-xs font-medium ${pwdMsg.type === 'ok' ? 'text-green-600' : 'text-[#c41e2a]'}`}>
            {pwdMsg.text}
          </p>
        )}
        <motion.button
          onClick={handleChangePassword}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all"
          whileTap={{ scale: 0.97 }}
        >
          {t('settings.changePassword')}
        </motion.button>
      </Accordion>

      <Accordion icon={<Shield size={16} />} title={t('settings.security')} sectionKey="codes" openKey={openSection} onToggle={toggleSection}>
        <SecurePinField
          id="settings-code-normal"
          label={t('settings.deactivationCode')}
          value={form.normalCode}
          onChange={(v) => setForm((f) => ({ ...f, normalCode: v }))}
          hint={t('settings.deactivationCodeDesc')}
          accentClass="border-red-500/50"
        />
        <div className="h-px bg-border" />
        <SecurePinField
          id="settings-code-contrainte"
          label={t('settings.duressCode')}
          value={form.duressCode}
          onChange={(v) => setForm((f) => ({ ...f, duressCode: v }))}
          hint={t('settings.duressCodeDesc')}
          accentClass="border-orange-500/50"
        />
        <div className="rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-[#c41e2a] leading-relaxed">
            {t('settings.duressCodeDesc')}
          </p>
        </div>
      </Accordion>

      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {notifPermission === 'granted'
            ? <Bell size={20} className="text-green-600 shrink-0" />
            : <BellOff size={20} className="text-muted-foreground shrink-0" />}
          <span className="text-base font-bold text-foreground">{t('settings.notifications')}</span>
        </div>
        {notifPermission === 'granted' ? (
          <span className="text-sm font-bold text-green-600 uppercase">{t('common.enabled')}</span>
        ) : notifPermission === 'denied' ? (
          <span className="text-sm font-bold text-[#c41e2a] uppercase">{t('common.refused')}</span>
        ) : (
          <button
            onClick={demanderNotifs}
            className="btn-3d btn-3d-red px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
          >
            {t('common.enable', 'Activer')}
          </button>
        )}
      </div>

      {isPlatinum && (
        <div className="rounded-2xl p-5 flex flex-col gap-4"
             style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown size={15} style={{ color: 'rgb(255,215,90)' }} />
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgb(255,215,90)' }}>
                {t('settings.platinum.title')}
              </h3>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                  style={{ background: 'rgba(212,175,55,0.2)', color: 'rgb(255,215,90)', border: '1px solid rgba(212,175,55,0.4)' }}>
              {t('common.active')}
            </span>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,215,90,0.6)' }}>
            {t('settings.platinum.customizeDesc')}
          </p>

          <div className="flex items-center justify-between rounded-xl p-3.5"
               style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.12)' }}>
            <div className="flex items-center gap-2.5">
              <Smartphone size={14} style={{ color: 'rgb(255,215,90)' }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{t('settings.platinum.shaker')}</span>
                <span className="text-sm" style={{ color: 'rgba(255,215,90,0.5)' }}>
                  {t('settings.platinum.shakerDesc')}
                </span>
              </div>
            </div>
            <Toggle checked={platForm.secoussesActif} onChange={(v) => updatePlat('secoussesActif', v)} colorClass="bg-yellow-500" />
          </div>

          <div className="flex items-center justify-between rounded-xl p-3.5"
               style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.12)' }}>
            <div className="flex items-center gap-2.5">
              <Shield size={14} style={{ color: 'rgb(255,215,90)' }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{t('settings.platinum.fallDetection')}</span>
                <span className="text-sm" style={{ color: 'rgba(255,215,90,0.5)' }}>
                  {t('settings.platinum.fallDesc')}
                </span>
              </div>
            </div>
            <Toggle checked={platForm.chuteActif} onChange={(v) => updatePlat('chuteActif', v)} colorClass="bg-yellow-500" />
          </div>

          <div className="flex flex-col gap-2 rounded-xl p-3.5"
               style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.12)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <EyeOff size={14} style={{ color: 'rgb(255,215,90)' }} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-foreground">{t('settings.platinum.discreetMode')}</span>
                            <span className="text-sm" style={{ color: 'rgba(255,215,90,0.5)' }}>
                    {t('settings.platinum.discreetDesc')}
                  </span>
                </div>
              </div>
              <Toggle checked={platForm.modeDiscret} onChange={(v) => updatePlat('modeDiscret', v)} colorClass="bg-yellow-500" />
            </div>
            {platForm.modeDiscret && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                   style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <EyeOff size={11} style={{ color: 'rgb(255,215,90)' }} />
                <span className="text-sm" style={{ color: 'rgba(255,215,90,0.7)' }}>
                  {t('settings.platinum.discreetActive')}
                </span>
              </div>
            )}
          </div>

          {!isGuest && (
            <button onClick={() => setView('sponsor')}
              className="flex items-center justify-between w-full rounded-xl p-3.5 transition-all"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.30)' }}>
              <div className="flex items-center gap-2.5">
                <Gift size={14} style={{ color: 'rgb(255,215,90)' }} />
                <div className="flex flex-col gap-0.5 items-start">
                  <span className="text-sm font-bold text-foreground">{t('settings.platinum.sponsorship')}</span>
                  <span className="text-sm" style={{ color: 'rgba(255,215,90,0.55)' }}>
                    {isSponsor ? t('settings.platinum.manageSponsor') : t('settings.platinum.generateCode')}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(255,215,90,0.5)' }} />
            </button>
          )}

          {isGuest && user.sponsorLink && (
            <div className="flex items-center gap-3 rounded-xl p-3.5"
                 style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.20)' }}>
              <UserCheck size={14} style={{ color: 'rgb(255,215,90)' }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{t('settings.platinum.guestPlatinum')}</span>
                <span className="text-sm" style={{ color: 'rgba(255,215,90,0.55)' }}>
                  {t('settings.platinum.sponsor')} : {user.sponsorLink.sponsorName}
                </span>
              </div>
            </div>
          )}

          <p className="text-sm text-center" style={{ color: 'rgba(255,215,90,0.4)' }}>
            {t('settings.platinum.savedOnAccount')}
          </p>
        </div>
      )}


      <div className="flex flex-col gap-2">
        {[
          { key: 'emergency-numbers',  icon: <Phone size={22} className="text-green-600" />,   label: t('emergencyNumbers.title'), pro: false },
          { key: 'medical',            icon: <Heart size={22} className="text-[#c41e2a]" />,    label: t('medical.title'),        pro: true },
          { key: 'qrcode',             icon: <QrCode size={22} className="text-[#c41e2a]" />,   label: t('qrcode.title'),         pro: true },
          { key: 'journal',            icon: <BookOpen size={22} className="text-[#c41e2a]" />,  label: t('journal.title'),        pro: true },
          { key: 'meeting',            icon: <Users size={22} className="text-[#c41e2a]" />,     label: t('meeting.title'),        pro: true },
          { key: 'travel',             icon: <Plane size={22} className="text-[#c41e2a]" />,     label: t('travel.title'),         pro: true },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setView(item.key as any)}
            className="flex items-center justify-between w-full rounded-2xl border border-border bg-card px-5 py-4 hover:bg-muted transition-all"
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="text-base font-bold text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.pro && !(isPro || isPlatinum) && <Lock size={16} className="text-muted-foreground" />}
              <ChevronRight size={20} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {(isPro || isPlatinum) && (
        <Accordion icon={<PhoneCall size={16} className="text-green-600" />} title={t('home.planTable.fakeCallTitle')} sectionKey="fakecall" openKey={openSection} onToggle={toggleSection}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('home.planTable.fakeCallDesc')}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('home.planTable.fakeCallCallerName')}</label>
            <input
              type="text"
              value={fakeCallConfig.callerName}
              onChange={(e) => setFakeCallConfig({ callerName: e.target.value })}
              placeholder={contacts[0]?.name || 'Ex: Maman'}
              className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={10} className="text-green-600" />
              {t('home.planTable.fakeCallCallerPhone')}
            </label>
            <PhoneField
              id="fakecall-caller-phone"
              value={fakeCallConfig.callerPhone}
              onChange={(e164) => setFakeCallConfig({ callerPhone: e164 })}
              accentClass="focus-within:border-green-500/50"
            />
            <span className="text-sm text-muted-foreground">{t('home.planTable.fakeCallPhoneHint')}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('home.planTable.fakeCallDelay')}</label>
            <input
              type="number"
              min={5}
              max={300}
              value={fakeCallConfig.delaySeconds}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 20;
                setFakeCallConfig({ delaySeconds: Math.max(5, Math.min(300, v)) });
              }}
              className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500/50 transition-colors"
            />
            <span className="text-sm text-muted-foreground">{t('home.planTable.fakeCallDelayHint')}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-300">
            <PhoneCall size={11} className="text-green-600 shrink-0" />
            <span className="text-sm text-green-600 leading-relaxed">
              {t('home.planTable.fakeCallInfo')}
            </span>
          </div>
        </Accordion>
      )}

      {(isPro || isPlatinum) && (
        <Accordion icon={<Brain size={16} className="text-blue-600" />} title="Mode Alzheimer" sectionKey="alzheimer" openKey={openSection} onToggle={toggleSection}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Activez ce mode pour les personnes atteintes d'Alzheimer. Le QR code affichera une page simplifiée avec un bouton d'appel direct au tuteur et la possibilité d'envoyer la position GPS.
          </p>

          <div className="flex items-center justify-between rounded-xl p-3.5 bg-card border border-border">
            <div className="flex items-center gap-2.5">
              <Brain size={14} className="text-blue-600" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">Activer le mode Alzheimer</span>
                <span className="text-sm text-muted-foreground">Page d'identification simplifiée</span>
              </div>
            </div>
            <Toggle checked={alzheimerMode.enabled} onChange={(v) => setAlzheimerMode({ enabled: v })} colorClass="bg-blue-500" />
          </div>

          {alzheimerMode.enabled && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nom affiché (sur la page publique)</label>
                <input
                  type="text"
                  value={alzheimerMode.displayName}
                  onChange={(e) => setAlzheimerMode({ displayName: e.target.value })}
                  placeholder={user.name || 'Nom de la personne'}
                  className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nom du tuteur / aidant</label>
                <input
                  type="text"
                  value={alzheimerMode.caregiverName}
                  onChange={(e) => setAlzheimerMode({ caregiverName: e.target.value })}
                  placeholder="Ex: Marie Tremblay"
                  className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={10} className="text-blue-600" />
                  Téléphone du tuteur
                </label>
                <PhoneField
                  id="alzheimer-caregiver-phone"
                  value={alzheimerMode.caregiverPhone}
                  onChange={(e164) => setAlzheimerMode({ caregiverPhone: e164 })}
                  accentClass="focus-within:border-blue-500/50"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl p-3.5 bg-card border border-border">
                <div className="flex items-center gap-2.5">
                  <EyeOff size={14} className="text-blue-600" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">Masquer l'adresse</span>
                    <span className="text-sm text-muted-foreground">Cache l'adresse exacte aux inconnus</span>
                  </div>
                </div>
                <Toggle checked={alzheimerMode.hideAddress} onChange={(v) => setAlzheimerMode({ hideAddress: v })} colorClass="bg-blue-500" />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-300">
                <Brain size={11} className="text-blue-600 shrink-0" />
                <span className="text-sm text-blue-600 leading-relaxed">
                  Un passant qui scanne le QR code verra le nom, un bouton pour appeler le tuteur, et pourra envoyer sa position GPS par SMS.
                </span>
              </div>
            </div>
          )}

          {isPlatinum ? (
            <button onClick={() => setView('alzheimer-sponsor')}
              className="flex items-center justify-between w-full rounded-xl p-3.5 transition-all"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="flex items-center gap-2.5">
                <Users size={14} className="text-blue-600" />
                <div className="flex flex-col gap-0.5 items-start">
                  <span className="text-sm font-bold text-foreground">{t('alzheimerSponsor.title')}</span>
                  <span className="text-xs text-blue-400/60">{t('alzheimerSponsor.subtitle')}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-blue-400/50" />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-300">
              <Crown size={11} className="text-purple-600 shrink-0" />
              <span className="text-xs text-purple-600 leading-relaxed">
                {t('alzheimerSponsor.title')} — Platinum
              </span>
            </div>
          )}
        </Accordion>
      )}

      <button onClick={() => setView('legal')}
        className="flex items-center justify-between w-full rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-muted transition-all">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('legal.terms')}</span>
        </div>
        {user.termsAcceptedAt && (
          <span className="text-sm text-muted-foreground shrink-0">
            {new Date(user.termsAcceptedAt).toLocaleDateString(i18n.language)}
          </span>
        )}
      </button>


      <DevPlanSwitcher />

      <button onClick={() => setView('support' as any)}
        className="flex items-center justify-between w-full rounded-2xl border border-border bg-card px-5 py-4 hover:bg-muted transition-all"
      >
        <div className="flex items-center gap-3">
          <HelpCircle size={22} className={isPlatinum ? 'text-yellow-600' : 'text-[#c41e2a]'} />
          <span className="text-base font-bold text-foreground">{t('settings.helpTitle')}</span>
        </div>
        <ChevronRight size={20} className="text-muted-foreground" />
      </button>

      <motion.button onClick={handleSave}
        className={['btn-3d flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg tracking-wide transition-all', saved ? 'btn-3d-green text-white' : 'btn-3d-red text-white'].join(' ')}
        whileTap={{ scale: 0.97 }}>
        {saved ? <><CheckCircle size={22} /> {t('common.saved')}</> : t('common.save')}
      </motion.button>

      {(isPro || isPlatinum) && !isGuest && (
        <SubscriptionManager
          isPlatinum={isPlatinum}
          onCancel={() => { setUser({ subscription: 'free' }); useAuthStore.getState().changerPlan('free'); }}
          onDowngrade={() => { setUser({ subscription: 'pro' }); useAuthStore.getState().changerPlan('pro'); }}
        />
      )}

      <motion.button onClick={handleLogout}
        className="btn-3d btn-3d-slate flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg text-foreground tracking-wide transition-all"
        whileTap={{ scale: 0.97 }}>
        <LogOut size={22} className="shrink-0" />
        {t('common.logout')}
      </motion.button>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {t('settings.dataDisclaimer')}
        </p>
      </div>
    </div>
  );
};

const SubscriptionManager: React.FC<{
  isPlatinum: boolean;
  onCancel: () => void;
  onDowngrade: () => void;
}> = ({ isPlatinum, onCancel, onDowngrade }) => {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState<'cancel' | 'downgrade' | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CreditCard size={18} className="text-muted-foreground" />
        <span className="text-base font-bold text-foreground">{t('settings.subscription.title')}</span>
      </div>
      <div className="flex items-center gap-2">
        <Crown size={14} className={isPlatinum ? 'text-yellow-600' : 'text-green-600'} />
        <span className={`text-sm font-bold ${isPlatinum ? 'text-yellow-600' : 'text-green-600'}`}>
          {isPlatinum ? t('upgrade.platinumActive') : t('upgrade.proActive')}
        </span>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-300 bg-green-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-xs text-green-600 font-bold">{done}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!showConfirm && (
        <div className="flex flex-col gap-2">
          {isPlatinum && (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setShowConfirm('downgrade')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-600 font-bold text-sm">
              <ArrowDownCircle size={16} /> {t('upgrade.downgradeToProTitle')}
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => setShowConfirm('cancel')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-[#c41e2a] font-bold text-sm">
            <XOctagon size={16} /> {t('upgrade.cancelSubscription')}
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {showConfirm === 'cancel' && (
          <motion.div className="flex flex-col gap-3 p-3 rounded-xl border border-red-200 bg-red-50"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#c41e2a]" />
              <span className="text-sm font-bold text-[#c41e2a]">{t('upgrade.cancelSubscription')}</span>
            </div>
            <p className="text-xs text-red-600/60 leading-relaxed">{t('upgrade.cancelConfirm')}</p>
            <div className="flex gap-2">
              <button onClick={() => { onCancel(); setShowConfirm(null); setDone(t('upgrade.cancelSuccess')); setTimeout(() => setDone(null), 5000); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">
                {t('common.confirm')}
              </button>
              <button onClick={() => setShowConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-bold">
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        )}
        {showConfirm === 'downgrade' && (
          <motion.div className="flex flex-col gap-3 p-3 rounded-xl border border-yellow-300 bg-yellow-50"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-600" />
              <span className="text-sm font-bold text-yellow-600">{t('upgrade.downgradeToProTitle')}</span>
            </div>
            <p className="text-xs text-yellow-600/60 leading-relaxed">{t('upgrade.downgradeToProDesc')}</p>
            <div className="flex gap-2">
              <button onClick={() => { onDowngrade(); setShowConfirm(null); setDone(t('upgrade.downgradeSuccess')); setTimeout(() => setDone(null), 5000); }}
                className="flex-1 py-2.5 rounded-xl bg-yellow-600 text-white text-sm font-bold">
                {t('common.confirm')}
              </button>
              <button onClick={() => setShowConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-bold">
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
