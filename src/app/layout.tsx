'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppLayout from '@/components/layout/app-layout';
import { FirebaseClientProvider } from '@/firebase';
import MaintenancePage from '@/components/maintenance-page';
import { DynamicFavicon } from '@/components/dynamic-favicon';

/**
 * Root Layout principal da aplicação Comercial Florencio.
 * Gerencia o tema global, provedores do Firebase e layout condicional.
 * V-Trigger: 0.1.9 (Forcing clean build)
 */
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

  // Favicon SVG padrão com a cor da marca
  const defaultFavicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b7689' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='14' x='2' y='7' rx='2' ry='2'/%3E%3Cpath d='M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'/%3E%3C/svg%3E`;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Florencio Comercial</title>
        <meta
          name="description"
          content="Gestão comercial para o Grupo Florencio"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1b7689" />
        {/* Ícone no head para o carregamento inicial SSR */}
        <link rel="icon" type="image/svg+xml" href={defaultFavicon} />
        <link rel="shortcut icon" href={defaultFavicon} />
        <link rel="apple-touch-icon" href={defaultFavicon} />
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
            <DynamicFavicon />
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
