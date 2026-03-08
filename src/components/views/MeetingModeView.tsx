import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ArrowLeft, Calendar, MapPin, Phone, AlertTriangle, Lock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { MEETING_MODE_DEFAULT } from '../../types';

export function MeetingModeView() {
  const { t } = useTranslation();
  const { user, meetingMode, setMeetingMode, setView } = useAppStore();
  const isPro = user.subscription === 'pro' || user.subscription === 'platinum' || user.subscription === 'trial';

  const [personName, setPersonName] = useState(meetingMode.personName);
  const [personPhone, setPersonPhone] = useState(meetingMode.personPhone);
  const [location, setLocation] = useState(meetingMode.location);
  const [dateTime, setDateTime] = useState(meetingMode.dateTime);
  const [notes, setNotes] = useState(meetingMode.notes);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPersonName(meetingMode.personName);
    setPersonPhone(meetingMode.personPhone);
    setLocation(meetingMode.location);
    setDateTime(meetingMode.dateTime);
    setNotes(meetingMode.notes);
  }, [meetingMode]);

  const handleActivate = () => {
    setMeetingMode({ active: true });
  };

  const handleDeactivate = () => {
    setMeetingMode({ ...MEETING_MODE_DEFAULT });
    setPersonName('');
    setPersonPhone('');
    setLocation('');
    setDateTime('');
    setNotes('');
  };

  const handleSave = () => {
    setMeetingMode({ personName, personPhone, location, dateTime, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <button
          onClick={() => setView('settings')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
            <Users size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('meeting.title')}</h1>
            <p className="text-sm text-gray-400">{t('meeting.description')}</p>
          </div>
        </div>

        {!isPro ? (
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 text-center space-y-4">
            <Lock size={40} className="text-gray-500 mx-auto" />
            <p className="text-gray-400">{t('meeting.proOnly')}</p>
            <button
              onClick={() => setView('upgrade')}
              className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-colors"
            >
              {t('upgrade.upgrade')}
            </button>
          </div>
        ) : (
          <>
            {meetingMode.active && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3">
                <AlertTriangle size={18} className="text-red-400" />
                <span className="text-red-300 font-semibold text-sm">{t('meeting.active')}</span>
              </div>
            )}

            {!meetingMode.active ? (
              <button
                onClick={handleActivate}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
              >
                {t('meeting.activate')}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Users size={14} />
                    {t('meeting.personName')}
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Phone size={14} />
                    {t('meeting.personPhone')}
                  </label>
                  <input
                    type="text"
                    value={personPhone}
                    onChange={(e) => setPersonPhone(e.target.value)}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <MapPin size={14} />
                    {t('meeting.location')}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Calendar size={14} />
                    {t('meeting.dateTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {t('meeting.notes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={t('meeting.notes')}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {saved && (
                  <div className="text-green-400 text-sm text-center font-medium">
                    {t('meeting.saved')}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
                >
                  {t('common.save')}
                </button>

                <button
                  onClick={handleDeactivate}
                  className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl transition-colors"
                >
                  {t('meeting.deactivate')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
