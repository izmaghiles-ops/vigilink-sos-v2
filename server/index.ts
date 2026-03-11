import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pg from 'pg';
import { getTwilioClient, getTwilioFromPhoneNumber } from './twilioClient.js';
import { getUncachableStripeClient, getStripePublishableKey } from './stripeClient.js';
import OpenAI from 'openai';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const evidenceDir = path.join(__dirname, '..', 'evidence');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

const evidenceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, evidenceDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = file.originalname.split('.').pop() || 'webm';
    cb(null, `evidence-${ts}.${ext}`);
  },
});
const upload = multer({ storage: evidenceStorage, limits: { fileSize: 50 * 1024 * 1024 } });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SMS_STRINGS: Record<string, {
  alert: string; followup: string; user: string; unknown: string;
  callBack: string; time: string; position: string;
  positionApprox: string; positionUnknown: string; audioRecording: string; alertId: string;
}> = {
  fr: {
    alert: '🆘 ALERTE VIGILINK-SOS',
    followup: '🔊 SUIVI ALERTE — Vigilink-SOS',
    user: 'Utilisateur',
    unknown: 'Inconnu',
    callBack: '📞 Rappeler au',
    time: 'Heure',
    position: '📍 Position',
    positionApprox: '📍 Position approximative (GPS désactivé)',
    positionUnknown: '📍 Position : inconnue',
    audioRecording: '🎙️ Enregistrement audio (30s)',
    alertId: 'Alerte ID',
  },
  en: {
    alert: '🆘 VIGILINK-SOS ALERT',
    followup: '🔊 ALERT FOLLOW-UP — Vigilink-SOS',
    user: 'User',
    unknown: 'Unknown',
    callBack: '📞 Call back at',
    time: 'Time',
    position: '📍 Location',
    positionApprox: '📍 Approximate location (GPS off)',
    positionUnknown: '📍 Location: unknown',
    audioRecording: '🎙️ Audio recording (30s)',
    alertId: 'Alert ID',
  },
  es: {
    alert: '🆘 ALERTA VIGILINK-SOS',
    followup: '🔊 SEGUIMIENTO ALERTA — Vigilink-SOS',
    user: 'Usuario',
    unknown: 'Desconocido',
    callBack: '📞 Devolver llamada al',
    time: 'Hora',
    position: '📍 Ubicación',
    positionApprox: '📍 Ubicación aproximada (GPS desactivado)',
    positionUnknown: '📍 Ubicación: desconocida',
    audioRecording: '🎙️ Grabación de audio (30s)',
    alertId: 'ID de alerta',
  },
  ar: {
    alert: '🆘 تنبيه VIGILINK-SOS',
    followup: '🔊 متابعة التنبيه — Vigilink-SOS',
    user: 'المستخدم',
    unknown: 'غير معروف',
    callBack: '📞 إعادة الاتصال على',
    time: 'الوقت',
    position: '📍 الموقع',
    positionApprox: '📍 موقع تقريبي (GPS معطل)',
    positionUnknown: '📍 الموقع: غير معروف',
    audioRecording: '🎙️ تسجيل صوتي (30 ثانية)',
    alertId: 'معرّف التنبيه',
  },
  de: {
    alert: '🆘 VIGILINK-SOS ALARM',
    followup: '🔊 ALARM-NACHVERFOLGUNG — Vigilink-SOS',
    user: 'Benutzer',
    unknown: 'Unbekannt',
    callBack: '📞 Rückruf an',
    time: 'Zeit',
    position: '📍 Standort',
    positionApprox: '📍 Ungefährer Standort (GPS aus)',
    positionUnknown: '📍 Standort: unbekannt',
    audioRecording: '🎙️ Audioaufnahme (30s)',
    alertId: 'Alarm-ID',
  },
  pt: {
    alert: '🆘 ALERTA VIGILINK-SOS',
    followup: '🔊 ACOMPANHAMENTO DE ALERTA — Vigilink-SOS',
    user: 'Usuário',
    unknown: 'Desconhecido',
    callBack: '📞 Ligar de volta para',
    time: 'Hora',
    position: '📍 Localização',
    positionApprox: '📍 Localização aproximada (GPS desativado)',
    positionUnknown: '📍 Localização: desconhecida',
    audioRecording: '🎙️ Gravação de áudio (30s)',
    alertId: 'ID do alerta',
  },
};

function getSmsStrings(lang?: string) {
  if (!lang) return SMS_STRINGS.fr;
  const base = lang.toLowerCase().split('-')[0];
  return SMS_STRINGS[base] || SMS_STRINGS.en;
}

const emergencyProfiles = new Map<string, { data: any; createdAt: number }>();
const publicProfiles = new Map<string, { data: any; updatedAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of emergencyProfiles) {
    if (now - entry.createdAt > 24 * 60 * 60 * 1000) emergencyProfiles.delete(id);
  }
}, 60 * 60 * 1000);

