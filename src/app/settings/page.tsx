'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Briefcase,
  Moon,
  Sun,
  Wallpaper,
  FileImage,
  AlertTriangle,
  Clock,
  Bot,
  Users,
  ShieldCheck,
  Shield,
  Target,
  HelpCircle,
  TrendingUp,
  BarChartHorizontal,
  LayoutDashboard,
  KanbanSquare,
  FileText,
  BookMarked,
  Calculator,
  Calendar,
  Pencil,
  Save,
  X,
  MapPin,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { AppSettings, DocumentReference, UserProfile } from '@/lib/types';
import {
  uploadImageAndGetUrl,
  deleteImageByUrl,
  ImageType,
} from '@/firebase/storage';
import { doc, setDoc, getDoc, collection, writeBatch, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { seedSellers, seedServices, seedTemplates, getSeedLeads } from '@/lib/seed-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


const MAX_PROPOSAL_LOGO_SIZE_KB = 50;
const MAX_SIDEBAR_LOGO_SIZE_KB = 20;
const MAX_LOGIN_BG_SIZE_KB = 2000;
const MAX_PROPOSAL_COVER_SIZE_KB = 2000;
const MAX_PROPOSAL_LOCATION_SIZE_KB = 2000;
const MAX_PROPOSAL_CLOSING_SIZE_KB = 2000;

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUploading, setIsUploading] =
    useState<Partial<Record<ImageType, boolean>>>();
  const [appSettings, setAppSettings] = useState<Partial<AppSettings>>({});
  const [areSettingsLoading, setAreSettingsLoading] = useState(true);

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupPeriod, setCleanupPeriod] = useState<'all' | 30 | 60 | 90 | 365>('all');
  const [isSeeding, setIsSeeding] = useState(false);
  
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app-settings', 'global') : null),
    [firestore]
  );
  
  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const isLoadingPermissions = isUserLoading || isProfileLoading;


  useEffect(() => {
    if (settingsRef) {
      if (!areSettingsLoading) setAreSettingsLoading(true);
      getDoc(settingsRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            setAppSettings(docSnap.data() as AppSettings);
          } else {
            setAppSettings({});
          }
        })
        .catch(error => {
          console.error('Failed to fetch settings:', error);
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar configurações',
          });
        })
        .finally(() => {
          setAreSettingsLoading(false);
        });
    } else if (!firestore && areSettingsLoading) {
      setAreSettingsLoading(false);
    }
  }, [settingsRef, firestore, toast]);

  const anyUploading = Object.values(isUploading || {}).some(v => v);

  const fileInputRefs = {
    proposalLogoUrl: useRef<HTMLInputElement>(null),
    sidebarLogoUrl: useRef<HTMLInputElement>(null),
    loginBackgroundUrl: useRef<HTMLInputElement>(null),
    proposalCoverUrl: useRef<HTMLInputElement>(null),
    proposalLocationUrl: useRef<HTMLInputElement>(null),
    proposalClosingUrl: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | null;
    const initialTheme =
      savedTheme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', isDark);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'theme', newValue: newTheme })
    );
  };
  
  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    if (!settingsRef) return;
    try {
        const newSettings = {...appSettings, [key]: value};
        await setDoc(settingsRef, { [key]: value }, { merge: true });
        setAppSettings(newSettings);
        toast({
            title: 'Configuração salva!',
        });
    } catch (error) {
        console.error('Failed to save setting:', error);
        toast({
            variant: 'destructive',
            title: 'Erro ao salvar',
            description: 'Não foi possível salvar a configuração.'
        });
    }
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: ImageType
  ) => {
    if (!firestore || !settingsRef) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const configMap = {
      proposalLogoUrl: {
        maxSize: MAX_PROPOSAL_LOGO_SIZE_KB,
        name: 'Logo da Proposta',
      },
      sidebarLogoUrl: {
        maxSize: MAX_SIDEBAR_LOGO_SIZE_KB,
        name: 'Ícone (Barra Lateral e Login)',
      },
      loginBackgroundUrl: {
        maxSize: MAX_LOGIN_BG_SIZE_KB,
        name: 'Imagem de Fundo do Login',
      },
      proposalCoverUrl: {
        maxSize: MAX_PROPOSAL_COVER_SIZE_KB,
        name: 'Capa da Proposta',
      },
      proposalLocationUrl: {
        maxSize: MAX_PROPOSAL_LOCATION_SIZE_KB,
        name: 'Nossa Localização Estratégica',
      },
      proposalClosingUrl: {
        maxSize: MAX_PROPOSAL_CLOSING_SIZE_KB,
        name: 'Página de Encerramento',
      },
      profilePicture: {
        maxSize: 500,
        name: "Foto de Perfil"
      }
    };
    const config = configMap[imageType];

    if (file.size > config.maxSize * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: `A imagem deve ter no máximo ${config.maxSize}KB.`,
      });
      return;
    }

    setIsUploading(prev => ({ ...prev, [imageType]: true }));
    try {
      const oldUrl = (appSettings as any)?.[imageType];

      const newUrl = await uploadImageAndGetUrl(file, imageType);

      await setDoc(settingsRef, { [imageType]: newUrl }, { merge: true });

      setAppSettings(prev => ({ ...prev, [imageType]: newUrl }));

      if (oldUrl) {
        await deleteImageByUrl(oldUrl);
      }

      toast({
        title: `${config.name} atualizado(a)!`,
        description: 'Sua nova imagem foi salva com sucesso na nuvem.',
      });
    } catch (error) {
      console.error(`Failed to upload ${imageType}:`, error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível completar o upload.';
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: errorMessage,
      });
    } finally {
      setIsUploading(prev => ({ ...prev, [imageType]: false }));
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = async (imageType: ImageType) => {
    if (!firestore || !settingsRef) return;

    const configMap = {
      proposalLogoUrl: { name: 'Logo da proposta' },
      sidebarLogoUrl: { name: 'Ícone (Barra Lateral e Login)' },
      loginBackgroundUrl: { name: 'Imagem de fundo' },
      proposalCoverUrl: { name: 'Capa da proposta' },
      proposalLocationUrl: { name: 'Nossa localização estratégica' },
      proposalClosingUrl: { name: 'Página de encerramento' },
      profilePicture: { name: 'Foto de Perfil' }
    };
    const config = configMap[imageType];

    try {
      const oldUrl = (appSettings as any)?.[imageType];

      await setDoc(settingsRef, { [imageType]: null }, { merge: true });

      setAppSettings(prev => ({ ...prev, [imageType]: null }));

      if (oldUrl) {
        await deleteImageByUrl(oldUrl);
      }

      toast({
        title: 'Imagem removida',
        description: `O(a) ${config.name} foi removido(a).`,
      });
    } catch (error) {
      console.error(`Failed to remove ${imageType}:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: `Não foi possível remover o(a) ${config.name}.`,
      });
    }
  };

  const handleCleanData = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }
    setIsCleaning(true);

    try {
      const BATCH_LIMIT = 500;
      const docRefsToDelete: DocumentReference[] = [];

      const collectionNames = [
        'budgets',
        'proposals',
        'sellers',
        'proposal-templates',
        'services',
      ];

      if (cleanupPeriod === 'all') {
        for (const name of collectionNames) {
          const collRef = collection(firestore, name);
          const snapshot = await getDocs(collRef);
          snapshot.forEach(doc => docRefsToDelete.push(doc.ref));
        }
      } else {
        const timeBasedCollectionNames = ['budgets', 'proposals'];
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - cleanupPeriod);

        for (const name of timeBasedCollectionNames) {
           const collRef = collection(firestore, name);
           const snapshot = await getDocs(collRef);
           snapshot.forEach(docSnap => {
              const item = docSnap.data();
              if (item.createdAt) {
                const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                if (itemDate < cutoffDate) {
                  docRefsToDelete.push(docSnap.ref);
                }
              }
           });
        }
      }

      const deletedCount = docRefsToDelete.length;

      if (deletedCount === 0) {
        toast({
          title: 'Nenhum dado para limpar',
          description: `Nenhum registro corresponde ao período selecionado.`,
        });
        setIsCleaning(false);
        return;
      }

      for (let i = 0; i < deletedCount; i += BATCH_LIMIT) {
        const batch = writeBatch(firestore);
        const chunk = docRefsToDelete.slice(i, i + BATCH_LIMIT);
        for (const docRef of chunk) {
          batch.delete(docRef);
        }
        await batch.commit();
      }

      toast({
        title: 'Limpeza Concluída!',
        description: `${deletedCount} registro(s) foram removidos com sucesso.`,
      });
    } catch (error) {
      console.error('Error cleaning data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Limpeza',
        description: 'Não foi possível remover os dados. Verifique as permissões do Firestore e tente novamente.',
      });
    } finally {
      setIsCleaning(false);
    }
  };
  
  const handleSeedData = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado ou banco de dados não conectado.' });
      return;
    }
    setIsSeeding(true);

    try {
      const batch = writeBatch(firestore);

      // Seed Sellers
      const sellersCollectionRef = collection(firestore, 'sellers');
      seedSellers.forEach(seller => {
        const docRef = doc(sellersCollectionRef, seller.id);
        batch.set(docRef, { name: seller.name });
      });

      // Seed Services
      const servicesCollectionRef = collection(firestore, 'services');
      seedServices.forEach(service => {
        const docRef = doc(servicesCollectionRef);
        batch.set(docRef, { ...service, id: docRef.id });
      });

      // Seed Templates
      const templatesCollectionRef = collection(firestore, 'proposal-templates');
      seedTemplates.forEach(template => {
        const newDocRef = doc(templatesCollectionRef);
        batch.set(newDocRef, { ...template, id: newDocRef.id });
      });

      // Seed Leads
      const leadsCollectionRef = collection(firestore, 'budgets');
      const leadsToSeed = getSeedLeads(seedSellers, user.uid);
      leadsToSeed.forEach(lead => {
        const docRef = doc(leadsCollectionRef);
        batch.set(docRef, { ...lead, id: docRef.id, createdAt: serverTimestamp() });
      });

      await batch.commit();

      toast({
        title: 'Sistema Populado!',
        description: 'Dados de demonstração foram adicionados com sucesso.',
      });
    } catch (error) {
      console.error('Error seeding data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao popular dados',
        description: 'Não foi possível adicionar os dados de teste. Verifique o console para mais detalhes.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const getCleanupDescription = () => {
    switch (cleanupPeriod) {
        case 'all':
            return 'Esta ação é irreversível e apagará TODOS OS DADOS da aplicação (orçamentos, vendedores, modelos, etc).';
        case 30:
            return 'Esta ação é irreversível e apagará todos os orçamentos e propostas mais antigos que 30 dias.';
        case 60:
            return 'Esta ação é irreversível e apagará todos os orçamentos e propostas mais antigos que 60 dias.';
        case 90:
            return 'Esta ação é irreversível e apagará todos os orçamentos e propostas mais antigos que 90 dias.';
        case 365:
            return 'Esta ação é irreversível e apagará todos os orçamentos e propostas mais antigos que 1 ano.';
    }
  };

  if (isUserLoading || !user || areSettingsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Tema de Aparência</CardTitle>
          <CardDescription>
            Selecione o tema para a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="dark-mode"
                className="text-base flex items-center gap-2"
              >
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                Modo Escuro
              </Label>
              <p className="text-sm text-muted-foreground">
                {theme === 'dark'
                  ? 'Desative para uma experiência com cores claras.'
                  : 'Ative para uma experiência com cores escuras.'}
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeChange}
              aria-label="Alternar modo escuro"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do Funil</CardTitle>
          <CardDescription>
            Personalize as regras e comportamento do seu funil de vendas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="stale-days">Dias para lead ser considerado inativo</Label>
            <div className='flex items-center gap-2'>
              <Clock className='h-5 w-5 text-muted-foreground'/>
              <Input
                id="stale-days"
                type="number"
                value={appSettings.staleLeadDays ?? 7}
                onChange={e => handleSettingChange('staleLeadDays', Number(e.target.value))}
                min="1"
              />
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Um alerta visual aparecerá nos cards da coluna "Pendente" que não forem atualizados por este período.
            </p>
          </div>
          <div className="space-y-2 max-w-sm pt-4 mt-4 border-t">
            <Label htmlFor="monthly-goal">Meta mensal de orçamentos aprovados</Label>
            <div className='flex items-center gap-2'>
              <Target className='h-5 w-5 text-muted-foreground'/>
              <Input
                id="monthly-goal"
                type="number"
                value={appSettings.monthlyGoal ?? 10}
                onChange={e => handleSettingChange('monthlyGoal', Number(e.target.value))}
                min="0"
              />
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Esta meta é usada no Dashboard para acompanhar o progresso de vendas.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Dados de Demonstração</CardTitle>
          <CardDescription>
            Popule o sistema com dados de teste para demonstração. Isso irá criar vendedores, orçamentos, serviços e modelos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                Popular o Sistema
              </Label>
              <p className="text-sm text-muted-foreground">
                Clique no botão para adicionar um conjunto de dados de exemplo.
              </p>
            </div>
            <Button onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              {isSeeding ? 'Populando...' : 'Popular com Dados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência do Aplicativo</CardTitle>
          <CardDescription>
            Personalize a identidade visual da plataforma. As alterações são
            salvas na nuvem para todos os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Ícone (Barra Lateral e Login)</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {appSettings?.sidebarLogoUrl ? (
                  <img
                    src={appSettings.sidebarLogoUrl}
                    alt="Pré-visualização do Ícone"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => fileInputRefs.sidebarLogoUrl.current?.click()}
                  disabled={anyUploading}
                >
                  {isUploading?.sidebarLogoUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {appSettings?.sidebarLogoUrl ? 'Alterar Ícone' : 'Enviar Ícone'}
                </Button>
                {appSettings?.sidebarLogoUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={anyUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente o ícone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveImage('sidebarLogoUrl')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={fileInputRefs.sidebarLogoUrl}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={e => handleImageUpload(e, 'sidebarLogoUrl')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: PNG quadrado com fundo transparente, até{' '}
              {MAX_SIDEBAR_LOGO_SIZE_KB}KB.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tela de Login</CardTitle>
          <CardDescription>
            Personalize a imagem de fundo da tela de login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Imagem de Fundo</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
                {appSettings?.loginBackgroundUrl ? (
                  <img
                    src={appSettings.loginBackgroundUrl}
                    alt="Pré-visualização do Fundo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Wallpaper className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem imagem</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    fileInputRefs.loginBackgroundUrl.current?.click()
                  }
                  disabled={anyUploading}
                >
                  {isUploading?.loginBackgroundUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {appSettings?.loginBackgroundUrl
                    ? 'Alterar Imagem'
                    : 'Enviar Imagem'}
                </Button>
                {appSettings?.loginBackgroundUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={anyUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente a imagem de fundo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveImage('loginBackgroundUrl')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={fileInputRefs.loginBackgroundUrl}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => handleImageUpload(e, 'loginBackgroundUrl')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: Imagem vertical (ex: 1080x1920 pixels), até{' '}
              {MAX_LOGIN_BG_SIZE_KB}KB para melhor qualidade.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência da Proposta</CardTitle>
          <CardDescription>
            Personalize a aparência das propostas comerciais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {appSettings?.proposalLogoUrl ? (
                  <img
                    src={appSettings.proposalLogoUrl}
                    alt="Pré-visualização do Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem logo</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => fileInputRefs.proposalLogoUrl.current?.click()}
                  disabled={anyUploading}
                >
                  {isUploading?.proposalLogoUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {appSettings?.proposalLogoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                </Button>
                {appSettings?.proposalLogoUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={anyUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente o seu logo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveImage('proposalLogoUrl')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={fileInputRefs.proposalLogoUrl}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={e => handleImageUpload(e, 'proposalLogoUrl')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: PNG com fundo transparente, até{' '}
              {MAX_PROPOSAL_LOGO_SIZE_KB}KB.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Capa da Proposta</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
                {appSettings?.proposalCoverUrl ? (
                  <img
                    src={appSettings.proposalCoverUrl}
                    alt="Pré-visualização da Capa"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <FileImage className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem capa</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    fileInputRefs.proposalCoverUrl.current?.click()
                  }
                  disabled={anyUploading}
                >
                  {isUploading?.proposalCoverUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {appSettings?.proposalCoverUrl ? 'Alterar Capa' : 'Enviar Capa'}
                </Button>
                {appSettings?.proposalCoverUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={anyUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente a capa da proposta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveImage('proposalCoverUrl')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={fileInputRefs.proposalCoverUrl}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => handleImageUpload(e, 'proposalCoverUrl')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: Imagem em formato A4 (vertical, ex: 2480x3508
              pixels), até {MAX_PROPOSAL_COVER_SIZE_KB}KB.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Nossa Localização Estratégica</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
                {appSettings?.proposalLocationUrl ? (
                  <img
                    src={appSettings.proposalLocationUrl}
                    alt="Pré-visualização da Localização"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <MapPin className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem página</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    fileInputRefs.proposalLocationUrl.current?.click()
                  }
                  disabled={anyUploading}
                >
                  {isUploading?.proposalLocationUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {appSettings?.proposalLocationUrl ? 'Alterar Localização' : 'Enviar Localização'}
                </Button>
                {appSettings?.proposalLocationUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={anyUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente a página de localização estratégica.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveImage('proposalLocationUrl')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={fileInputRefs.proposalLocationUrl}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => handleImageUpload(e, 'proposalLocationUrl')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: Imagem em formato A4 (vertical, ex: 2480x3508
              pixels), até {MAX_PROPOSAL_LOCATION_SIZE_KB}KB.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Página de Encerramento</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
                {appSettings?.proposalClosingUrl ? (
                  <img
                    src={appSettings.proposalClosingUrl}
                    alt="Pré-visualização do Encerramento"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <FileImage className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem encerramento</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    fileInputRefs.proposalClosingUrl.current?.click()
                  }
                  disabled={anyUploading}
                >
                  {isUploading?.proposalClosingUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {appSettings?.proposalClosingUrl
                    ? 'Alterar Encerramento'
                    : 'Enviar Encerramento'}
                </Button>
                {appSettings?.proposalClosingUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={anyUploading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente a página de
                          encerramento.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleRemoveImage('proposalClosingUrl')
                          }
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={fileInputRefs.proposalClosingUrl}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => handleImageUpload(e, 'proposalClosingUrl')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: Imagem em formato A4 (vertical, ex: 2480x3508
              pixels), até {MAX_PROPOSAL_CLOSING_SIZE_KB}KB.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Zona de Perigo</CardTitle>
          <CardDescription>
            Ações nesta seção são permanentes e não podem ser desfeitas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div className="space-y-1">
              <Label
                className="text-base flex items-center gap-2"
              >
                Limpar Dados do Sistema
              </Label>
              <p className="text-sm text-muted-foreground">
                Remove permanentemente dados de acordo com o período selecionado.
              </p>
            </div>
            <div className='flex items-center gap-2'>
               <Select value={String(cleanupPeriod)} onValueChange={(value) => setCleanupPeriod(value === 'all' ? 'all' : Number(value) as any)}>
                <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Zerar todo o sistema</SelectItem>
                    <SelectItem value="365">Mais antigos que 1 ano</SelectItem>
                    <SelectItem value="90">Mais antigos que 90 dias</SelectItem>
                    <SelectItem value="60">Mais antigos que 60 dias</SelectItem>
                    <SelectItem value="30">Mais antigos que 30 dias</SelectItem>
                </SelectContent>
            </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCleaning}>
                    {isCleaning ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Trash2 className="mr-2 h-4 w-4" />}
                    {isCleaning ? 'Limpando...' : 'Limpar'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className='flex items-center gap-2'><AlertTriangle />Você tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {getCleanupDescription()}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanData}>
                      Sim, limpar dados
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
