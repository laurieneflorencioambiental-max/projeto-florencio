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
import { Briefcase, Home } from 'lucide-react';
import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // We can use a more specific path if needed, for now let's assume root is the active page.
  const isActive = true;

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
              <SidebarMenuButton href="/" isActive={isActive} tooltip="Orçamentos">
                <Home />
                <span>Orçamentos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Future menu items will go here */}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-headline font-semibold md:text-xl">
            Gestão de Orçamentos
          </h1>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