app.get('/emergency-profile/:id', (req, res) => {
  const entry = emergencyProfiles.get(req.params.id);
  if (!entry) return res.status(404).send('<html><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:40px;text-align:center"><h1>Profil expiré</h1><p>Ce lien d\'urgence a expiré (24h).</p></body></html>');
  const d = entry.data;
  const meetHtml = d.meetingMode?.active ? `
    <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:12px 0">
      <h3 style="color:#f59e0b;margin:0 0 8px">📋 Rendez-vous actif</h3>
      ${d.meetingMode.personName ? `<p>👤 Personne : <strong>${d.meetingMode.personName}</strong></p>` : ''}
      ${d.meetingMode.personPhone ? `<p>📞 Tél : <strong>${d.meetingMode.personPhone}</strong></p>` : ''}
      ${d.meetingMode.location ? `<p>📍 Lieu : <strong>${d.meetingMode.location}</strong></p>` : ''}
      ${d.meetingMode.dateTime ? `<p>🕐 Heure : ${d.meetingMode.dateTime}</p>` : ''}
      ${d.meetingMode.notes ? `<p>📝 Notes : ${d.meetingMode.notes}</p>` : ''}
    </div>` : '';
  const gpsHtml = d.gps ? `
    <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:12px 0">
      <h3 style="color:#22c55e;margin:0 0 8px">📍 Position</h3>
      <a href="${d.gps.mapsLink || `https://www.google.com/maps?q=${d.gps.latitude},${d.gps.longitude}`}" style="color:#3b82f6" target="_blank">Voir sur Google Maps</a>
      ${d.gps.accuracy ? `<p style="color:#888;font-size:12px">Précision : ±${Math.round(d.gps.accuracy)} m</p>` : ''}
    </div>` : '';
  const contactsHtml = d.contacts?.length ? `
    <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:12px 0">
      <h3 style="color:#8b5cf6;margin:0 0 8px">📱 Contacts d'urgence</h3>
      ${d.contacts.map((c: string) => `<p><a href="tel:${c.split(':')[1]}" style="color:#3b82f6">${c}</a></p>`).join('')}
    </div>` : '';
  const journalHtml = d.journalEntries?.length ? `
    <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:12px 0">
      <h3 style="color:#f97316;margin:0 0 12px">📝 Notes &amp; Photos</h3>
      ${d.journalEntries.map((j: any) => `
        <div style="border-bottom:1px solid #333;padding:10px 0;margin-bottom:8px">
          <p style="margin:0 0 4px"><strong style="color:#fff">${j.title || 'Sans titre'}</strong> <span style="color:#666;font-size:11px">${j.date || ''}</span></p>
          ${j.description ? `<p style="margin:4px 0;color:#ccc;font-size:13px">${j.description}</p>` : ''}
          ${j.photo ? `<img src="${j.photo}" style="max-width:100%;border-radius:8px;margin-top:8px" alt="Photo jointe"/>` : ''}
        </div>
      `).join('')}
    </div>` : '';
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>URGENCE - ${d.userName || 'Vigilink-SOS'}</title></head>
<body style="background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,sans-serif;margin:0;padding:20px;max-width:480px;margin:0 auto">
  <div style="text-align:center;padding:20px 0;border-bottom:2px solid #ef4444">
    <h1 style="color:#ef4444;margin:0">🆘 ALERTE SOS</h1>
    <h2 style="color:#fff;margin:8px 0">${d.userName || 'Inconnu'}</h2>
    ${d.userPhone ? `<p style="font-size:20px"><a href="tel:${d.userPhone}" style="color:#3b82f6;text-decoration:none">📞 ${d.userPhone}</a></p>` : ''}
    <p style="color:#888;font-size:12px">${d.triggerType || 'SOS'} — ${d.time || new Date(entry.createdAt).toLocaleString('fr-CA')}</p>
  </div>
  ${gpsHtml}${meetHtml}${journalHtml}${contactsHtml}
  <p style="text-align:center;color:#555;font-size:11px;margin-top:30px">Vigilink-SOS — Ce lien expire après 24h</p>
</body></html>`);
});

