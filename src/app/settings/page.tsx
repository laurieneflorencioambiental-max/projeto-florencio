'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
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
import { Switch } from '@/components/ui/switch';
import { uploadFile, deleteFile } from '@/firebase/storage';
import { AppSettings } from '@/lib/types';

const MAX_PROPOSAL_LOGO_SIZE_KB = 50;
const MAX_SIDEBAR_LOGO_SIZE_KB = 20;
const MAX_LOGIN_BG_SIZE_KB = 500;

type ImageType = 'proposalLogoUrl' | 'sidebarLogoUrl' | 'loginBackgroundUrl';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app-settings', 'customization') : null),
    [firestore]
  );
  const { data: settings, isLoading: areSettingsLoading } = useDoc<AppSettings>(settingsDocRef);
  
  const [previews, setPreviews] = useState<Partial<Record<ImageType, string | null>>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [isUploading, setIsUploading] = useState<
    Partial<Record<ImageType, boolean>>
  >({});
  const anyUploading = Object.values(isUploading).some(v => v);

  const fileInputRefs = {
    proposalLogoUrl: useRef<HTMLInputElement>(null),
    sidebarLogoUrl: useRef<HTMLInputElement>(null),
    loginBackgroundUrl: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme =
      savedTheme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (settings) {
      setPreviews({
        proposalLogoUrl: settings.proposalLogoUrl || null,
        sidebarLogoUrl: settings.sidebarLogoUrl || null,
        loginBackgroundUrl: settings.loginBackgroundUrl || null,
      });
      // Sync Firestore with localStorage for login page
      try {
        if(settings.proposalLogoUrl) localStorage.setItem('companyLogoUrl', settings.proposalLogoUrl);
        else localStorage.removeItem('companyLogoUrl');
        
        if(settings.sidebarLogoUrl) localStorage.setItem('sidebarLogoUrl', settings.sidebarLogoUrl);
        else localStorage.removeItem('sidebarLogoUrl');

        if(settings.loginBackgroundUrl) localStorage.setItem('loginBackgroundUrl', settings.loginBackgroundUrl);
        else localStorage.removeItem('loginBackgroundUrl');
      } catch (e) {
        console.error("Could not update localStorage from Firestore settings", e);
      }
    }
  }, [settings]);

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', isDark);
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: newTheme }));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: ImageType
  ) => {
    const file = event.target.files?.[0];
    if (!file || !settingsDocRef) return;

    const configMap = {
      proposalLogoUrl: { maxSize: MAX_PROPOSAL_LOGO_SIZE_KB, path: 'customization/proposal_logo', name: 'Logo da Proposta' },
      sidebarLogoUrl: { maxSize: MAX_SIDEBAR_LOGO_SIZE_KB, path: 'customization/sidebar_logo', name: 'Ícone (Barra Lateral e Login)' },
      loginBackgroundUrl: { maxSize: MAX_LOGIN_BG_SIZE_KB, path: 'customization/login_background', name: 'Imagem de Fundo do Login' },
    };
    const config = configMap[imageType];

    if (file.size > config.maxSize * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: `A imagem deve ter no máximo ${config.maxSize}KB.` });
      return;
    }

    setIsUploading(prev => ({ ...prev, [imageType]: true }));
    try {
      const downloadUrl = await uploadFile(config.path, file);

      await setDoc(settingsDocRef, { [imageType]: downloadUrl }, { merge: true });

      toast({ title: `${config.name} atualizado(a)!`, description: 'Sua nova imagem foi salva com sucesso.' });
       // Manually trigger localStorage update for other tabs
       localStorage.setItem(imageType === 'proposalLogoUrl' ? 'companyLogoUrl' : imageType, downloadUrl);
       window.dispatchEvent(new StorageEvent('storage', { key: imageType === 'proposalLogoUrl' ? 'companyLogoUrl' : imageType, newValue: downloadUrl }));


    } catch (error) {
      console.error(`Failed to upload ${imageType}:`, error);
      toast({ variant: 'destructive', title: 'Erro no Upload', description: 'Não foi possível enviar a imagem. Verifique sua conexão e as permissões de armazenamento do Firebase.' });
    } finally {
      setIsUploading(prev => ({ ...prev, [imageType]: false }));
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = async (imageType: ImageType) => {
    const configMap = {
      proposalLogoUrl: { key: 'companyLogoUrl', path: 'customization/proposal_logo', name: 'Logo da proposta' },
      sidebarLogoUrl: { key: 'sidebarLogoUrl', path: 'customization/sidebar_logo', name: 'Ícone (Barra Lateral e Login)' },
      loginBackgroundUrl: { key: 'loginBackgroundUrl', path: 'customization/login_background', name: 'Imagem de fundo' },
    };
    const config = configMap[imageType];

    if(!settingsDocRef) return;

    try {
      await deleteFile(config.path);
      await setDoc(settingsDocRef, { [imageType]: null }, { merge: true });

      toast({ title: 'Imagem removida', description: `O(a) ${config.name} foi removido(a).` });
       // Manually trigger localStorage update for other tabs
      localStorage.removeItem(config.key);
      window.dispatchEvent(new StorageEvent('storage', { key: config.key, newValue: null }));

    } catch (error) {
      console.error(`Failed to remove ${imageType}:`, error);
      toast({ variant: 'destructive', title: 'Erro ao remover', description: `Não foi possível remover o(a) ${config.name}. Verifique as permissões do Firebase Storage.` });
    }
  };

  if (isUserLoading || areSettingsLoading || !user) {
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
          <CardDescription>Selecione o tema para a plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="text-base flex items-center gap-2">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Modo Escuro
              </Label>
              <p className="text-sm text-muted-foreground">
                {theme === 'dark' ? 'Desative para uma experiência com cores claras.' : 'Ative para uma experiência com cores escuras.'}
              </p>
            </div>
            <Switch id="dark-mode" checked={theme === 'dark'} onCheckedChange={handleThemeChange} aria-label="Alternar modo escuro" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência do Aplicativo</CardTitle>
          <CardDescription>
            Personalize a identidade visual da plataforma. As alterações são salvas na nuvem e aplicadas a todos os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Ícone (Barra Lateral e Login)</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {previews.sidebarLogoUrl ? (
                  <img src={previews.sidebarLogoUrl} alt="Pré-visualização do Ícone" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRefs.sidebarLogoUrl.current?.click()} disabled={anyUploading}>
                  {isUploading.sidebarLogoUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {previews.sidebarLogoUrl ? 'Alterar Ícone' : 'Enviar Ícone'}
                </Button>
                {previews.sidebarLogoUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={anyUploading}><Trash2 className="mr-2 h-4 w-4" />Remover</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá permanentemente o ícone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveImage('sidebarLogoUrl')}>Sim, remover</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input ref={fileInputRefs.sidebarLogoUrl} type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={e => handleImageUpload(e, 'sidebarLogoUrl')} disabled={anyUploading} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recomendado: PNG quadrado com fundo transparente, até {MAX_SIDEBAR_LOGO_SIZE_KB}KB.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tela de Login</CardTitle>
          <CardDescription>Personalize a imagem de fundo da tela de login.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Imagem de Fundo</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
                {previews.loginBackgroundUrl ? (
                  <img src={previews.loginBackgroundUrl} alt="Pré-visualização do Fundo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground"><Wallpaper className="mx-auto h-8 w-8" /><p className="text-xs">Sem imagem</p></div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRefs.loginBackgroundUrl.current?.click()} disabled={anyUploading}>
                  {isUploading.loginBackgroundUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {previews.loginBackgroundUrl ? 'Alterar Imagem' : 'Enviar Imagem'}
                </Button>
                {previews.loginBackgroundUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={anyUploading}><Trash2 className="mr-2 h-4 w-4" />Remover</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá permanentemente a imagem de fundo.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveImage('loginBackgroundUrl')}>Sim, remover</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input ref={fileInputRefs.loginBackgroundUrl} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={e => handleImageUpload(e, 'loginBackgroundUrl')} disabled={anyUploading} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recomendado: Imagem com boa resolução, até {MAX_LOGIN_BG_SIZE_KB}KB.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência da Proposta</CardTitle>
          <CardDescription>Personalize a aparência das propostas comerciais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {previews.proposalLogoUrl ? (
                  <img src={previews.proposalLogoUrl} alt="Pré-visualização do Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto h-8 w-8" /><p className="text-xs">Sem logo</p></div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRefs.proposalLogoUrl.current?.click()} disabled={anyUploading}>
                  {isUploading.proposalLogoUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {previews.proposalLogoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                </Button>
                {previews.proposalLogoUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={anyUploading}><Trash2 className="mr-2 h-4 w-4" />Remover</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá permanentemente o seu logo.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveImage('proposalLogoUrl')}>Sim, remover</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input ref={fileInputRefs.proposalLogoUrl} type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={e => handleImageUpload(e, 'proposalLogoUrl')} disabled={anyUploading} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recomendado: PNG com fundo transparente, até {MAX_PROPOSAL_LOGO_SIZE_KB}KB.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
