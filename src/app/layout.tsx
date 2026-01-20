'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/app-layout';
import { FirebaseClientProvider } from '@/firebase';

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isProposalPage = pathname.startsWith('/proposal/');

  return (
    <html lang="pt-BR">
      <head>
        <title>Florencio Sales Manager</title>
        <meta name="description" content="Gestão comercial para o Grupo Florencio" />
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
        <FirebaseClientProvider>
          {isLoginPage || isProposalPage ? children : <AppLayout>{children}</AppLayout>}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
