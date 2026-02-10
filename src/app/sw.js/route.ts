
'use server';
import { NextResponse } from 'next/server';

// This route serves the service worker file.
export async function GET() {
  const swScript = `
    const CACHE_NAME = 'florencio-comercial-cache-v1';
    // urlsToCache is left empty in development to prevent caching issues.
    const urlsToCache = [];

    self.addEventListener('install', (event) => {
      // Perform install steps
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(function(cache) {
            console.log('Opened cache');
            if (urlsToCache.length > 0) {
              return cache.addAll(urlsToCache);
            }
          })
      );
    });

    self.addEventListener('fetch', (event) => {
      // For development, it's often best to bypass the cache to avoid stale data.
      // This fetch handler will simply fetch from the network.
      event.respondWith(fetch(event.request));
    });
  `;

  return new NextResponse(swScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}
