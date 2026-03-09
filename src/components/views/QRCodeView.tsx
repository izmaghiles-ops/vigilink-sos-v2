import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, QrCode, Download, Lock, Shield, FileText, Brain } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { apiUrl } from '../../lib/apiBase';
import QRCode from 'qrcode';

function buildEmergencyHTML(data: {
  name: string;
  phone: string;
  contacts: { name: string; phone: string }[];
  medical?: { bloodType?: string; allergies?: string[]; medications?: string[]; conditions?: string[]; notes?: string };
  meeting?: { person?: string; phone?: string; location?: string; dateTime?: string; notes?: string };
  journal?: { date: string; title: string; description: string }[];
  qrDataUrl: string;
  profileUrl: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const contactRows = data.contacts.map(c =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(c.name)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee"><a href="tel:${esc(c.phone)}" style="color:#dc2626;font-weight:700">${esc(c.phone)}</a></td></tr>`
  ).join('');

  let medicalSection = '';
  if (data.medical) {
    const m = data.medical;
    const rows: string[] = [];
    if (m.bloodType) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Blood Type</td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#dc2626;font-weight:700;font-size:18px">${esc(m.bloodType)}</td></tr>`);
    if (m.allergies?.length) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Allergies</td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#c00">${m.allergies.map(esc).join(', ')}</td></tr>`);
    if (m.medications?.length) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Medications</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${m.medications.map(esc).join(', ')}</td></tr>`);
    if (m.conditions?.length) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Conditions</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${m.conditions.map(esc).join(', ')}</td></tr>`);
    if (m.notes) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Notes</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(m.notes)}</td></tr>`);
    if (rows.length) {
      medicalSection = `<div style="margin-top:24px"><h2 style="color:#dc2626;font-size:16px;margin:0 0 12px;border-bottom:2px solid #dc2626;padding-bottom:6px">Medical Profile</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.join('')}</table></div>`;
    }
  }

  let meetingSection = '';
  if (data.meeting) {
    const mt = data.meeting;
    const rows: string[] = [];
    if (mt.person) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Person</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(mt.person)}</td></tr>`);
    if (mt.phone) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Phone</td><td style="padding:6px 12px;border-bottom:1px solid #eee"><a href="tel:${esc(mt.phone)}" style="color:#dc2626">${esc(mt.phone)}</a></td></tr>`);
    if (mt.location) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Location</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(mt.location)}</td></tr>`);
    if (mt.dateTime) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Date/Time</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(mt.dateTime)}</td></tr>`);
    if (mt.notes) rows.push(`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">Notes</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(mt.notes)}</td></tr>`);
    if (rows.length) {
      meetingSection = `<div style="margin-top:24px"><h2 style="color:#f59e0b;font-size:16px;margin:0 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px">Meeting Information</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.join('')}</table></div>`;
    }
  }

  let journalSection = '';
  if (data.journal?.length) {
    const entries = data.journal.map(e =>
      `<div style="padding:8px 12px;border-bottom:1px solid #eee"><strong>${esc(e.date)}</strong> — ${esc(e.title)}<br><span style="color:#666;font-size:12px">${esc(e.description)}</span></div>`
    ).join('');
    journalSection = `<div style="margin-top:24px"><h2 style="color:#6b7280;font-size:16px;margin:0 0 12px;border-bottom:2px solid #6b7280;padding-bottom:6px">Incident Journal</h2>${entries}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emergency Profile — ${esc(data.name)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;color:#1a1a1a;padding:20px}
.card{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}
.header{background:#dc2626;color:#fff;padding:20px;text-align:center}
.header h1{font-size:20px;margin-bottom:4px}
.header p{font-size:13px;opacity:.85}
.body{padding:20px}
.qr{text-align:center;margin-bottom:20px}
.qr img{width:200px;height:200px;border:4px solid #dc2626;border-radius:12px}
@media print{body{padding:0;background:#fff}.card{box-shadow:none;max-width:100%}}</style></head>
<body>
<div class="card">
<div class="header"><h1>EMERGENCY PROFILE</h1><p>Vigilink-SOS</p></div>
<div class="body">
<div class="qr"><img src="${data.qrDataUrl}" alt="QR Code"/><p style="font-size:10px;color:#999;margin-top:6px">Scan to view online profile: ${esc(data.profileUrl)}</p></div>
<div style="margin-bottom:16px"><h2 style="font-size:16px;margin-bottom:4px">${esc(data.name)}</h2><p style="font-size:14px;color:#666"><a href="tel:${esc(data.phone)}" style="color:#dc2626">${esc(data.phone)}</a></p></div>
<div><h2 style="color:#dc2626;font-size:16px;margin:0 0 12px;border-bottom:2px solid #dc2626;padding-bottom:6px">Emergency Contacts</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="background:#f0f0f0"><th style="padding:8px 12px;text-align:left">Name</th><th style="padding:8px 12px;text-align:left">Phone</th></tr>${contactRows}</table></div>
${medicalSection}${meetingSection}${journalSection}
<div style="margin-top:24px;padding-top:12px;border-top:2px solid #eee;text-align:center;font-size:10px;color:#999">Generated by Vigilink-SOS — ${new Date().toLocaleDateString()}</div>
</div></div></body></html>`;
}

async function saveProfileToServer(profileId: string, data: any) {
  try {
    const endpoint = apiUrl('/api/profile/save');
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    console.log('[QR] Profile saved to server:', profileId);
  } catch (err) {
    console.warn('[QR] Failed to save profile:', err);
  }
}

