'use client';

import { useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';

/**
 * Componente que atualiza dinamicamente o favicon do site com base no logo da empresa
 * definido nas configurações. Caso não haja logo, utiliza um ícone de maleta nas cores da marca.
 */
export function DynamicFavicon() {
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app-settings', 'global') : null),
    [firestore]
  );
  const { data: settings } = useDoc<AppSettings>(settingsRef);

  useEffect(() => {
    // Favicon SVG padrão (Maleta na cor #1b7689)
    const defaultFavicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b7689' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='14' x='2' y='7' rx='2' ry='2'/%3E%3Cpath d='M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'/%3E%3C/svg%3E`;
    
    // Prioriza o sidebarLogoUrl (que costuma ser quadrado/ícone) ou o logo da proposta
    const logoUrl = settings?.sidebarLogoUrl || settings?.proposalLogoUrl || defaultFavicon;

    if (logoUrl) {
      const updateLink = (rel: string) => {
        let link: HTMLLinkElement | null = document.querySelector(`link[rel='${rel}']`);
        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = logoUrl;
      };

      updateLink('icon');
      updateLink('shortcut icon');
      updateLink('apple-touch-icon');
    }
  }, [settings]);

  return null;
}
