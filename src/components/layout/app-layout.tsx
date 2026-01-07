'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Briefcase, Home, FileText } from 'lucide-react';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getPageTitle = () => {
    if (pathname === '/') return 'Gestão de Orçamentos';
    if (pathname === '/templates') return 'Modelos de Proposta';
    return 'Comercial Florencio';
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 p-2">
            <Briefcase className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
            <div className="flex flex-col">
              <h2 className="text-base font-headline font-bold text-sidebar-foreground leading-tight">
                Comercial
              </h2>
              <p className="text-sm text-sidebar-foreground/80 leading-tight">
                Grupo Florencio
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/')} isActive={pathname === '/'} tooltip="Orçamentos">
                <Home />
                <span>Orçamentos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/templates')} isActive={pathname === '/templates'} tooltip="Modelos de Proposta">
                <FileText />
                <span>Modelos de Proposta</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-headline font-semibold md:text-xl">
              {getPageTitle()}
            </h1>
          </div>
        </header>
        <main className="p-4 sm:p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
