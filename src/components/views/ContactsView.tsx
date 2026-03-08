import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Phone, Star, RefreshCw, Pencil, CheckCircle, X, Lock, Crown, Zap, Shield, UserCheck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  fetchContacts,
  addContact as apiAddContact,
  deleteContact,
  normalisePhone,
} from '../../lib/api';
import { EmergencyContact, ContactPriority, SubscriptionPlan } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { PhoneField } from '../PhoneField';
import { useTranslation } from 'react-i18next';

const MAX_CONTACTS: Record<SubscriptionPlan, number> = {
  free:     1,
  trial:    3,
  pro:      5,
  platinum: 10,
};

function maxContactsPourPlan(plan: SubscriptionPlan): number {
  return MAX_CONTACTS[plan] ?? 1;
}

const PRIORITES: ContactPriority[] = ['primary', 'secondary', 'tertiary'];

const STYLE_PRIORITE: Record<ContactPriority, string> = {
  primary:   'text-red-400 border-red-500/40 bg-red-500/10',
  secondary: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  tertiary:  'text-gray-400 border-gray-500/40 bg-gray-500/10',
};

const PRIORITY_KEYS: Record<ContactPriority, string> = {
  primary:   'contacts.primary',
  secondary: 'contacts.secondary',
  tertiary:  'contacts.tertiary',
};

const formulaireVide = () => ({
  name:         '',
  phone:        '',
  email:        '',
  relationship: '',
  priority:     'primary' as ContactPriority,
});



const ToastConfirmation: React.FC<{ message: string }> = ({ message }) => (
  <motion.div
    className="flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-950/30 px-4 py-2.5 text-xs font-semibold text-green-400"
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
  >
    <CheckCircle size={13} className="shrink-0" />
    {message}
  </motion.div>
);

interface FormulaireContactProps {
  initial:   ReturnType<typeof formulaireVide>;
  estEdition?: boolean;
  onSubmit:  (data: ReturnType<typeof formulaireVide>) => Promise<void>;
  onAnnuler: () => void;
  saving:    boolean;
}

const FormulaireContact: React.FC<FormulaireContactProps> = ({
  initial, estEdition, onSubmit, onAnnuler, saving,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);

  const champ = (cle: keyof typeof form, type = 'text', placeholder = '') => (
    <input
      key={String(cle)}
      type={type}
      placeholder={placeholder}
      value={String(form[cle])}
      onChange={(e) => setForm((f) => ({ ...f, [cle]: e.target.value }))}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
    />
  );

  const peutSauvegarder = form.name.trim().length > 0 && form.phone.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {champ('name',         'text',  t('contacts.namePlaceholder'))}
      <PhoneField
        id="contact-phone"
        value={form.phone}
        onChange={(e164) => setForm((f) => ({ ...f, phone: e164 }))}
      />
      {champ('email',        'email', t('contacts.emailPlaceholder'))}
      {champ('relationship', 'text',  t('contacts.relationshipHint'))}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onAnnuler}
          className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm font-bold hover:bg-white/10 transition-all"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(form)}
          disabled={saving || !peutSauvegarder}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-bold transition-all"
        >
          {saving ? '…' : estEdition ? t('common.save') : t('contacts.addButton')}
        </button>
      </div>
    </div>
  );
};

const CarteVerrouillee: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      className="rounded-2xl border border-dashed border-white/15 bg-white/3 p-5 flex flex-col items-center gap-3 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="w-11 h-11 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center">
        <Lock size={18} className="text-red-400/70" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-white/80">
          {t('contacts.limitTitle')}
        </p>
        <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]"
           dangerouslySetInnerHTML={{ __html: t('contacts.limitDesc') }} />
      </div>

      <div className="w-full grid grid-cols-2 gap-2 mt-1">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/15 px-3 py-2.5 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Zap size={10} className="text-yellow-400" />
            <span className="text-sm font-black text-yellow-400 uppercase tracking-widest">{t('common.pro')}</span>
          </div>
          <span className="text-xs font-bold text-white">{t('contacts.proContacts')}</span>
          <span className="text-sm text-gray-500">{t('contacts.multiRecipients')}</span>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-3 py-2.5 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Crown size={10} className="text-amber-300" />
            <span className="text-sm font-black text-amber-300 uppercase tracking-widest">{t('common.platinum')}</span>
          </div>
          <span className="text-xs font-bold text-white">{t('contacts.platinumContacts')}</span>
          <span className="text-sm text-gray-500">{t('contacts.familyPackComplete')}</span>
        </div>
      </div>

      <button
        onClick={onUpgrade}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white text-sm font-black tracking-wide transition-all shadow-lg shadow-yellow-900/30"
      >
        {t('contacts.unlockMore')}
      </button>
    </motion.div>
  );
};

