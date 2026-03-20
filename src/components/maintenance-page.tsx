'use client';

import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
      <Wrench className="h-16 w-16 text-primary" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Em Manutenção
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Estamos fazendo algumas melhorias no sistema.
      </p>
      <p className="text-base text-muted-foreground">
        Por favor, volte em alguns minutos.
      </p>
    </div>
  );
}
