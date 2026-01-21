'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { useAuth, useUser } from '@/firebase';
import { Briefcase, Loader2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

const loginSchema = z.object({
  email: z.string().email('Por favor, insira um email válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarLogo, setSidebarLogo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Only try to access localStorage after initial auth check and if user is not logged in
    if (!isUserLoading && !user) {
      try {
        const savedSidebarLogo = localStorage.getItem('sidebarLogo');
        if (savedSidebarLogo) {
          setSidebarLogo(savedSidebarLogo);
        }
      } catch (error) {
        console.error('Failed to load sidebar logo from localStorage:', error);
      }
    }
  }, [isUserLoading, user]);


  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
                {sidebarLogo ? (
                    <img src={sidebarLogo} alt="Logo da Empresa" className="h-10 w-10 object-contain" />
                ) : (
                    <Briefcase className="h-10 w-10 text-primary flex-shrink-0" />
                )}
                <div className="flex flex-col text-left">
                <h2 className="text-xl font-headline font-bold text-foreground leading-tight">
                    Comercial
                </h2>
                <p className="text-base text-foreground/80 leading-tight">
                    Grupo Florencio
                </p>
                </div>
            </div>
          <CardTitle>Acessar Plataforma</CardTitle>
          <CardDescription>
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
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
      <p className="mt-4 text-center text-xs text-sidebar-foreground/70">
        Não tem uma conta? Peça ao seu gestor para criar um acesso para você.
      </p>
    </main>
  );
}
