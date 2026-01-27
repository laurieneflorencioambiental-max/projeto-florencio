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
import {
  Briefcase,
  LayoutDashboard,
  KanbanSquare,
  FileText,
  LogOut,
  Settings,
  TrendingUp,
  Calendar,
  BarChartHorizontal,
  BookMarked,
  HelpCircle,
  Calculator,
} from 'lucide-react';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { AppSettings } from '@/lib/types';
import { doc } from 'firebase/firestore';

type UserProfile = {
  isAdmin: boolean;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app-settings', 'global') : null),
    [firestore]
  );
  const { data: settings } = useDoc<AppSettings>(settingsRef);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = userProfile?.isAdmin === true;

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname === '/budgets') return 'Funil de Vendas';
    if (pathname === '/templates') return 'Modelos de Proposta';
    if (pathname === '/catalog') return 'Catálogo de Serviços';
    if (pathname === '/marketing') return 'Gestão de Marketing';
    if (pathname === '/analytics') return 'Análise de Desempenho';
    if (pathname === '/agenda') return 'Agenda';
    if (pathname === '/pricing') return 'Precificação de Serviços';
    if (pathname === '/tutorial') return 'Tutorial do Sistema';
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
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 p-2">
            {settings?.sidebarLogoUrl ? (
              <img
                src={settings.sidebarLogoUrl}
                alt="Logo da Empresa"
                className="h-8 w-8 object-contain"
              />
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
              <SidebarMenuButton
                onClick={() => router.push('/')}
                isActive={pathname === '/'}
                tooltip="Dashboard"
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/budgets')}
                isActive={pathname === '/budgets'}
                tooltip="Funil de Vendas"
              >
                <KanbanSquare />
                <span>Funil de Vendas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/templates')}
                isActive={pathname === '/templates'}
                tooltip="Modelos de Proposta"
              >
                <FileText />
                <span>Modelos de Proposta</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/catalog')}
                isActive={pathname === '/catalog'}
                tooltip="Catálogo de Serviços"
              >
                <BookMarked />
                <span>Catálogo de Serviços</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => router.push('/marketing')}
                    isActive={pathname === '/marketing'}
                    tooltip="Marketing"
                  >
                    <TrendingUp />
                    <span>Marketing</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => router.push('/analytics')}
                    isActive={pathname === '/analytics'}
                    tooltip="Análise"
                  >
                    <BarChartHorizontal />
                    <span>Análise</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/agenda')}
                isActive={pathname === '/agenda'}
                tooltip="Agenda"
              >
                <Calendar />
                <span>Agenda</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/pricing')}
                isActive={pathname === '/pricing'}
                tooltip="Precificação"
              >
                <Calculator />
                <span>Precificação</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/tutorial')}
                isActive={pathname === '/tutorial'}
                tooltip="Tutorial do Sistema"
              >
                <HelpCircle />
                <span>Tutorial</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => router.push('/settings')}
                    isActive={pathname === '/settings'}
                    tooltip="Configurações"
                  >
                    <Settings />
                    <span>Configurações</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator />
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback>{getUserInitials(user?.email)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.displayName || user?.email}
              </p>
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
