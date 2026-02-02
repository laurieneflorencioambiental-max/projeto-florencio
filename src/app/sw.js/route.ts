'use server';
import { NextResponse } from 'next/server';

// This route serves the service worker file.
export async function GET() {
  const swScript = `
    self.addEventListener('install', (event) => {
      // This event is triggered when the service worker is first installed.
      // You can pre-cache assets here if needed.
    });

    self.addEventListener('fetch', (event) => {
      // This simple fetch handler is sufficient to make the app installable.
      // It just passes the request to the network.
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