export const ContactsView: React.FC = () => {
  const { t } = useTranslation();
  const { contacts, setContacts, addContact, removeContact, user, setView } = useAppStore();

  const plan        = user.subscription;
  const estGratuit  = plan === 'free';
  const isGuest     = user.sponsorRole === 'guest';

  const maxContacts = isGuest ? 2 : maxContactsPourPlan(plan);

  const peutAjouter = contacts.length < maxContacts;
  const limiteGratuitAtteinte = estGratuit && contacts.length >= 1;

  const estContactParrain = (id: string) => isGuest && id === 'sponsor-contact';

  const [chargement,   setChargement]   = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [enEdition,    setEnEdition]    = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);

  const afficherToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const chargerContacts = async () => {
    setChargement(true);
    try {
      const data = await fetchContacts();
      if (data.length > 0) setContacts(data);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { chargerContacts(); }, []);

  const handleAjouter = async (form: ReturnType<typeof formulaireVide>) => {
    if (contacts.length >= maxContacts) {
      afficherToast(t('contacts.limitReachedToast'));
      return;
    }
    setSaving(true);
    const contact: EmergencyContact = {
      id:        uuidv4(),
      ...form,
      phone:     normalisePhone(form.phone),
      createdAt: new Date().toISOString(),
    };
    try {
      await apiAddContact({ ...form, phone: normalisePhone(form.phone) });
    } catch {
    }
    addContact(contact);
    setAfficherForm(false);
    afficherToast(t('contacts.addedSuccess'));
    setSaving(false);
  };

  const handleModifier = async (id: string, form: ReturnType<typeof formulaireVide>) => {
    setSaving(true);
    const updatedContact = { ...form, phone: normalisePhone(form.phone) };
    setContacts(
      contacts.map((c) =>
        c.id === id ? { ...c, ...updatedContact } : c
      )
    );
    try {
      await apiAddContact({ id, ...updatedContact });
    } catch {}
    setEnEdition(null);
    afficherToast(t('contacts.updated'));
    setSaving(false);
  };

  const handleSupprimer = async (c: EmergencyContact) => {
    if (estContactParrain(c.id)) return;
    removeContact(c.id);
    if ((c as any).taskadeNodeId) {
      try { await deleteContact((c as any).taskadeNodeId); } catch {}
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">

      <AnimatePresence>
        {toast && <ToastConfirmation key="toast" message={toast} />}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{t('contacts.title')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={chargerContacts}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={chargement ? 'animate-spin' : ''} />
          </button>
          {peutAjouter && !limiteGratuitAtteinte && (
            <button
              onClick={() => { setAfficherForm((p) => !p); setEnEdition(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all"
            >
              <Plus size={14} />
              {t('contacts.addButton')}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          {t('contacts.contactsCountLabel', { current: contacts.length, max: maxContacts })}
        </span>
        {estGratuit && (
          <span className="text-sm font-bold text-red-400/70 uppercase tracking-widest">
            {t('contacts.freePlan')}
          </span>
        )}
        {isGuest && (
          <span className="text-sm font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,215,90,0.65)' }}>
            {t('contacts.guestPlatinum')}
          </span>
        )}
      </div>

      {isGuest && user.sponsorLink && (
        <motion.div
          className="rounded-2xl p-3.5 flex items-start gap-3"
          style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.18)',
          }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <UserCheck size={14} style={{ color: 'rgb(255,215,90)' }} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold" style={{ color: 'rgb(255,215,90)' }}>
              {t('contacts.guestOf', { name: user.sponsorLink.sponsorName })}
            </span>
            <span className="text-sm" style={{ color: 'rgba(255,215,90,0.5)' }}>
              {t('contacts.guestLocked')}
            </span>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {afficherForm && (
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          >
            <h3 className="text-sm font-bold text-white">{t('contacts.newContact')}</h3>
            <FormulaireContact
              initial={formulaireVide()}
              onSubmit={handleAjouter}
              onAnnuler={() => setAfficherForm(false)}
              saving={saving}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {contacts.map((c, i) => (
            <motion.div
              key={c.id}
              className="rounded-2xl border border-white/10 bg-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-500/20 flex items-center justify-center shrink-0">
                  <span className="text-base font-black text-red-400">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{c.name}</span>
                    <Star size={10} className="text-red-400 shrink-0" />
                  </div>
                      <span className="text-xs text-gray-500">{c.phone || t('contacts.noNumber')}</span>
                  {c.relationship ? (
                    <span className="text-xs text-gray-600 ml-2">· {c.relationship}</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {estContactParrain(c.id) ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full border"
                         style={{ borderColor: 'rgba(212,175,55,0.35)', background: 'rgba(212,175,55,0.08)' }}>
                      <Lock size={9} style={{ color: 'rgb(255,215,90)' }} />
                      <span className="text-sm font-black" style={{ color: 'rgb(255,215,90)' }}>
                        {t('contacts.sponsorLabel')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className={`hidden sm:inline text-sm font-bold border rounded-full px-2 py-0.5 ${STYLE_PRIORITE[c.priority]}`}>
                        {t(PRIORITY_KEYS[c.priority])}
                      </span>
                      <button
                        onClick={() => setEnEdition(enEdition === c.id ? null : c.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                      >
                        {enEdition === c.id ? <X size={13} /> : <Pencil size={13} />}
                      </button>
                      <button
                        onClick={() => handleSupprimer(c)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {enEdition === c.id && !estContactParrain(c.id) && (
                  <motion.div
                    className="border-t border-white/10 px-4 pb-4 pt-3 flex flex-col gap-3 bg-white/3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  >
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
                      {t('contacts.editContact')}
                    </p>
                    <FormulaireContact
                      initial={{
                        name:         c.name,
                        phone:        c.phone,
                        email:        (c as any).email || '',
                        relationship: c.relationship || '',
                        priority:     c.priority,
                      }}
                      estEdition
                      onSubmit={(form) => handleModifier(c.id, form)}
                      onAnnuler={() => setEnEdition(null)}
                      saving={saving}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {contacts.length === 0 && !chargement && (
          <div className="text-center py-10 text-gray-600 text-sm">
            {t('contacts.emptyHelp')}
          </div>
        )}
      </div>

      <AnimatePresence>
        {limiteGratuitAtteinte && (
          <CarteVerrouillee key="verrou" onUpgrade={() => setView('upgrade')} />
        )}
      </AnimatePresence>
    </div>
  );
};
