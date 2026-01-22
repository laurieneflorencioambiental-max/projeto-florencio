'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/firebase';
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
import type { AppSettings } from '@/lib/types';

const MAX_PROPOSAL_LOGO_SIZE_KB = 50;
const MAX_SIDEBAR_LOGO_SIZE_KB = 20;
const MAX_LOGIN_BG_SIZE_KB = 500;

type ImageType = 'proposalLogoUrl' | 'sidebarLogoUrl' | 'loginBackgroundUrl';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [isUploading, setIsUploading] = useState<Partial<Record<ImageType, boolean>>>({});
  const anyUploading = Object.values(isUploading).some(v => v);

  const fileInputRefs = {
    proposalLogoUrl: useRef<HTMLInputElement>(null),
    sidebarLogoUrl: useRef<HTMLInputElement>(null),
    loginBackgroundUrl: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    
    try {
        const sidebarLogoUrl = localStorage.getItem('sidebarLogoUrl');
        const proposalLogoUrl = localStorage.getItem('proposalLogoUrl');
        const loginBackgroundUrl = localStorage.getItem('loginBackgroundUrl');
        setSettings({
            sidebarLogoUrl,
            proposalLogoUrl,
            loginBackgroundUrl,
        });
    } catch(e) {
        console.error("Failed to load settings from localStorage", e);
    }
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
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: newTheme }));
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: ImageType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const configMap = {
      proposalLogoUrl: { maxSize: MAX_PROPOSAL_LOGO_SIZE_KB, name: 'Logo da Proposta' },
      sidebarLogoUrl: { maxSize: MAX_SIDEBAR_LOGO_SIZE_KB, name: 'Ícone (Barra Lateral e Login)' },
      loginBackgroundUrl: { maxSize: MAX_LOGIN_BG_SIZE_KB, name: 'Imagem de Fundo do Login' },
    };
    const config = configMap[imageType];

    if (file.size > config.maxSize * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: `A imagem deve ter no máximo ${config.maxSize}KB.` });
      return;
    }

    setIsUploading(prev => ({ ...prev, [imageType]: true }));
    try {
      const base64Url = await fileToBase64(file);
      
      localStorage.setItem(imageType, base64Url);
      setSettings(prev => ({ ...prev, [imageType]: base64Url }));
      window.dispatchEvent(new StorageEvent('storage', { key: imageType, newValue: base64Url }));

      toast({ title: `${config.name} atualizado(a)!`, description: 'Sua nova imagem foi salva com sucesso.' });
    } catch (error) {
      console.error(`Failed to upload ${imageType}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível ler a imagem.';
      toast({ variant: 'destructive', title: 'Erro no Upload', description: errorMessage });
    } finally {
      setIsUploading(prev => ({ ...prev, [imageType]: false }));
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = (imageType: ImageType) => {
    const configMap = {
      proposalLogoUrl: { name: 'Logo da proposta' },
      sidebarLogoUrl: { name: 'Ícone (Barra Lateral e Login)' },
      loginBackgroundUrl: { name: 'Imagem de fundo' },
    };
    const config = configMap[imageType];

    try {
      localStorage.removeItem(imageType);
      setSettings(prev => ({ ...prev, [imageType]: null }));
       window.dispatchEvent(new StorageEvent('storage', { key: imageType, newValue: null }));

      toast({ title: 'Imagem removida', description: `O(a) ${config.name} foi removido(a).` });
    } catch (error) {
      console.error(`Failed to remove ${imageType}:`, error);
      toast({ variant: 'destructive', title: 'Erro ao remover', description: `Não foi possível remover o(a) ${config.name}.` });
    }
  };

  if (isUserLoading || !user) {
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
            Personalize a identidade visual da plataforma. As alterações são salvas localmente neste navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Ícone (Barra Lateral e Login)</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {settings.sidebarLogoUrl ? (
                  <img src={settings.sidebarLogoUrl} alt="Pré-visualização do Ícone" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRefs.sidebarLogoUrl.current?.click()} disabled={anyUploading}>
                  {isUploading.sidebarLogoUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {settings.sidebarLogoUrl ? 'Alterar Ícone' : 'Enviar Ícone'}
                </Button>
                {settings.sidebarLogoUrl && (
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
                {settings.loginBackgroundUrl ? (
                  <img src={settings.loginBackgroundUrl} alt="Pré-visualização do Fundo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground"><Wallpaper className="mx-auto h-8 w-8" /><p className="text-xs">Sem imagem</p></div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRefs.loginBackgroundUrl.current?.click()} disabled={anyUploading}>
                  {isUploading.loginBackgroundUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {settings.loginBackgroundUrl ? 'Alterar Imagem' : 'Enviar Imagem'}
                </Button>
                {settings.loginBackgroundUrl && (
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
                {settings.proposalLogoUrl ? (
                  <img src={settings.proposalLogoUrl} alt="Pré-visualização do Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto h-8 w-8" /><p className="text-xs">Sem logo</p></div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRefs.proposalLogoUrl.current?.click()} disabled={anyUploading}>
                  {isUploading.proposalLogoUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {settings.proposalLogoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                </Button>
                {settings.proposalLogoUrl && (
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