export const QRCodeView: React.FC = () => {
  const { t } = useTranslation();
  const { user, contacts, medicalProfile, meetingMode, journalEntries, alzheimerMode, setView } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const isPro = user.subscription === 'pro' || user.subscription === 'platinum' || user.subscription === 'trial';
  const profileId = user.profileId || 'unknown';
  const profileUrl = `https://vigilink-sos.replit.app/profile/${profileId}`;

  useEffect(() => {
    if (!isPro || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, profileUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1a2e4a', light: '#edf1f7' },
      errorCorrectionLevel: 'M',
    }).then(() => {
      setGenerated(true);
      setQrDataUrl(canvasRef.current!.toDataURL('image/png'));
    }).catch(() => {});

    saveProfileToServer(profileId, {
      profileId,
      name: user.name,
      phone: user.phone,
      contacts: contacts.map(c => ({ name: c.name, phone: c.phone })),
      medicalProfile,
      alzheimerMode,
      meetingMode,
    }).then(() => setProfileSaved(true));
  }, [isPro, user, contacts, medicalProfile, meetingMode, alzheimerMode, profileId]);

  const handleDownloadFile = () => {
    const htmlData = buildEmergencyHTML({
      name: user.name,
      phone: user.phone,
      contacts: contacts.map((c) => ({ name: c.name, phone: c.phone })),
      medical: (medicalProfile.bloodType || medicalProfile.allergies.length || medicalProfile.medications.length || medicalProfile.conditions.length)
        ? {
            bloodType: medicalProfile.bloodType || undefined,
            allergies: medicalProfile.allergies.length ? medicalProfile.allergies : undefined,
            medications: medicalProfile.medications.length ? medicalProfile.medications : undefined,
            conditions: medicalProfile.conditions.length ? medicalProfile.conditions : undefined,
            notes: medicalProfile.emergencyNotes || undefined,
          }
        : undefined,
      meeting: meetingMode.active
        ? {
            person: meetingMode.personName,
            phone: meetingMode.personPhone,
            location: meetingMode.location,
            dateTime: meetingMode.dateTime,
            notes: meetingMode.notes,
          }
        : undefined,
      journal: journalEntries.length > 0
        ? journalEntries.slice(0, 5).map((e) => ({
            date: e.date,
            title: e.title,
            description: e.description.substring(0, 200),
          }))
        : undefined,
      qrDataUrl,
      profileUrl,
    });

    const blob = new Blob([htmlData], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `vigilink-emergency-${user.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isPro) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-5">
        <button onClick={() => setView('settings')} className="flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowLeft size={18} /> <span className="text-sm">{t('common.back')}</span>
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Lock size={40} className="text-muted-foreground" />
          <p className="text-muted-foreground text-sm text-center">{t('qrcode.proOnly')}</p>
          <button onClick={() => setView('upgrade')} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">
            {t('upgrade.upgrade')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background p-5 pb-24">
      <button onClick={() => setView('settings')} className="flex items-center gap-2 text-muted-foreground mb-4">
        <ArrowLeft size={18} /> <span className="text-sm">{t('common.back')}</span>
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center">
          <QrCode size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t('qrcode.title')}</h1>
          <p className="text-[11px] text-muted-foreground">{t('qrcode.description')}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <div className="p-4 rounded-2xl border border-border bg-card">
          <canvas ref={canvasRef} />
        </div>

        {generated && (
          <>
            <p className="text-[10px] text-muted-foreground text-center">{t('qrcode.scanInfo')}</p>
            <p className="text-[9px] text-blue-600 text-center break-all px-4">{profileUrl}</p>
            {profileSaved && (
              <p className="text-[9px] text-green-600 text-center">Profil synchronisé avec le serveur</p>
            )}
            {alzheimerMode.enabled && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-300">
                <Brain size={14} className="text-blue-600" />
                <span className="text-[10px] text-blue-700">Mode Alzheimer actif</span>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={handleDownloadFile}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-bold w-full"
          >
            <FileText size={16} />
            {t('qrcode.download')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <Shield size={12} className="inline mr-1" />
            {t('qrcode.contacts')}
          </h3>
          {contacts.length > 0 ? (
            <div className="flex flex-col gap-1">
              {contacts.map((c) => (
                <p key={c.id} className="text-sm text-foreground">{c.name} — {c.phone}</p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        {(medicalProfile.bloodType || medicalProfile.allergies.length > 0) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('qrcode.medicalInfo')}
            </h3>
            {medicalProfile.bloodType && (
              <p className="text-sm text-foreground">{t('medical.bloodType')}: {medicalProfile.bloodType}</p>
            )}
            {medicalProfile.allergies.length > 0 && (
              <p className="text-sm text-foreground">{t('medical.allergies')}: {medicalProfile.allergies.join(', ')}</p>
            )}
            {medicalProfile.medications.length > 0 && (
              <p className="text-sm text-foreground">{t('medical.medications')}: {medicalProfile.medications.join(', ')}</p>
            )}
            {medicalProfile.conditions.length > 0 && (
              <p className="text-sm text-foreground">{t('medical.conditions')}: {medicalProfile.conditions.join(', ')}</p>
            )}
          </div>
        )}

        {meetingMode.active && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
              {t('qrcode.meetingInfo')}
            </h3>
            <p className="text-sm text-foreground">{meetingMode.personName} — {meetingMode.personPhone}</p>
            {meetingMode.location && <p className="text-sm text-foreground">{meetingMode.location}</p>}
            {meetingMode.notes && <p className="text-sm text-muted-foreground italic">{meetingMode.notes}</p>}
          </div>
        )}

        {journalEntries.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('qrcode.journalSummary')} ({journalEntries.length})
            </h3>
            {journalEntries.slice(0, 3).map((e) => (
              <p key={e.id} className="text-sm text-foreground">{e.date} — {e.title}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
