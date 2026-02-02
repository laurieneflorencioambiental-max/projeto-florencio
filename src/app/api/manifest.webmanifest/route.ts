import { NextResponse } from 'next/server';

export async function GET() {
  // Static manifest to ensure validity and remove external dependencies.
  // This guarantees PWA installability.
  const manifest = {
    name: 'Florencio Sales Manager',
    short_name: 'Florencio CRM',
    description: 'Gestão comercial para o Grupo Florencio',
    start_url: '/',
    display: 'standalone',
    background_color: '#d9f1f0', // App's main background color
    theme_color: '#1b7689', // App's primary theme color
    icons: [
      {
        src: 'https://picsum.photos/seed/florencio-crm/192/192',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any maskable',
      },
      {
        src: 'https://picsum.photos/seed/florencio-crm/512/512',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any maskable',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
