
'use server';
import { NextResponse } from 'next/server';

// This route serves the service worker file.
export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';

  // In development, serve a dummy service worker that does nothing to prevent caching issues.
  // In production, you would have your actual service worker logic here.
  const swScript = isProduction
    ? `
      const CACHE_NAME = 'florencio-comercial-cache-v1';
      // Add assets to cache for production PWA
      const urlsToCache = [
        '/',
        '/manifest.json'
      ];

      self.addEventListener('install', (event) => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => {
              console.log('Opened cache');
              return cache.addAll(urlsToCache);
            })
        );
      });

      self.addEventListener('fetch', (event) => {
        // More sophisticated caching strategies can be implemented here for production
        event.respondWith(
          caches.match(event.request)
            .then((response) => {
              return response || fetch(event.request);
            })
        );
      });
    `
    : `
      // This is a no-op service worker for development.
      // It immediately activates and doesn't intercept any network requests.
      self.addEventListener('install', (event) => {
        event.waitUntil(self.skipWaiting());
      });

      self.addEventListener('activate', (event) => {
        event.waitUntil(self.clients.claim());
        console.log('Development Service Worker activated.');
      });
    `;

  return new NextResponse(swScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}
