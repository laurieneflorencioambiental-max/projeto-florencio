'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/app-layout';
import { FirebaseClientProvider } from '@/firebase';
import MaintenancePage from '@/components/maintenance-page';

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isProposalPage = pathname.startsWith('/proposal/');
  const isPartnershipPage = pathname.startsWith('/partnership/');

  useEffect(() => {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch(error => {
          console.error('Falha ao registrar o Service Worker:', error);
        });
    }

    const applyTheme = () => {
      const theme = localStorage.getItem('theme');
      if (
        theme === 'dark' ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const isInMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Florencio Sales Manager</title>
        <meta
          name="description"
          content="Gestão comercial para o Grupo Florencio"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1b7689" />
        <link rel="manifest" href="/api/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Roboto:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {isInMaintenance ? (
          <MaintenancePage />
        ) : (
          <FirebaseClientProvider>
            {isLoginPage || isProposalPage || isPartnershipPage ? (
              children
            ) : (
              <AppLayout>{children}</AppLayout>
            )}
            <Toaster />
          </FirebaseClientProvider>
        )}
      </body>
    </html>
  );
}
