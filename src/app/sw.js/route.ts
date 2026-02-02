'use server';
import { NextResponse } from 'next/server';

// This route serves the service worker file.
export async function GET() {
  const swScript = `
    const CACHE_NAME = 'florencio-comercial-cache-v1';
    const urlsToCache = [
      '/',
      '/budgets'
    ];

    self.addEventListener('install', (event) => {
      // Perform install steps
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(function(cache) {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
          })
      );
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(
        caches.match(event.request)
          .then(function(response) {
            // Cache hit - return response
            if (response) {
              return response;
            }
            return fetch(event.request);
          }
        )
      );
    });
  `;

  return new NextResponse(swScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}
