
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
  SidebarMenuSkeleton,
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
  User as UserIcon,
  Shield,
} from 'lucide-react';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { AppSettings, UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { logAuditEvent } from '@/lib/audit';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
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
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = userProfile?.isAdmin === true;
  const permissions = userProfile?.permissions;
  const isLoadingPermissions = isUserLoading || isProfileLoading;

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
    if (pathname === '/audit') return 'Auditoria do Sistema';
    if (pathname === '/profile') return 'Meu Perfil';
    return 'Comercial Florencio';
  };

  const handleLogout = async () => {
    if (user && firestore) {
      await logAuditEvent(firestore, user, 'logout');
    }
    await auth.signOut();
    router.push('/login');
  };

  const getUserInitials = (displayName?: string | null, email?: string | null) => {
    if (displayName) {
      const parts = displayName.split(' ').filter(p => p);
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '...';
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
            {isLoadingPermissions ? (
              <>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
              </>
            ) : (
              <>
                {(isAdmin || permissions?.canViewDashboard) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/')} isActive={pathname === '/'} tooltip="Dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewBudgets) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/budgets')} isActive={pathname === '/budgets'} tooltip="Funil de Vendas">
                      <KanbanSquare />
                      <span>Funil de Vendas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewTemplates) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/templates')} isActive={pathname === '/templates'} tooltip="Modelos de Proposta">
                      <FileText />
                      <span>Modelos de Proposta</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewCatalog) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/catalog')} isActive={pathname === '/catalog'} tooltip="Catálogo de Serviços">
                      <BookMarked />
                      <span>Catálogo de Serviços</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewMarketing) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/marketing')} isActive={pathname === '/marketing'} tooltip="Marketing">
                      <TrendingUp />
                      <span>Marketing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewAnalytics) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/analytics')} isActive={pathname === '/analytics'} tooltip="Análise">
                      <BarChartHorizontal />
                      <span>Análise</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewAgenda) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/agenda')} isActive={pathname === '/agenda'} tooltip="Agenda">
                      <Calendar />
                      <span>Agenda</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(isAdmin || permissions?.canViewPricing) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/pricing')} isActive={pathname === '/pricing'} tooltip="Precificação">
                      <Calculator />
                      <span>Precificação</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </>
            )}

            {/* Tutorial and Settings are handled separately */}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/tutorial')} isActive={pathname === '/tutorial'} tooltip="Tutorial do Sistema">
                <HelpCircle />
                <span>Tutorial</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isLoadingPermissions ? (
              <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
            ) : (
              isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/settings')} isActive={pathname === '/settings'} tooltip="Configurações">
                      <Settings />
                      <span>Configurações</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/audit')} isActive={pathname === '/audit'} tooltip="Auditoria">
                      <Shield />
                      <span>Auditoria</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors">
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.photoURL || user?.photoURL || undefined} />
                    <AvatarFallback>{getUserInitials(userProfile?.displayName, user?.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {userProfile?.displayName || user?.email}
                    </p>
                    <div className="h-5 mt-0.5">
                        {isLoadingPermissions ? (
                        <div className='w-16 h-4 bg-sidebar-accent/50 animate-pulse rounded-sm' />
                        ) : (
                        <Badge
                            variant="outline"
                            className={cn(
                            'text-xs px-1.5 py-0 border-transparent',
                            isAdmin
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                : 'bg-sidebar-accent/80 text-sidebar-accent-foreground'
                            )}
                        >
                            {isAdmin ? 'Gestor' : 'Vendedor'}
                        </Badge>
                        )}
                    </div>
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 bg-sidebar border-sidebar-border text-sidebar-foreground">
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-sidebar-border" />
                 <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
