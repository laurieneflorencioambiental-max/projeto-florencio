'use client';

import { useEffect, useRef } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';

/**
 * Componente que gerencia o favicon de forma persistente.
 * Ele garante que o logo da Florencio (ou o personalizado) permaneça ativo,
 * combatendo qualquer tentativa automática do navegador ou do Firebase de resetar para o ícone padrão.
 */
export function DynamicFavicon() {
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app-settings', 'global') : null),
    [firestore]
  );
  const { data: settings } = useDoc<AppSettings>(settingsRef);
  const lastSetIconRef = useRef<string | null>(null);

  useEffect(() => {
    // Favicon SVG padrão (Maleta na cor #1b7689)
    const defaultFavicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231b7689' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='14' x='2' y='7' rx='2' ry='2'/%3E%3Cpath d='M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'/%3E%3C/svg%3E`;
    
    // Prioriza o sidebarLogoUrl ou o logo da proposta
    const logoUrl = settings?.sidebarLogoUrl || settings?.proposalLogoUrl || defaultFavicon;

    const forceFavicon = () => {
      // 1. Remover ícones indesejados (como o padrão do Firebase /favicon.ico)
      const icons = document.querySelectorAll("link[rel*='icon']");
      icons.forEach(icon => {
        const href = (icon as HTMLLinkElement).href;
        // Se o ícone atual for diferente do que queremos, nós o removemos ou atualizamos
        if (href !== logoUrl) {
          icon.parentNode?.removeChild(icon);
        }
      });

      // 2. Criar/Atualizar os links corretos
      const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
      rels.forEach(rel => {
        let link: HTMLLinkElement | null = document.querySelector(`link[rel='${rel}']`);
        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = logoUrl;
        // Se for SVG, definir o tipo corretamente
        if (logoUrl.startsWith('data:image/svg+xml')) {
          link.type = 'image/svg+xml';
        } else {
          link.removeAttribute('type');
        }
      });

      lastSetIconRef.current = logoUrl;
    };

    // Executar imediatamente
    forceFavicon();

    // Monitorar o DOM para garantir que nada mude o favicon nos primeiros segundos
    // (Útil para combater scripts que carregam depois)
    let checks = 0;
    const interval = setInterval(() => {
      forceFavicon();
      checks++;
      if (checks > 10) clearInterval(interval); // Parar após 10 segundos
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  return null;
}
