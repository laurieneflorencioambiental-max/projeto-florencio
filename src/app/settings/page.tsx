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
import { Loader2, UploadCloud, Trash2, Image as ImageIcon } from 'lucide-react';
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

const MAX_LOGO_SIZE_KB = 50;

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    } else if (user) {
      try {
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
          setLogoPreview(savedLogo);
        }
      } catch (error) {
        console.error('Failed to load logo from localStorage:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar logo',
          description: 'Não foi possível carregar o logo salvo.',
        });
      }
    }
  }, [user, isUserLoading, router, toast]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE_KB * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: `O logo deve ter no máximo ${MAX_LOGO_SIZE_KB}KB.`,
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      try {
        localStorage.setItem('companyLogo', base64String);
        setLogoPreview(base64String);
        toast({
          title: 'Logo atualizado!',
          description: 'Seu novo logo foi salvo com sucesso.',
        });
      } catch (error) {
        console.error('Failed to save logo to localStorage:', error);
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

  const handleRemoveLogo = () => {
    try {
      localStorage.removeItem('companyLogo');
      setLogoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: 'Logo removido',
        description: 'O logo da empresa foi removido.',
      });
    } catch (error) {
      console.error('Failed to remove logo from localStorage:', error);
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
          <CardTitle>Aparência da Proposta</CardTitle>
          <CardDescription>
            Personalize a aparência das propostas comerciais com o logo da sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Pré-visualização do Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8" />
                    <p className="text-xs">Sem logo</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                 <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {logoPreview ? 'Alterar Logo' : 'Enviar Logo'}
                </Button>
                {logoPreview && (
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
                            Esta ação removerá permanentemente o seu logo. Você poderá enviar um novo a qualquer momento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRemoveLogo}>
                            Sim, remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
               <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                />
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                Recomendado: PNG com fundo transparente, até {MAX_LOGO_SIZE_KB}KB, aprox. 400x150 pixels.
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
