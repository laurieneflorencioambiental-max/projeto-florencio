import { NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { firebaseConfig } from '@/firebase/config'
import type { AppSettings } from '@/lib/types'

// Ensure Firebase is initialized only once
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function GET() {
  let settings: Partial<AppSettings> = {};
  try {
    const settingsRef = doc(db, 'app-settings', 'global');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      settings = docSnap.data() as AppSettings;
    }
  } catch (error) {
    // Silently fail, manifest will have no icons if settings are not fetchable.
    console.error("Failed to fetch settings for manifest:", error);
  }

  // Use the sidebarLogoUrl if available.
  // It's better to have a single, scalable icon. The browser can handle resizing.
  // We tell the browser it can be used for any purpose, including as a "maskable" icon,
  // which helps it look good on all Android devices.
  const icons = settings.sidebarLogoUrl
    ? [
        {
          "src": settings.sidebarLogoUrl,
          "sizes": "any",
          "purpose": "any maskable"
        }
      ]
    : []; // If no logo, the browser will use a generic one.

  const manifest = {
    name: "Florencio Sales Manager",
    short_name: "Florencio CRM",
    description: "Gestão comercial para o Grupo Florencio",
    start_url: "/",
    display: "standalone",
    background_color: "#d9f1f0", // App's main background color
    theme_color: "#1b7689", // App's primary theme color
    icons: icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