app.post('/api/profile/save', (req, res) => {
  try {
    const { profileId, name, phone, contacts, medicalProfile, alzheimerMode, meetingMode } = req.body;
    if (!profileId) return res.status(400).json({ ok: false, reason: 'missing_profileId' });
    publicProfiles.set(profileId, {
      data: { name, phone, contacts, medicalProfile, alzheimerMode, meetingMode },
      updatedAt: Date.now(),
    });
    console.log(`[Profile] Saved public profile ${profileId} for ${name}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Profile] Save error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const locationRateLimit = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of locationRateLimit) {
    if (now - ts > 10 * 60 * 1000) locationRateLimit.delete(key);
  }
}, 5 * 60 * 1000);

app.post('/api/profile/send-location', async (req, res) => {
  try {
    const { profileId, latitude, longitude, accuracy } = req.body;
    if (!profileId) return res.status(400).json({ ok: false, reason: 'missing_profileId' });

    const lastSent = locationRateLimit.get(profileId);
    if (lastSent && Date.now() - lastSent < 5 * 60 * 1000) {
      return res.status(429).json({ ok: false, reason: 'rate_limited', message: 'Veuillez attendre 5 minutes entre chaque envoi.' });
    }

    const profile = publicProfiles.get(profileId);
    if (!profile) return res.status(404).json({ ok: false, reason: 'profile_not_found' });

    const d = profile.data;
    const caregiverPhone = d.alzheimerMode?.caregiverPhone || (d.contacts?.[0]?.phone);
    if (!caregiverPhone) return res.status(400).json({ ok: false, reason: 'no_caregiver_phone' });

    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const accText = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
    const smsBody = `📍 VIGILINK-SOS — Quelqu'un a scanné le QR code de ${d.name || 'votre proche'}.\n\n` +
      `Position du scanneur${accText} :\n${mapsLink}\n\n` +
      `Appelez ${d.name || ''} ou rendez-vous à cette position.`;

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    await client.messages.create({ body: smsBody, from: fromNumber, to: caregiverPhone });
    locationRateLimit.set(profileId, Date.now());
    console.log(`[Profile] Location SMS sent to ${caregiverPhone} for profile ${profileId}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Profile] Send-location error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/profile/:id', (req, res) => {
  const profile = publicProfiles.get(req.params.id);
  if (!profile) {
    return res.status(404).send(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profil introuvable</title></head>
<body style="background:#0a0a0a;color:#fff;font-family:-apple-system,sans-serif;padding:40px;text-align:center">
<h1 style="color:#ef4444">Profil introuvable</h1>
<p style="color:#888">Ce profil n'existe pas ou n'a pas encore été configuré.</p>
<p style="color:#666;font-size:12px;margin-top:20px">Vigilink-SOS</p>
</body></html>`);
  }

  const d = profile.data;
  const isAlzheimer = d.alzheimerMode?.enabled === true;
  const displayName = (isAlzheimer && d.alzheimerMode?.displayName) ? d.alzheimerMode.displayName : (d.name || 'Inconnu');
  const caregiverName = d.alzheimerMode?.caregiverName || '';
  const caregiverPhone = d.alzheimerMode?.caregiverPhone || (d.contacts?.[0]?.phone) || '';
  const hideAddress = d.alzheimerMode?.hideAddress !== false;

  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let contactsHtml = '';
  if (d.contacts?.length && !isAlzheimer) {
    contactsHtml = `<div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:12px 0">
      <h3 style="color:#8b5cf6;margin:0 0 8px">📱 Contacts d'urgence</h3>
      ${d.contacts.map((c: any) => `<p><a href="tel:${esc(c.phone)}" style="color:#3b82f6;font-size:16px">${esc(c.name)} — ${esc(c.phone)}</a></p>`).join('')}
    </div>`;
  }


  const profileId = req.params.id;
  const sendLocationScript = `
<script>
function sendMyLocation() {
  var btn = document.getElementById('sendLocBtn');
  var status = document.getElementById('locStatus');
  btn.disabled = true;
  btn.textContent = 'Localisation en cours...';
  if (!navigator.geolocation) {
    status.textContent = 'Géolocalisation non supportée par ce navigateur.';
    btn.disabled = false;
    btn.textContent = '📍 Envoyer ma position au tuteur';
    return;
  }
  navigator.geolocation.getCurrentPosition(function(pos) {
    fetch('/api/profile/send-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: '${profileId}',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.ok) {
        status.textContent = '✅ Position envoyée avec succès au tuteur !';
        status.style.color = '#22c55e';
        btn.textContent = '✅ Position envoyée';
      } else {
        status.textContent = 'Erreur : ' + (data.reason || 'Réessayez.');
        btn.disabled = false;
        btn.textContent = '📍 Envoyer ma position au tuteur';
      }
    }).catch(function() {
      status.textContent = 'Erreur réseau. Réessayez.';
      btn.disabled = false;
      btn.textContent = '📍 Envoyer ma position au tuteur';
    });
  }, function(err) {
    status.textContent = 'Impossible d\\'obtenir la position. Vérifiez vos permissions.';
    btn.disabled = false;
    btn.textContent = '📍 Envoyer ma position au tuteur';
  }, { enableHighAccuracy: true, timeout: 15000 });
}
</script>`;

  if (isAlzheimer) {
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(displayName)} — Vigilink-SOS</title></head>
<body style="background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,sans-serif;margin:0;padding:20px;max-width:480px;margin:0 auto">
  <div style="text-align:center;padding:24px 0;border-bottom:3px solid #3b82f6">
    <p style="font-size:14px;color:#3b82f6;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;font-weight:700">Personne sous protection</p>
    <h1 style="color:#fff;margin:0;font-size:32px">${esc(displayName)}</h1>
    <p style="color:#888;font-size:13px;margin-top:8px">Cette personne est suivie par Vigilink-SOS</p>
  </div>

  <div style="margin:20px 0;text-align:center">
    <a href="tel:${esc(caregiverPhone)}" style="display:block;background:#22c55e;color:#fff;padding:20px;border-radius:16px;text-decoration:none;font-size:20px;font-weight:800;margin-bottom:12px">
      📞 APPELER ${esc(caregiverName || 'LE TUTEUR')}
    </a>
    ${caregiverPhone ? `<p style="color:#888;font-size:13px">${esc(caregiverPhone)}</p>` : ''}
  </div>

  <div style="margin:20px 0;text-align:center">
    <button id="sendLocBtn" onclick="sendMyLocation()" style="display:block;width:100%;background:#3b82f6;color:#fff;padding:18px;border-radius:16px;border:none;font-size:18px;font-weight:700;cursor:pointer">
      📍 Envoyer ma position au tuteur
    </button>
    <p id="locStatus" style="color:#888;font-size:12px;margin-top:8px"></p>
  </div>

  ${d.alzheimerMode?.instructions ? `<div style="background:#1a1a2e;border:1px solid #f59e0b33;border-radius:12px;padding:16px;margin:20px 0">
    <h3 style="color:#f59e0b;margin:0 0 8px;font-size:14px">📋 Consignes du tuteur</h3>
    <p style="color:#ccc;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(d.alzheimerMode.instructions)}</p>
  </div>` : ''}

  ${(() => {
    const mp = d.medicalProfile;
    if (!mp) return '';
    const rows: string[] = [];
    if (mp.bloodType) rows.push('<p style="margin:4px 0"><strong style="color:#ef4444">Groupe sanguin :</strong> ' + esc(mp.bloodType) + '</p>');
    if (mp.allergies?.length) rows.push('<p style="margin:4px 0"><strong style="color:#ef4444">Allergies :</strong> ' + mp.allergies.map((a: string) => esc(a)).join(', ') + '</p>');
    if (mp.medications?.length) rows.push('<p style="margin:4px 0"><strong style="color:#3b82f6">Médicaments :</strong> ' + mp.medications.map((m: string) => esc(m)).join(', ') + '</p>');
    if (mp.conditions?.length) rows.push('<p style="margin:4px 0"><strong style="color:#8b5cf6">Conditions :</strong> ' + mp.conditions.map((c: string) => esc(c)).join(', ') + '</p>');
    if (mp.emergencyNotes) rows.push('<p style="margin:4px 0"><strong style="color:#888">Notes :</strong> ' + esc(mp.emergencyNotes) + '</p>');
    if (!rows.length) return '';
    return '<div style="background:#1a1a2e;border:1px solid #ef444433;border-radius:12px;padding:16px;margin:20px 0"><h3 style="color:#ef4444;margin:0 0 8px;font-size:14px">🏥 Informations médicales</h3>' + rows.join('') + '</div>';
  })()}

  <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:20px 0">
    <h3 style="color:#3b82f6;margin:0 0 8px;font-size:14px">ℹ️ Que faire ?</h3>
    <ol style="margin:0;padding:0 0 0 20px;color:#ccc;font-size:14px;line-height:1.8">
      <li>Appelez le tuteur avec le bouton ci-dessus</li>
      <li>Envoyez votre position pour qu'il puisse vous retrouver</li>
      <li>Restez avec la personne jusqu'à l'arrivée du tuteur</li>
      <li>En cas d'urgence médicale, appelez le 911</li>
    </ol>
  </div>

  <p style="text-align:center;color:#555;font-size:11px;margin-top:30px">Vigilink-SOS — Protection Alzheimer</p>
${sendLocationScript}
</body></html>`);
  } else {
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Profil d'urgence — ${esc(displayName)}</title></head>
<body style="background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,sans-serif;margin:0;padding:20px;max-width:480px;margin:0 auto">
  <div style="text-align:center;padding:20px 0;border-bottom:2px solid #ef4444">
    <h1 style="color:#ef4444;margin:0">🆘 PROFIL D'URGENCE</h1>
    <h2 style="color:#fff;margin:8px 0;font-size:24px">${esc(displayName)}</h2>
    ${(!hideAddress && d.phone) ? `<p style="font-size:18px"><a href="tel:${esc(d.phone)}" style="color:#3b82f6;text-decoration:none">📞 ${esc(d.phone)}</a></p>` : ''}
  </div>

  ${contactsHtml}

  <div style="margin:20px 0;text-align:center">
    <button id="sendLocBtn" onclick="sendMyLocation()" style="display:block;width:100%;background:#3b82f6;color:#fff;padding:16px;border-radius:12px;border:none;font-size:16px;font-weight:700;cursor:pointer">
      📍 Envoyer ma position aux contacts
    </button>
    <p id="locStatus" style="color:#888;font-size:12px;margin-top:8px"></p>
  </div>

  <p style="text-align:center;color:#555;font-size:11px;margin-top:30px">Vigilink-SOS</p>
${sendLocationScript}
</body></html>`);
  }
});

