import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { AppSettings } from '@/lib/types';

// Ensure Firebase is initialized only once
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function GET() {
  let settings: Partial<AppSettings> = {};
  let icons = [];

  try {
    const settingsRef = doc(db, 'app-settings', 'global');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      settings = docSnap.data() as AppSettings;
    }
  } catch (error) {
    // Silently fail, manifest will use fallback icons.
    console.error('Failed to fetch settings for manifest:', error);
  }

  // Use the sidebarLogoUrl if available, otherwise use fallback placeholder icons.
  if (settings.sidebarLogoUrl) {
    icons = [
      {
        src: settings.sidebarLogoUrl,
        sizes: '192x192',
        type: 'image/png', // Assuming png, but browser should handle it
        purpose: 'any',
      },
      {
        src: settings.sidebarLogoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: settings.sidebarLogoUrl,
        sizes: 'any',
        purpose: 'maskable', // Maskable icons are good for PWAs
      },
    ];
  } else {
    // Fallback icons to ensure the manifest is always valid
    icons = [
      {
        src: 'https://picsum.photos/seed/florencio-crm/192/192',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: 'https://picsum.photos/seed/florencio-crm/512/512',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ];
  }

  const manifest = {
    name: 'Florencio Sales Manager',
    short_name: 'Florencio CRM',
    description: 'Gestão comercial para o Grupo Florencio',
    start_url: '/',
    display: 'standalone',
    background_color: '#d9f1f0', // App's main background color
    theme_color: '#1b7689', // App's primary theme color
    icons: icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
