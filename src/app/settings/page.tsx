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
import { uploadFile, deleteFile } from '@/firebase/storage';

const MAX_PROPOSAL_LOGO_SIZE_KB = 50;
const MAX_SIDEBAR_LOGO_SIZE_KB = 20;
const MAX_LOGIN_BG_SIZE_KB = 500;

type ImageType = 'proposal' | 'sidebar' | 'loginBackground';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [proposalLogoPreview, setProposalLogoPreview] = useState<string | null>(
    null
  );
  const [sidebarLogoPreview, setSidebarLogoPreview] = useState<string | null>(
    null
  );
  const [loginBgPreview, setLoginBgPreview] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [isUploading, setIsUploading] = useState<
    Partial<Record<ImageType, boolean>>
  >({});
  const anyUploading = Object.values(isUploading).some(v => v);

  const proposalFileInputRef = useRef<HTMLInputElement>(null);
  const sidebarFileInputRef = useRef<HTMLInputElement>(null);
  const loginBgFileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    } else if (user) {
      try {
        const savedProposalLogo = localStorage.getItem('companyLogoUrl');
        if (savedProposalLogo) setProposalLogoPreview(savedProposalLogo);

        const savedSidebarLogo = localStorage.getItem('sidebarLogoUrl');
        if (savedSidebarLogo) setSidebarLogoPreview(savedSidebarLogo);

        const savedLoginBg = localStorage.getItem('loginBackgroundUrl');
        if (savedLoginBg) setLoginBgPreview(savedLoginBg);
      } catch (error) {
        console.error('Failed to load assets from localStorage:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar personalizações',
          description: 'Não foi possível carregar as imagens salvas.',
        });
      }
    }
  }, [user, isUserLoading, router, toast]);

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', isDark);

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'theme', newValue: newTheme })
    );
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: ImageType
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const configMap = {
      proposal: {
        maxSize: MAX_PROPOSAL_LOGO_SIZE_KB,
        key: 'companyLogoUrl',
        path: 'customization/proposal_logo',
        setPreview: setProposalLogoPreview,
        name: 'Logo da Proposta',
      },
      sidebar: {
        maxSize: MAX_SIDEBAR_LOGO_SIZE_KB,
        key: 'sidebarLogoUrl',
        path: 'customization/sidebar_logo',
        setPreview: setSidebarLogoPreview,
        name: 'Ícone (Barra Lateral e Login)',
      },
      loginBackground: {
        maxSize: MAX_LOGIN_BG_SIZE_KB,
        key: 'loginBackgroundUrl',
        path: 'customization/login_background',
        setPreview: setLoginBgPreview,
        name: 'Imagem de Fundo do Login',
      },
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
      const downloadUrl = await uploadFile(config.path, file);

      localStorage.setItem(config.key, downloadUrl);
      config.setPreview(downloadUrl);
      toast({
        title: `${config.name} atualizado(a)!`,
        description: 'Sua nova imagem foi salva com sucesso.',
      });
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: config.key,
          newValue: downloadUrl,
        })
      );
    } catch (error) {
      console.error(`Failed to upload ${imageType}:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description:
          'Não foi possível enviar a imagem. Verifique sua conexão e as permissões de armazenamento do Firebase.',
      });
    } finally {
      setIsUploading(prev => ({ ...prev, [imageType]: false }));
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = async (imageType: ImageType) => {
    const configMap = {
      proposal: {
        key: 'companyLogoUrl',
        path: 'customization/proposal_logo',
        setPreview: setProposalLogoPreview,
        name: 'Logo da proposta',
        fileInputRef: proposalFileInputRef,
      },
      sidebar: {
        key: 'sidebarLogoUrl',
        path: 'customization/sidebar_logo',
        setPreview: setSidebarLogoPreview,
        name: 'Ícone (Barra Lateral e Login)',
        fileInputRef: sidebarFileInputRef,
      },
      loginBackground: {
        key: 'loginBackgroundUrl',
        path: 'customization/login_background',
        setPreview: setLoginBgPreview,
        name: 'Imagem de fundo',
        fileInputRef: loginBgFileInputRef,
      },
    };

    const config = configMap[imageType];

    try {
      localStorage.removeItem(config.key);
      config.setPreview(null);
      if (config.fileInputRef.current) {
        config.fileInputRef.current.value = '';
      }

      await deleteFile(config.path);

      toast({
        title: 'Imagem removida',
        description: `O(a) ${config.name} foi removido(a).`,
      });
      window.dispatchEvent(
        new StorageEvent('storage', { key: config.key, newValue: null })
      );
    } catch (error) {
      console.error(`Failed to remove ${imageType} from localStorage:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: `Não foi possível remover o(a) ${config.name}. Verifique as permissões do Firebase Storage.`,
      });
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
          <CardTitle>Aparência do Aplicativo</CardTitle>
          <CardDescription>
            Personalize a identidade visual da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Ícone (Barra Lateral e Login)</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {sidebarLogoPreview ? (
                  <img
                    src={sidebarLogoPreview}
                    alt="Pré-visualização do Ícone"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => sidebarFileInputRef.current?.click()}
                  disabled={anyUploading}
                >
                  {isUploading.sidebar ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {sidebarLogoPreview ? 'Alterar Ícone' : 'Enviar Ícone'}
                </Button>
                {sidebarLogoPreview && (
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
                          onClick={() => handleRemoveImage('sidebar')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={sidebarFileInputRef}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={e => handleImageUpload(e, 'sidebar')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: PNG quadrado com fundo transparente, até{' '}
              {MAX_SIDEBAR_LOGO_SIZE_KB}KB.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            As alterações são salvas automaticamente na nuvem.
          </p>
        </CardFooter>
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
                {loginBgPreview ? (
                  <img
                    src={loginBgPreview}
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
                  onClick={() => loginBgFileInputRef.current?.click()}
                  disabled={anyUploading}
                >
                  {isUploading.loginBackground ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {loginBgPreview ? 'Alterar Imagem' : 'Enviar Imagem'}
                </Button>
                {loginBgPreview && (
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
                          onClick={() => handleRemoveImage('loginBackground')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={loginBgFileInputRef}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => handleImageUpload(e, 'loginBackground')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: Imagem com boa resolução, até{' '}
              {MAX_LOGIN_BG_SIZE_KB}KB.
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
                {proposalLogoPreview ? (
                  <img
                    src={proposalLogoPreview}
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
                  onClick={() => proposalFileInputRef.current?.click()}
                  disabled={anyUploading}
                >
                  {isUploading.proposal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {proposalLogoPreview ? 'Alterar Logo' : 'Enviar Logo'}
                </Button>
                {proposalLogoPreview && (
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
                          onClick={() => handleRemoveImage('proposal')}
                        >
                          Sim, remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Input
                ref={proposalFileInputRef}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={e => handleImageUpload(e, 'proposal')}
                disabled={anyUploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: PNG com fundo transparente, até{' '}
              {MAX_PROPOSAL_LOGO_SIZE_KB}KB.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
