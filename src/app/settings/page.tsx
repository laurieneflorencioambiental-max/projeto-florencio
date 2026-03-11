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
  PlusCircle,
  Activity,
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
import type { AppSettings, DocumentReference, UserProfile, ProposalArea } from '@/lib/types';
import {
  uploadImageAndGetUrl,
  deleteImageByUrl,
  ImageType,
} from '@/firebase/storage';
import { doc, setDoc, getDoc, collection, writeBatch, getDocs, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { seedSellers, seedServices, seedTemplates, getSeedLeads, seedProposalAreas } from '@/lib/seed-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


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

  // Proposal Areas State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ProposalArea | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaAcronym, setNewAreaAcronym] = useState('');
  const [newAreaCode, setNewAreaCode] = useState('');
  
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app-settings', 'global') : null),
    [firestore]
  );
  
  const userProfileRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const areasQuery = useMemoFirebase(() => firestore ? collection(firestore, 'proposal-areas') : null, [firestore]);
  const { data: proposalAreas, isLoading: areAreasLoading } = useCollection<ProposalArea>(areasQuery);

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
  
  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!settingsRef) return;
    const updateData = { [key]: value };
    setDoc(settingsRef, updateData, { merge: true })
      .then(() => {
        setAppSettings(prev => ({ ...prev, [key]: value }));
        toast({ title: 'Configuração salva!' });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });
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

      const updateData = { [imageType]: newUrl };
      setDoc(settingsRef, updateData, { merge: true })
        .then(() => {
          setAppSettings(prev => ({ ...prev, [imageType]: newUrl }));
          if (oldUrl) deleteImageByUrl(oldUrl).catch(console.warn);
          toast({ title: `${config.name} atualizado(a)!`, description: 'Sua nova imagem foi salva com sucesso na nuvem.' });
        })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'update',
            requestResourceData: updateData,
          }));
        });

    } catch (error) {
      console.error(`Failed to upload ${imageType}:`, error);
      toast({ variant: 'destructive', title: 'Erro no Upload', description: 'Não foi possível completar o upload.' });
    } finally {
      setIsUploading(prev => ({ ...prev, [imageType]: false }));
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = (imageType: ImageType) => {
    if (!firestore || !settingsRef) return;

    const oldUrl = (appSettings as any)?.[imageType];

    const updateData = { [imageType]: null };
    setDoc(settingsRef, updateData, { merge: true })
      .then(() => {
        setAppSettings(prev => ({ ...prev, [imageType]: null }));
        if (oldUrl) deleteImageByUrl(oldUrl).catch(console.warn);
        toast({ title: 'Imagem removida' });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });
  };

  const handleCleanData = async () => {
    if (!firestore || !user) return;
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
            const item: any = docSnap.data();
            const itemDate = item?.createdAt ? toDate(item.createdAt) : null;
            if (itemDate && itemDate < cutoffDate) {
                docRefsToDelete.push(docSnap.ref);
            }
           });
        }
      }

      const deletedCount = docRefsToDelete.length;

      if (deletedCount === 0) {
        toast({ title: 'Nenhum dado para limpar' });
        setIsCleaning(false);
        return;
      }

      for (let i = 0; i < deletedCount; i += BATCH_LIMIT) {
        const batch = writeBatch(firestore);
        const chunk = docRefsToDelete.slice(i, i + BATCH_LIMIT);
        for (const docRef of chunk) batch.delete(docRef);
        await batch.commit();
      }

      toast({ title: 'Limpeza Concluída!', description: `${deletedCount} registro(s) foram removidos.` });
    } catch (error) {
      console.error('Error cleaning data:', error);
      toast({ variant: 'destructive', title: 'Erro na Limpeza' });
    } finally {
      setIsCleaning(false);
    }
  };
  
  const handleSeedData = async () => {
    if (!firestore || !user) return;
    setIsSeeding(true);

    try {
      const batch = writeBatch(firestore);

      seedSellers.forEach(seller => {
        const docRef = doc(collection(firestore, 'sellers'), seller.id);
        batch.set(docRef, { name: seller.name });
      });

      seedProposalAreas.forEach(area => {
        const docRef = doc(collection(firestore, 'proposal-areas'));
        batch.set(docRef, { ...area, id: docRef.id });
      });

      seedServices.forEach(service => {
        const docRef = doc(collection(firestore, 'services'));
        batch.set(docRef, { ...service, id: docRef.id });
      });

      seedTemplates.forEach(template => {
        const newDocRef = doc(collection(firestore, 'proposal-templates'));
        batch.set(newDocRef, { ...template, id: newDocRef.id });
      });

      const leadsToSeed = getSeedLeads(seedSellers, user.uid);
      leadsToSeed.forEach(lead => {
        const docRef = doc(collection(firestore, 'budgets'));
        batch.set(docRef, { ...lead, id: docRef.id, createdAt: serverTimestamp() });
      });

      await batch.commit();
      toast({ title: 'Sistema Populado!', description: 'Dados de demonstração adicionados.' });
    } catch (error) {
      console.error('Error seeding data:', error);
      toast({ variant: 'destructive', title: 'Erro ao popular dados' });
    } finally {
      setIsSeeding(false);
    }
  };

  const getCleanupDescription = () => {
    switch (cleanupPeriod) {
        case 'all': return 'Esta ação é irreversível e apagará TODOS OS DADOS da aplicação (orçamentos, vendedores, modelos, etc).';
        default: return `Esta ação é irreversível e apagará todos os orçamentos e propostas mais antigos que ${cleanupPeriod} dias.`;
    }
  };

  // Proposal Area Handlers
  const handleOpenAreaModal = (area?: ProposalArea) => {
    if (area) {
      setEditingArea(area);
      setNewAreaName(area.name);
      setNewAreaAcronym(area.acronym);
      setNewAreaCode(area.serviceCode);
    } else {
      setEditingArea(null);
      setNewAreaName('');
      setNewAreaAcronym('');
      setNewAreaCode('');
    }
    setIsAreaModalOpen(true);
  };

  const handleSaveArea = async () => {
    if (!firestore) return;
    
    if (!newAreaName || !newAreaAcronym || !newAreaCode) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Todos os campos são obrigatórios.' });
      return;
    }

    const areaData: Omit<ProposalArea, 'id'> = {
      name: newAreaName,
      acronym: newAreaAcronym.toUpperCase(),
      serviceCode: newAreaCode,
      active: editingArea ? editingArea.active : true,
    };

    try {
      if (editingArea) {
        const areaRef = doc(firestore, 'proposal-areas', editingArea.id);
        await updateDoc(areaRef, areaData);
        toast({ title: 'Área Atualizada' });
      } else {
        const newAreaRef = doc(collection(firestore, 'proposal-areas'));
        await setDoc(newAreaRef, { ...areaData, id: newAreaRef.id });
        toast({ title: 'Área Cadastrada' });
      }
      setIsAreaModalOpen(false);
    } catch (error) {
      console.error('Error saving area:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar área' });
    }
  };

  const handleToggleAreaStatus = async (area: ProposalArea) => {
    if (!firestore) return;
    try {
      const areaRef = doc(firestore, 'proposal-areas', area.id);
      await updateDoc(areaRef, { active: !area.active });
      toast({ title: area.active ? 'Área Inativada' : 'Área Ativada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao alterar status' });
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'proposal-areas', id));
      toast({ title: 'Área Removida' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover área' });
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Configuração de Áreas de Proposta
          </CardTitle>
          <CardDescription>
            Gerencie as áreas de negócio e códigos de serviço para o prefixo das propostas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={() => handleOpenAreaModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Área
            </Button>
          </div>
          
          {areAreasLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposalAreas && proposalAreas.length > 0 ? (
                  proposalAreas.map(area => (
                    <TableRow key={area.id} className={!area.active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell><Badge variant="secondary">{area.acronym}</Badge></TableCell>
                      <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-sm">{area.serviceCode}</code></TableCell>
                      <TableCell>
                        <Badge variant={area.active ? 'default' : 'outline'} className={area.active ? 'bg-green-500' : ''}>
                          {area.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenAreaModal(area)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleAreaStatus(area)}>
                          {area.active ? <X className="h-4 w-4 text-amber-600" /> : <ShieldCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Área?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Você está prestes a excluir a área "{area.name}". Se esta área já foi usada em propostas, recomendamos apenas inativá-la para manter o histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteArea(area.id)}>Sim, excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Nenhuma área cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
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

      {/* Proposal Area Modal */}
      <Dialog open={isAreaModalOpen} onOpenChange={setIsAreaModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Editar Área' : 'Nova Área de Proposta'}</DialogTitle>
            <DialogDescription>
              Cadastre uma nova sigla e código para geração automática de propostas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="area-name">Nome da Área</Label>
              <Input id="area-name" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} placeholder="Ex: Segurança do Trabalho" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="area-acronym">Sigla (Prefixo)</Label>
                <Input id="area-acronym" value={newAreaAcronym} onChange={e => setNewAreaAcronym(e.target.value.toUpperCase())} placeholder="Ex: SST" maxLength={5} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="area-code">Código do Serviço</Label>
                <Input id="area-code" value={newAreaCode} onChange={e => setNewAreaCode(e.target.value)} placeholder="Ex: 001" maxLength={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAreaModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveArea}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
