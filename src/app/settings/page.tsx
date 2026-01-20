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
import { Loader2, UploadCloud, Trash2, Image as ImageIcon, Briefcase } from 'lucide-react';
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

const MAX_PROPOSAL_LOGO_SIZE_KB = 50;
const MAX_SIDEBAR_LOGO_SIZE_KB = 20;

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [proposalLogoPreview, setProposalLogoPreview] = useState<string | null>(null);
  const [sidebarLogoPreview, setSidebarLogoPreview] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);

  const proposalFileInputRef = useRef<HTMLInputElement>(null);
  const sidebarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    } else if (user) {
      try {
        const savedProposalLogo = localStorage.getItem('companyLogo');
        if (savedProposalLogo) {
          setProposalLogoPreview(savedProposalLogo);
        }
        const savedSidebarLogo = localStorage.getItem('sidebarLogo');
        if (savedSidebarLogo) {
          setSidebarLogoPreview(savedSidebarLogo);
        }
      } catch (error) {
        console.error('Failed to load logos from localStorage:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar logos',
          description: 'Não foi possível carregar os logos salvos.',
        });
      }
    }
  }, [user, isUserLoading, router, toast]);

  const handleLogoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    logoType: 'proposal' | 'sidebar'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = logoType === 'proposal' ? MAX_PROPOSAL_LOGO_SIZE_KB : MAX_SIDEBAR_LOGO_SIZE_KB;
    const localStorageKey = logoType === 'proposal' ? 'companyLogo' : 'sidebarLogo';
    const setPreview = logoType === 'proposal' ? setProposalLogoPreview : setSidebarLogoPreview;

    if (file.size > maxSize * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: `O logo deve ter no máximo ${maxSize}KB.`,
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      try {
        localStorage.setItem(localStorageKey, base64String);
        setPreview(base64String);
        toast({
          title: 'Logo atualizado!',
          description: 'Seu novo logo foi salvo com sucesso.',
        });
        // Also fire a storage event so other tabs can update
        window.dispatchEvent(new StorageEvent('storage', {
            key: localStorageKey,
            newValue: base64String
        }));
      } catch (error) {
        console.error(`Failed to save ${logoType} logo to localStorage:`, error);
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar o logo. O armazenamento pode estar cheio.',
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (logoType: 'proposal' | 'sidebar') => {
    const localStorageKey = logoType === 'proposal' ? 'companyLogo' : 'sidebarLogo';
    const setPreview = logoType === 'proposal' ? setProposalLogoPreview : setSidebarLogoPreview;
    const fileInputRef = logoType === 'proposal' ? proposalFileInputRef : sidebarFileInputRef;

    try {
      localStorage.removeItem(localStorageKey);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: 'Logo removido',
        description: `O logo foi removido.`,
      });
       // Also fire a storage event so other tabs can update
       window.dispatchEvent(new StorageEvent('storage', {
            key: localStorageKey,
            newValue: null
       }));
    } catch (error) {
      console.error(`Failed to remove ${logoType} logo from localStorage:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível remover o logo.',
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
          <CardTitle>Aparência do Aplicativo</CardTitle>
          <CardDescription>
            Personalize a identidade visual da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Ícone da Barra Lateral</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {sidebarLogoPreview ? (
                  <img src={sidebarLogoPreview} alt="Pré-visualização do Ícone" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                 <Button onClick={() => sidebarFileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {sidebarLogoPreview ? 'Alterar Ícone' : 'Enviar Ícone'}
                </Button>
                {sidebarLogoPreview && (
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isUploading}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação removerá permanentemente o ícone da barra lateral.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveLogo('sidebar')}>
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
                    onChange={(e) => handleLogoUpload(e, 'sidebar')}
                    disabled={isUploading}
                />
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                Recomendado: PNG quadrado com fundo transparente, até {MAX_SIDEBAR_LOGO_SIZE_KB}KB, aprox. 64x64 pixels.
            </p>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                As alterações são salvas automaticamente no seu navegador.
            </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Aparência da Proposta</CardTitle>
          <CardDescription>
            Personalize a aparência das propostas comerciais com o logo da sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo da Empresa (para Propostas)</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {proposalLogoPreview ? (
                  <img src={proposalLogoPreview} alt="Pré-visualização do Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem logo</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                 <Button onClick={() => proposalFileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {proposalLogoPreview ? 'Alterar Logo' : 'Enviar Logo'}
                </Button>
                {proposalLogoPreview && (
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isUploading}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação removerá permanentemente o seu logo das propostas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveLogo('proposal')}>
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
                    onChange={(e) => handleLogoUpload(e, 'proposal')}
                    disabled={isUploading}
                />
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                Recomendado: PNG com fundo transparente, até {MAX_PROPOSAL_LOGO_SIZE_KB}KB, aprox. 400x150 pixels.
            </p>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                As alterações são salvas automaticamente no seu navegador.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
