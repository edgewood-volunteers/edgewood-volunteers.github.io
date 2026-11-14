/* Edgewood Volunteer Hub – service worker (Nov 14, 2026).
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Only job: let Android phones offer "Install Volunteer Hub" from the volunteer page's button.
 * It caches NOTHING. Page loads go straight to the network as before; if the phone is offline,
 * it shows a short "you're offline" note instead of the browser's error page.
 * Hub calls (script.google.com), images, scripts: not touched at all. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Offline – Volunteer Hub</title><body style="font-family:system-ui,sans-serif;background:#0b2545;color:#fff;text-align:center;padding:60px 24px">' +
      '<h1 style="font-size:22px">You\'re offline</h1><p style="color:#cbd5e1;line-height:1.5">The Volunteer Hub needs an internet connection.<br>Check your Wi-Fi or data, then try again.</p>' +
      '<p><button onclick="location.reload()" style="font:600 16px system-ui;padding:12px 20px;border-radius:10px;border:0;background:#fbbf24;color:#0b2545">Try again</button></p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
