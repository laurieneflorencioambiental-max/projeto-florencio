import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'Florencio Sales Manager',
    short_name: 'Florencio CRM',
    description: 'Gestão comercial para o Grupo Florencio',
    start_url: '/',
    display: 'standalone',
    background_color: '#d9f1f0',
    theme_color: '#1b7689',
    icons: [
      {
        "src": "https://via.placeholder.com/192.png/1b7689/FFFFFF?text=F",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "https://via.placeholder.com/512.png/1b7689/FFFFFF?text=F",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
