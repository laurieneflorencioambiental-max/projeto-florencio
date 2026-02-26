'use client';

import { useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';

/**
 * Componente que gerencia o favicon de forma persistente.
 * Atualiza os links existentes em vez de removê-los para evitar erros de reconciliação do React (removeChild null).
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
    
    // Prioriza o sidebarLogoUrl ou o logo da proposta
    const logoUrl = settings?.sidebarLogoUrl || settings?.proposalLogoUrl || defaultFavicon;

    const forceFavicon = () => {
      const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
      
      rels.forEach(rel => {
        // Busca todos os links com este rel (ou variações como link[rel='shortcut icon'])
        const links = document.querySelectorAll(`link[rel='${rel}'], link[rel*='${rel}']`);
        
        if (links.length > 0) {
          // ATUALIZA em vez de remover. Isso evita que o React perca a referência do nó.
          links.forEach(link => {
            const l = link as HTMLLinkElement;
            if (l.href !== logoUrl) {
              l.href = logoUrl;
              // Se for SVG, definir o tipo corretamente
              if (logoUrl.startsWith('data:image/svg+xml')) {
                l.type = 'image/svg+xml';
              }
            }
          });
        } else {
          // Cria apenas se não existir absolutamente nada para esse rel
          const link = document.createElement('link');
          link.rel = rel;
          link.href = logoUrl;
          if (logoUrl.startsWith('data:image/svg+xml')) {
            link.type = 'image/svg+xml';
          }
          document.head.appendChild(link);
        }
      });
    };

    // Executar imediatamente
    forceFavicon();

    // Monitorar o DOM por alguns segundos para garantir persistência contra outros scripts
    let checks = 0;
    const interval = setInterval(() => {
      forceFavicon();
      checks++;
      if (checks > 10) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  return null;
}
