
'use server';
import { NextResponse } from 'next/server';

// This route serves a service worker that unregisters itself and does nothing.
// This effectively disables the PWA/offline functionality.
export async function GET() {
  const swScript = `
    self.addEventListener('install', function(e) {
      self.skipWaiting();
    });

    self.addEventListener('activate', function(e) {
      self.registration.unregister()
        .then(function() {
          return self.clients.matchAll();
        })
        .then(function(clients) {
          clients.forEach(client => client.navigate(client.url));
        });
    });
  `;

  return new NextResponse(swScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}
