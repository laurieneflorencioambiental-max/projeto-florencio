'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useAuth, useDoc, useMemoFirebase } from '@/firebase';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, User as UserIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { uploadImageAndGetUrl, deleteImageByUrl } from '@/firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_AVATAR_SIZE_KB = 500;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
    } else if (user) {
        setDisplayName(user.displayName || '');
    }
  }, [user, isUserLoading, userProfile, router]);
  
  const getUserInitials = (name: string) => {
    if (!name) return '..';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSaveProfile = async () => {
    if (!user || !userProfileRef) return;
    setIsSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName });
      // Update Firestore profile
      await updateDoc(userProfileRef, { displayName });

      toast({
        title: 'Sucesso!',
        description: 'Seu nome foi atualizado.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar seu nome.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !userProfileRef) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_KB * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: `A imagem deve ter no máximo ${MAX_AVATAR_SIZE_KB}KB.`,
      });
      return;
    }

    setIsUploading(true);
    try {
      const oldUrl = userProfile?.photoURL || user.photoURL;

      const newUrl = await uploadImageAndGetUrl(file, 'profilePicture');

      // Update both Auth and Firestore
      await updateProfile(user, { photoURL: newUrl });
      await updateDoc(userProfileRef, { photoURL: newUrl });

      if (oldUrl) {
        // We can try to delete the old one, but don't block on it
        deleteImageByUrl(oldUrl).catch(err => console.warn("Failed to delete old profile picture:", err));
      }

      toast({
        title: 'Foto de perfil atualizada!',
      });
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: 'Não foi possível enviar a imagem.',
      });
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="flex flex-col gap-8">
      <Card className="max-w-2xl mx-auto w-full">
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>
            Atualize seu nome de exibição e sua foto de perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile?.photoURL || user?.photoURL || undefined} alt="Foto de Perfil" />
                  <AvatarFallback className="text-2xl">
                    {getUserInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? 'Enviando...' : 'Alterar Foto'}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveProfile} disabled={isSaving || isLoading}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