app.get('/api/profile/:id', (req, res) => {
  const profile = publicProfiles.get(req.params.id);
  if (!profile) return res.status(404).json({ ok: false, reason: 'not_found' });
  res.json({ ok: true, data: profile.data, updatedAt: profile.updatedAt });
});

app.post('/api/emergency', async (req, res) => {
  try {
    const { userName, userPhone, contactPhones, gps, triggerType, lang, clientTime, timezone, meetingMode, emergencyContacts, journalEntries } = req.body;

    if (!contactPhones || contactPhones.length === 0) {
      return res.status(400).json({ ok: false, reason: 'no_contacts' });
    }

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    const s = getSmsStrings(lang);

    let timeStr: string;
    if (clientTime) {
      timeStr = clientTime;
    } else if (timezone) {
      try {
        timeStr = new Date().toLocaleTimeString(lang || 'fr-CA', { timeZone: timezone });
      } catch {
        timeStr = new Date().toLocaleTimeString(lang || 'fr-CA');
      }
    } else {
      timeStr = new Date().toLocaleTimeString(lang || 'fr-CA');
    }

    const link = gps
      ? gps.mapsLink || `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`
      : null;
    const posLine = gps
      ? gps.approximate
        ? `${s.positionApprox} : ${link} (±${Math.round(gps.accuracy ?? 0)} m)`
        : `${s.position} : ${link} (±${Math.round(gps.accuracy ?? 0)} m)`
      : s.positionUnknown;

    const meetingLines: string[] = [];
    if (meetingMode?.active) {
      meetingLines.push('👤 RDV ACTIF:');
      if (meetingMode.personName) meetingLines.push(`  Personne: ${meetingMode.personName}`);
      if (meetingMode.personPhone) meetingLines.push(`  Tél: ${meetingMode.personPhone}`);
      if (meetingMode.location) meetingLines.push(`  Lieu: ${meetingMode.location}`);
      if (meetingMode.dateTime) meetingLines.push(`  Heure: ${meetingMode.dateTime}`);
      if (meetingMode.notes) meetingLines.push(`  Notes: ${meetingMode.notes}`);
    }

    const profileId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    emergencyProfiles.set(profileId, {
      data: { userName, userPhone, gps, triggerType, meetingMode, contacts: emergencyContacts || contactPhones, time: timeStr, journalEntries: journalEntries || [] },
      createdAt: Date.now(),
    });
    const host = req.get('host') || 'vigilink-sos.replit.app';
    const protocol = req.get('x-forwarded-proto') || 'https';
    const profileUrl = `${protocol}://${host}/emergency-profile/${profileId}`;

    const message = [
      s.alert,
      `${s.user} : ${userName || s.unknown}`,
      userPhone ? `${s.callBack} : ${userPhone}` : '',
      `${s.time} : ${timeStr}`,
      posLine,
      ...meetingLines,
      `📄 ${profileUrl}`,
    ].filter(Boolean).join('\n');

    console.log(`[Emergency] Sending to ${contactPhones.length} contacts from ${fromNumber}`);

    const results = await Promise.allSettled(
      contactPhones.map((phone: string) =>
        client.messages.create({
          body: message,
          from: fromNumber,
          to: phone,
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    for (const [i, r] of results.entries()) {
      if (r.status === 'rejected') {
        const err = r.reason;
        console.error(`[Emergency] SMS to ${contactPhones[i]} FAILED:`, err.message, err.code, err.status, err.moreInfo);
      } else {
        console.log(`[Emergency] SMS to ${contactPhones[i]} OK — SID: ${r.value.sid}, status: ${r.value.status}`);
      }
    }

    console.log(`[Emergency] Sent ${sent}/${contactPhones.length} SMS (${failed} failed)`);

    if (sent === 0 && failed > 0) {
      const firstErr = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      const errMsg = firstErr?.reason?.message || 'unknown';
      const errCode = firstErr?.reason?.code || 0;
      res.json({ ok: false, reason: 'twilio_failed', error: errMsg, code: errCode, sent, failed, alertId: `alert-${Date.now()}` });
    } else {
      res.json({ ok: true, sent, failed, alertId: `alert-${Date.now()}` });
    }
  } catch (error: any) {
    console.error('[Emergency] Error:', error.message);
    res.status(500).json({ ok: false, reason: 'server', error: error.message });
  }
});

app.get('/api/twilio-check', async (_req, res) => {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    const account = await client.api.accounts(client.accountSid).fetch();
    res.json({
      ok: true,
      accountSid: client.accountSid.slice(0, 8) + '...',
      fromNumber,
      accountStatus: account.status,
      accountType: account.type,
      friendlyName: account.friendlyName,
    });
  } catch (error: any) {
    console.error('[Twilio-Check] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/upload-evidence', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, reason: 'no_file' });
    }
    const evidenceUrl = `/evidence/${file.filename}`;
    console.log(`[Evidence] Uploaded: ${file.filename} (${(file.size / 1024).toFixed(1)} KB)`);
    res.json({ ok: true, evidenceUrl, filename: file.filename });
  } catch (error: any) {
    console.error('[Evidence] Upload error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/emergency-followup', upload.single('audio'), async (req, res) => {
  try {
    const { userName, userPhone, contactPhones, gps, alertId, triggerType, lang } = req.body;
    const phones = typeof contactPhones === 'string' ? JSON.parse(contactPhones) : contactPhones;

    if (!phones || phones.length === 0) {
      return res.status(400).json({ ok: false, reason: 'no_contacts' });
    }

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    const s = getSmsStrings(lang);

    let gpsData: any = null;
    if (gps) {
      gpsData = typeof gps === 'string' ? JSON.parse(gps) : gps;
    }

    const hasAudio = !!req.file;
    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
      ? process.env.REPLIT_DEPLOYMENT_URL
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPL_SLUG
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : `http://localhost:${PORT}`;
    const evidenceLink = hasAudio ? `${baseUrl}/evidence/${req.file!.filename}` : null;

    const followupLink = gpsData
      ? gpsData.mapsLink || `https://www.google.com/maps?q=${gpsData.latitude},${gpsData.longitude}`
      : null;
    const followupPosLine = gpsData
      ? gpsData.approximate
        ? `${s.positionApprox} : ${followupLink} (±${Math.round(gpsData.accuracy ?? 0)} m)`
        : `${s.position} : ${followupLink} (±${Math.round(gpsData.accuracy ?? 0)} m)`
      : s.positionUnknown;

    const message = [
      s.followup,
      `${s.user} : ${userName || s.unknown}`,
      userPhone ? `${s.callBack} : ${userPhone}` : '',
      `${s.time} : ${req.body.clientTime || new Date().toLocaleTimeString(lang || 'fr-CA')}`,
      hasAudio ? `${s.audioRecording} :` : '',
      evidenceLink ? evidenceLink : '',
      followupPosLine,
      `${s.alertId} : ${alertId || 'N/A'}`,
    ].filter(Boolean).join('\n');

    const results = await Promise.allSettled(
      phones.map((phone: string) =>
        client.messages.create({
          body: message,
          from: fromNumber,
          to: phone,
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[Emergency-Followup] Sent ${sent}/${phones.length} SMS (${failed} failed) — audio: ${hasAudio}`);

    res.json({ ok: true, sent, failed });
  } catch (error: any) {
    console.error('[Emergency-Followup] Error:', error.message);
    res.status(500).json({ ok: false, reason: 'server', error: error.message });
  }
});

app.use('/evidence', express.static(evidenceDir));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }

    const systemPrompt = `Tu es Guardian, l'assistant IA de sécurité personnelle Vigilink-SOS. Tu parles français.
Tu aides les utilisateurs avec :
- Des conseils de sécurité personnelle
- L'utilisation de l'application Vigilink-SOS
- Des situations d'urgence (tout en rappelant d'appeler le 911 en cas de danger immédiat)
- La prévention et la sensibilisation

Tu es calme, professionnel et rassurant. Tu ne donnes jamais de conseils médicaux.
Si l'utilisateur semble en danger immédiat, tu lui rappelles d'appeler le 911 ou les services d'urgence locaux.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 1024,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('[Chat] Error:', error.message);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

const VALID_CURRENCIES = ['cad', 'usd', 'eur'] as const;
type CheckoutCurrency = typeof VALID_CURRENCIES[number];

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

function buildLineItems(
  planName: string,
  baseAmount: number,
  currency: CheckoutCurrency,
) {
  const items: any[] = [
    {
      price_data: {
        currency,
        product_data: { name: planName },
        unit_amount: baseAmount,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    },
  ];

  if (currency === 'cad') {
    const tpsAmount = Math.round(baseAmount * TPS_RATE);
    const tvqAmount = Math.round(baseAmount * TVQ_RATE);
    items.push(
      {
        price_data: {
          currency,
          product_data: { name: 'TPS (5%)' },
          unit_amount: tpsAmount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency,
          product_data: { name: 'TVQ (9.975%)' },
          unit_amount: tvqAmount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    );
  }

  return items;
}

app.post('/api/checkout', async (req, res) => {
  try {
    const { plan, userId, currency: rawCurrency } = req.body;
    const currency: CheckoutCurrency = VALID_CURRENCIES.includes(rawCurrency) ? rawCurrency : 'cad';
    const stripe = await getUncachableStripeClient();

    const priceMap: Record<string, { amount: number; name: string }> = {
      pro:      { amount: 999,  name: 'Vigilink-SOS PRO' },
      platinum: { amount: 1999, name: 'Vigilink-SOS Platinum' },
    };

    const planInfo = priceMap[plan];
    if (!planInfo) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    const isNative = req.body.native === true;
    const baseUrl = `https://${req.get('host')}`;

    const successUrl = isNative
      ? `${baseUrl}/checkout/return?status=success`
      : `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;
    const cancelUrl = isNative
      ? `${baseUrl}/checkout/return?status=cancel`
      : `${baseUrl}/?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: buildLineItems(planInfo.name, planInfo.amount, currency),
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan, currency },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('[Checkout] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/checkout/verify-session', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    if (!sessionId || !userId) {
      return res.status(400).json({ ok: false, error: 'Session ID and user ID required' });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== userId) {
      return res.status(403).json({ ok: false, error: 'Session does not belong to this user' });
    }

    const paid = session.payment_status === 'paid';
    const plan = (session.metadata?.plan as string) || 'pro';

    res.json({ ok: true, paid, plan, status: session.payment_status });
  } catch (error: any) {
    console.error('[Checkout Verify] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/checkout/restore', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'User ID required' });
    }

    const stripe = await getUncachableStripeClient();
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: 'complete',
    });

    const match = sessions.data.find(
      (s: any) => s.metadata?.userId === userId && s.payment_status === 'paid'
    );

    if (match) {
      const plan = (match.metadata?.plan as string) || 'pro';
      return res.json({ ok: true, found: true, plan });
    }

    res.json({ ok: true, found: false });
  } catch (error: any) {
    console.error('[Checkout Restore] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/checkout/return', (_req, res) => {
  const status = _req.query.status || 'success';
  const title = status === 'success' ? 'Payment Successful' : 'Payment Cancelled';
  const message = status === 'success'
    ? 'Your payment was processed successfully. You can now close this window and return to the app.'
    : 'Payment was cancelled. You can close this window and return to the app.';
  const icon = status === 'success' ? '✅' : '❌';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Vigilink-SOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { text-align: center; max-width: 360px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 22px; margin-bottom: 12px; font-weight: 800; }
    p { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 14px 32px; background: #dc2626; color: #fff; border-radius: 16px; text-decoration: none; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="javascript:window.close()" class="btn">Close</a>
  </div>
</body>
</html>`);
});

app.post('/api/checkout/trial', async (req, res) => {
  try {
    const { userId, currency: rawCurrency, native } = req.body;
    const currency: CheckoutCurrency = VALID_CURRENCIES.includes(rawCurrency) ? rawCurrency : 'cad';
    const stripe = await getUncachableStripeClient();

    const isNative = native === true;
    const baseUrl = `https://${req.get('host')}`;

    const successUrl = isNative
      ? `${baseUrl}/checkout/return?status=success`
      : `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=pro`;
    const cancelUrl = isNative
      ? `${baseUrl}/checkout/return?status=cancel`
      : `${baseUrl}/?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: buildLineItems('Vigilink-SOS PRO — Essai 24h', 999, currency),
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 1,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan: 'pro', trial: 'true', currency },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('[Checkout Trial] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const ADMIN_CREDS = {
  phone: '+14383678183',
  email: 'izmaghiles@gmail.com',
  password: '123456789',
};

const adminCodes: Map<string, { code: string; expiresAt: number; attempts: number }> = new Map();
const recoveryCodes: Map<string, { code: string; expiresAt: number; attempts: number }> = new Map();
const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

function checkRateLimit(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxPerWindow) return false;
  entry.count++;
  return true;
}

app.post('/api/admin/send-code', async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    if (!phone || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Paramètres manquants' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`send-code:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const phoneDigits = phone.replace(/[^0-9]/g, '').slice(-10);
    const adminDigits = ADMIN_CREDS.phone.replace(/[^0-9]/g, '').slice(-10);

    if (phoneDigits !== adminDigits || email.trim().toLowerCase() !== ADMIN_CREDS.email || password !== ADMIN_CREDS.password) {
      return res.status(401).json({ ok: false, error: 'Identifiants incorrects' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    adminCodes.set(ADMIN_CREDS.phone, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    const now = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

    await client.messages.create({
      body: `🔐 Vigilink-SOS Admin\n\nCode de vérification : ${code}\n\nTentative de connexion admin détectée le ${now}.\n\nSi ce n'est pas vous, ignorez ce message et changez vos identifiants immédiatement.`,
      from: fromNumber,
      to: ADMIN_CREDS.phone,
    });

    console.log(`[Admin 2FA] Code sent to ${ADMIN_CREDS.phone}`);
    res.json({ ok: true, method: 'sms' });
  } catch (error: any) {
    console.error('[Admin 2FA] SMS error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/admin/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ ok: false, error: 'Paramètres manquants' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`verify:${ip}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const stored = adminCodes.get(ADMIN_CREDS.phone);
    if (!stored) {
      return res.status(400).json({ ok: false, error: 'Aucun code en attente' });
    }

    if (Date.now() > stored.expiresAt) {
      adminCodes.delete(ADMIN_CREDS.phone);
      return res.status(400).json({ ok: false, error: 'Code expiré' });
    }

    if (stored.attempts >= 5) {
      adminCodes.delete(ADMIN_CREDS.phone);
      return res.status(429).json({ ok: false, error: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    if (stored.code !== code.trim()) {
      stored.attempts++;
      return res.status(400).json({ ok: false, error: `Code incorrect (${5 - stored.attempts} essais restants)` });
    }

    adminCodes.delete(ADMIN_CREDS.phone);

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    const now = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

    await client.messages.create({
      body: `✅ Vigilink-SOS Admin\n\nConnexion admin réussie le ${now}.\n\nSi ce n'est pas vous, sécurisez immédiatement votre compte.`,
      from: fromNumber,
      to: ADMIN_CREDS.phone,
    }).catch((e: any) => console.error('[Admin 2FA] Confirm SMS error:', e.message));

    console.log(`[Admin 2FA] Code verified for ${ADMIN_CREDS.phone}`);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('[Admin 2FA] Verify error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/recovery/send-code', async (req, res) => {
  try {
    const { phone, lang } = req.body;
    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Phone number required' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`recovery:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in 15 minutes.' });
    }

    const phoneClean = phone.replace(/[^0-9+]/g, '');
    const phoneTo = phoneClean.startsWith('+') ? phoneClean : `+${phoneClean}`;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    recoveryCodes.set(phoneClean, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    const messages: Record<string, string> = {
      fr: `🔐 Vigilink-SOS\n\nVotre code de récupération : ${code}\n\nCe code expire dans 5 minutes.\nSi vous n'avez pas demandé ce code, ignorez ce message.`,
      en: `🔐 Vigilink-SOS\n\nYour recovery code: ${code}\n\nThis code expires in 5 minutes.\nIf you didn't request this code, ignore this message.`,
      es: `🔐 Vigilink-SOS\n\nSu código de recuperación: ${code}\n\nEste código expira en 5 minutos.\nSi no solicitó este código, ignore este mensaje.`,
      ar: `🔐 Vigilink-SOS\n\nرمز الاسترداد الخاص بك: ${code}\n\nينتهي هذا الرمز خلال 5 دقائق.\nإذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`,
      pt: `🔐 Vigilink-SOS\n\nSeu código de recuperação: ${code}\n\nEste código expira em 5 minutos.\nSe você não solicitou este código, ignore esta mensagem.`,
      de: `🔐 Vigilink-SOS\n\nIhr Wiederherstellungscode: ${code}\n\nDieser Code läuft in 5 Minuten ab.\nWenn Sie diesen Code nicht angefordert haben, ignorieren Sie diese Nachricht.`,
    };
    const body = messages[lang as string] || messages.fr;

    await client.messages.create({ body, from: fromNumber, to: phoneTo });

    console.log(`[Recovery] Code sent to ${phoneTo}`);
    res.json({ ok: true, method: 'sms' });
  } catch (error: any) {
    console.error('[Recovery] SMS error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/recovery/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ ok: false, error: 'Phone and code required' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`recovery-verify:${ip}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in 15 minutes.' });
    }

    const phoneClean = phone.replace(/[^0-9+]/g, '');
    const stored = recoveryCodes.get(phoneClean);
    if (!stored) {
      return res.status(400).json({ ok: false, error: 'No code pending' });
    }

    if (Date.now() > stored.expiresAt) {
      recoveryCodes.delete(phoneClean);
      return res.status(400).json({ ok: false, error: 'Code expired' });
    }

    if (stored.attempts >= 5) {
      recoveryCodes.delete(phoneClean);
      return res.status(429).json({ ok: false, error: 'Too many failed attempts. Request a new code.' });
    }

    if (stored.code !== code.trim()) {
      stored.attempts++;
      return res.status(400).json({ ok: false, error: `Wrong code (${5 - stored.attempts} attempts left)` });
    }

    recoveryCodes.delete(phoneClean);
    console.log(`[Recovery] Code verified for ${phoneClean}`);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('[Recovery] Verify error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── OTP Invitations (server-side storage for cross-device validation) ──────
const otpInvitations: Map<string, {
  id: string;
  guestPhone: string;
  code: string;
  sponsorPhone: string;
  sponsorName: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}> = new Map();

app.post('/api/otp/create', async (req, res) => {
  try {
    const { guestPhone, sponsorPhone, sponsorName, code, expiresAt } = req.body;
    if (!guestPhone || !sponsorPhone || !code) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`otp-create:${ip}`, 15, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Too many invitations. Try again later.' });
    }

    const phoneNorm = guestPhone.startsWith('+') ? guestPhone : `+${guestPhone.replace(/\D/g, '')}`;
    const id = `${sponsorPhone}_${phoneNorm}_${Date.now()}`;

    otpInvitations.set(id, {
      id,
      guestPhone: phoneNorm,
      code,
      sponsorPhone,
      sponsorName: sponsorName || '',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      used: false,
    });

    console.log(`[OTP] Invitation created for ${phoneNorm} by ${sponsorPhone}`);
    res.json({ ok: true, id });
  } catch (error: any) {
    console.error('[OTP] Create error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/otp/validate', async (req, res) => {
  try {
    const { guestPhone, code } = req.body;
    if (!guestPhone || !code) {
      return res.status(400).json({ ok: false, error: 'Missing phone or code' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`otp-validate:${ip}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Try again later.' });
    }

    const phoneNorm = guestPhone.startsWith('+') ? guestPhone : `+${guestPhone.replace(/\D/g, '')}`;
    const codeTrimmed = code.trim();

    let matchedEntry: [string, { id: string; guestPhone: string; code: string; sponsorPhone: string; sponsorName: string; createdAt: string; expiresAt: string; used: boolean }] | null = null;
    for (const [key, inv] of otpInvitations) {
      if (inv.guestPhone === phoneNorm && inv.code === codeTrimmed) {
        matchedEntry = [key, inv];
        break;
      }
    }

    if (!matchedEntry) {
      return res.json({ ok: false, reason: 'not_found' });
    }

    const [invKey, inv] = matchedEntry;

    if (inv.used) {
      return res.json({ ok: false, reason: 'already_used' });
    }

    if (new Date(inv.expiresAt) <= new Date()) {
      return res.json({ ok: false, reason: 'expired' });
    }

    inv.used = true;
    otpInvitations.set(invKey, inv);

    console.log(`[OTP] Code validated for ${phoneNorm}`);
    res.json({
      ok: true,
      sponsorPhone: inv.sponsorPhone,
      sponsorName: inv.sponsorName,
    });
  } catch (error: any) {
    console.error('[OTP] Validate error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Sponsor: auto-send invitation SMS ─────────────────────────────────────
app.post('/api/sponsor/send-invite', async (req, res) => {
  try {
    const { guestPhone, message } = req.body;
    if (!guestPhone || !message) {
      return res.status(400).json({ ok: false, error: 'Missing guestPhone or message' });
    }

    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`sponsor-invite:${ip}`, 15, 15 * 60 * 1000)) {
      return res.status(429).json({ ok: false, error: 'Too many invitations. Try again later.' });
    }

    const phoneTo = guestPhone.startsWith('+') ? guestPhone : `+${guestPhone.replace(/\D/g, '')}`;

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneTo,
    });

    console.log(`[Sponsor] Invitation SMS sent to ${phoneTo}`);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('[Sponsor] Send invite error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Sponsor: deactivate guest ─────────────────────────────────────────────
app.post('/api/sponsor/deactivate', async (req, res) => {
  try {
    const { guestPhone, sponsorName, lang } = req.body;
    if (!guestPhone) {
      return res.status(400).json({ ok: false, error: 'Missing guestPhone' });
    }

    const phoneTo = guestPhone.startsWith('+') ? guestPhone : `+${guestPhone.replace(/\D/g, '')}`;
    const l = (lang || 'fr').toLowerCase().split('-')[0];

    const msgs: Record<string, string> = {
      fr: `⚠️ Vigilink-SOS\n\nVotre accès PRO invité a été désactivé par ${sponsorName || 'votre parrain'}.\n\nVotre compte a été supprimé. Contactez votre parrain pour une nouvelle invitation.`,
      en: `⚠️ Vigilink-SOS\n\nYour PRO guest access has been deactivated by ${sponsorName || 'your sponsor'}.\n\nYour account has been removed. Contact your sponsor for a new invitation.`,
      es: `⚠️ Vigilink-SOS\n\nTu acceso PRO de invitado fue desactivado por ${sponsorName || 'tu padrino'}.\n\nTu cuenta fue eliminada. Contacta a tu padrino para una nueva invitación.`,
      ar: `⚠️ Vigilink-SOS\n\nتم إلغاء تنشيط وصولك كضيف PRO بواسطة ${sponsorName || 'راعيك'}.\n\nتم حذف حسابك. اتصل براعيك للحصول على دعوة جديدة.`,
      pt: `⚠️ Vigilink-SOS\n\nSeu acesso PRO de convidado foi desativado por ${sponsorName || 'seu padrinho'}.\n\nSua conta foi removida. Entre em contato com seu padrinho para um novo convite.`,
      de: `⚠️ Vigilink-SOS\n\nIhr PRO-Gastzugang wurde von ${sponsorName || 'Ihrem Sponsor'} deaktiviert.\n\nIhr Konto wurde gelöscht. Kontaktieren Sie Ihren Sponsor für eine neue Einladung.`,
    };

    const body = msgs[l] || msgs.en;

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    await client.messages.create({
      body,
      from: fromNumber,
      to: phoneTo,
    });

    console.log(`[Sponsor] Deactivation SMS sent to ${phoneTo}`);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('[Sponsor] Deactivate error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const APP_VERSION = '2026030802';

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), version: APP_VERSION });
});

app.post('/api/sync/save', async (req, res) => {
  try {
    const { phone, profileData, token } = req.body;
    if (!phone || !profileData || !token) {
      return res.json({ ok: false, error: 'missing fields' });
    }
    const existing = await pool.query('SELECT profile_data FROM user_profiles WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      const stored = existing.rows[0].profile_data;
      if (stored._token && stored._token !== token) {
        return res.json({ ok: false, error: 'auth_failed' });
      }
    }
    const safeData = { ...profileData, _token: token };
    delete safeData.password;
    const allowedSub = ['free', 'trial', 'pro', 'platinum'];
    if (!allowedSub.includes(safeData.subscription)) safeData.subscription = 'free';
    const subscription = safeData.subscription || 'free';
    await pool.query(
      `INSERT INTO user_profiles (phone, profile_data, subscription, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (phone) DO UPDATE SET
         profile_data = $2,
         subscription = $3,
         updated_at = NOW()`,
      [phone, JSON.stringify(safeData), subscription]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[sync/save]', err);
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/sync/load', async (req, res) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) return res.json({ ok: false, error: 'missing fields' });
    const result = await pool.query(
      'SELECT profile_data FROM user_profiles WHERE phone = $1',
      [phone]
    );
    if (result.rows.length === 0) {
      return res.json({ ok: true, found: false });
    }
    const stored = result.rows[0].profile_data;
    if (stored._token && stored._token !== token) {
      return res.json({ ok: false, error: 'auth_failed' });
    }
    const { _token, ...profileData } = stored;
    res.json({ ok: true, found: true, profileData });
  } catch (err: any) {
    console.error('[sync/load]', err);
    res.json({ ok: false, error: err.message });
  }
});

const distPath = path.resolve(__dirname, '..', 'dist');

app.get('/sw.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'sw.js'));
});

app.use(express.static(distPath, { dotfiles: 'allow' }));
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/site/') || req.path === '/site' || req.path.startsWith('/privacy')) {
    res.status(404).send('Not Found');
    return;
  }
  if (req.path.startsWith('/.well-known/')) {
    const filePath = path.join(distPath, req.path);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(filePath);
      return;
    }
    res.status(404).send('Not Found');
    return;
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Vigilink-SOS API] Server running on port ${PORT}`);
});
