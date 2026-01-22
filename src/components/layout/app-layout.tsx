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
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Briefcase, Home, FileText, LogOut, Settings } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const [sidebarLogo, setSidebarLogo] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs on the client-side after initial render.
    // It's safe to access localStorage here.
    const savedLogo = localStorage.getItem('sidebarLogoUrl');
    if (savedLogo) {
      setSidebarLogo(savedLogo);
    }

    // This listener will update the logo if it's changed in another tab (e.g., the settings page)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sidebarLogoUrl') {
        setSidebarLogo(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  const getPageTitle = () => {
    if (pathname === '/') return 'Gestão de Orçamentos';
    if (pathname === '/templates') return 'Modelos de Proposta';
    if (pathname === '/settings') return 'Configurações';
    return 'Comercial Florencio';
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const getUserInitials = (email: string | null | undefined) => {
    if (!email) return '...';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 p-2">
            {sidebarLogo ? (
                 <img src={sidebarLogo} alt="Logo da Empresa" className="h-8 w-8 object-contain" />
            ) : (
                <Briefcase className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
            )}
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
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push('/settings')} isActive={pathname === '/settings'} tooltip="Configurações">
                    <Settings />
                    <span>Configurações</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <div className='flex items-center gap-3 p-2'>
                <Avatar className='h-8 w-8'>
                    <AvatarImage src={user?.photoURL || undefined} />
                    <AvatarFallback>{getUserInitials(user?.email)}</AvatarFallback>
                </Avatar>
                <div className='flex flex-col overflow-hidden'>
                    <p className='text-sm font-medium text-sidebar-foreground truncate'>{user?.displayName || user?.email}</p>
                </div>
            </div>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
                        <LogOut />
                        <span>Sair</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
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
