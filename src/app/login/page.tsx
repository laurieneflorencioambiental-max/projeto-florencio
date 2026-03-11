'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, initializeFirebase } from '@/firebase';
import { Briefcase, Loader2, Eye, EyeOff } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { signInWithEmailAndPassword, type UserCredential } from 'firebase/auth';
import type { AppSettings } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { logClientEvent } from '@/lib/audit-client';

const loginSchema = z.object({
  email: z.string().trim().email('Por favor, insira um email válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<Partial<AppSettings>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Fetch settings from Firestore for unauthenticated users
    const fetchSettings = async () => {
      try {
        const { firestore } = initializeFirebase();
        if (firestore) {
          const settingsRef = doc(firestore, 'app-settings', 'global');
          const docSnap = await getDoc(settingsRef);
          if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
          }
        }
      } catch (error) {
        console.error('Failed to load global settings from Firestore:', error);
      }
    };
    fetchSettings();
  }, []);

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      // Log the audit event via the Cloud Function
      logClientEvent('login', auth);

      toast({
        title: 'Login bem-sucedido!',
        description: 'Você será redirecionado em breve.',
      });
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      let description: string;
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            description = 'Email ou senha inválidos.';
            break;
          case 'auth/invalid-email':
            description = 'O formato do email é inválido.';
            break;
          default:
            description = `Falha no login. Verifique suas credenciais. (Código: ${error.code})`;
            break;
        }
      } else {
        description = `Ocorreu um erro de conexão. O app está tentando se conectar ao projeto: '${firebaseConfig.projectId}'. Verifique se este é o projeto correto e se o provedor 'Email/Senha' está ativado no painel do Firebase.`;
      }
      toast({
        variant: 'destructive',
        title: 'Erro no Login',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen w-full md:grid-cols-2">
      <div className="relative hidden bg-muted md:block">
        {settings.loginBackgroundUrl ? (
          <Image
            src={settings.loginBackgroundUrl}
            alt="Imagem de fundo da tela de login"
            fill
            className="object-contain"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-10">
            <Briefcase className="h-24 w-24 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center p-6 lg:p-8 bg-background">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Card className="w-full bg-sidebar text-sidebar-foreground shadow-2xl border-sidebar-border">
            <CardHeader className="text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                {settings.sidebarLogoUrl ? (
                  <img
                    src={settings.sidebarLogoUrl}
                    alt="Logo da Empresa"
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <Briefcase className="h-10 w-10 text-sidebar-foreground flex-shrink-0" />
                )}
                <div className="flex flex-col text-left">
                  <h2 className="text-xl font-headline font-bold text-sidebar-foreground leading-tight">
                    Comercial
                  </h2>
                  <p className="text-base text-sidebar-foreground/80 leading-tight">
                    Grupo Florencio
                  </p>
                </div>
              </div>
              <CardTitle>Acessar Plataforma</CardTitle>
              <CardDescription className="text-sidebar-foreground/80">
                Use seu email e senha para entrar.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register('email')}
                    disabled={isSubmitting}
                    className="bg-sidebar-accent border-sidebar-border placeholder:text-sidebar-foreground/70 focus:bg-sidebar"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      disabled={isSubmitting}
                      className="bg-sidebar-accent border-sidebar-border placeholder:text-sidebar-foreground/70 focus:bg-sidebar pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                      aria-label={
                        showPassword ? 'Esconder senha' : 'Mostrar senha'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Entrar
                </Button>
              </CardFooter>
            </form>
          </Card>
          <p className="px-8 text-center text-xs text-muted-foreground">
            Não tem uma conta? Peça ao seu gestor para criar um acesso para você.
          </p>
        </div>
      </div>
    </main>
  );
}
