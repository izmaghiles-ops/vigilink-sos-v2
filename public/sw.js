const CACHE_NAME = 'vigilinksos-v21';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

const activeTimers = {};
let checkInterval = null;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() =>
      self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.navigate(client.url);
        });
      })
    )
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'START_TIMER') {
    activeTimers[data.timerType] = {
      endTimestamp: data.endTimestamp,
      duration: data.duration,
      emergencyData: data.emergencyData || null,
    };
    startTimerCheck();
  }

  if (data.type === 'CANCEL_TIMER') {
    delete activeTimers[data.timerType];
    if (Object.keys(activeTimers).length === 0) {
      stopTimerCheck();
    }
  }

  if (data.type === 'PING_TIMERS') {
    event.source?.postMessage({
      type: 'PONG_TIMERS',
      timers: Object.keys(activeTimers),
    });
  }
});

function startTimerCheck() {
  if (checkInterval) return;
  checkInterval = setInterval(checkTimers, 3000);
}

function stopTimerCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

async function checkTimers() {
  const now = Date.now();
  const expired = [];

  for (const [type, timer] of Object.entries(activeTimers)) {
    if (now >= timer.endTimestamp) {
      expired.push({ type, timer });
      delete activeTimers[type];
    }
  }

  for (const { type, timer } of expired) {
    if (type === 'countdown' && timer.emergencyData) {
      await sendEmergencySMS(timer.emergencyData);
      notifyClients({ type: 'TIMER_EXPIRED', timerType: type, smsSentBySW: true });
    } else {
      notifyClients({ type: 'TIMER_EXPIRED', timerType: type, smsSentBySW: false });
    }
  }

  if (Object.keys(activeTimers).length === 0) {
    stopTimerCheck();
  }
}

async function sendEmergencySMS(emergencyData) {
  try {
    const response = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: emergencyData.userName,
        userPhone: emergencyData.userPhone,
        contactPhones: emergencyData.contactPhones,
        gps: emergencyData.gps,
        triggerType: emergencyData.triggerType || 'countdown_bg',
        lang: emergencyData.lang || 'fr',
      }),
    });
    const result = await response.json();

    if (result.ok) {
      var successMsg = { en: 'SOS alert sent automatically', es: 'Alerta SOS enviada automáticamente', ar: 'تم إرسال تنبيه SOS تلقائيًا', de: 'SOS-Alarm automatisch gesendet', pt: 'Alerta SOS enviado automaticamente', fr: 'Alerte SOS envoyee automatiquement' };
      var lang = (emergencyData.lang || 'fr').split('-')[0];
      self.registration.showNotification('Vigilink-SOS', {
        body: successMsg[lang] || successMsg.en,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'sos-auto',
        requireInteraction: true,
        silent: emergencyData.modeDiscret || false,
      });
    }
  } catch (err) {
    var failMsg = { en: 'SOS failed — open app to retry', es: 'Error SOS — abra la app para reintentar', ar: 'فشل SOS — افتح التطبيق لإعادة المحاولة', de: 'SOS fehlgeschlagen — App öffnen zum Wiederholen', pt: 'Falha SOS — abra o app para tentar novamente', fr: 'Echec envoi SOS — ouvrez l\'app pour reessayer' };
    var lang2 = (emergencyData && emergencyData.lang || 'fr').split('-')[0];
    self.registration.showNotification('Vigilink-SOS', {
      body: failMsg[lang2] || failMsg.en,
      icon: '/icon-192.png',
      tag: 'sos-failed',
      requireInteraction: true,
    });
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => client.postMessage(message));
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ ok: false, reason: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  if (url.pathname.startsWith('/site/') || url.pathname === '/site' || url.pathname.startsWith('/privacy') || url.pathname.startsWith('/.well-known/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    var navUrl = new URL(event.request.url);
    var navAction = navUrl.searchParams.get('action');
    if (navAction) {
      self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'PENDING_ACTION', action: navAction, ts: Date.now() });
        });
      });
    }
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
        return response;
      }).catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
