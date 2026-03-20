import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <h2 className="text-4xl font-bold text-primary mb-4">404</h2>
      <h3 className="text-xl font-semibold mb-4">Página não encontrada</h3>
      <p className="text-muted-foreground mb-8 max-w-md">
        O link que você acessou pode estar quebrado ou a página foi movida para um novo endereço.
      </p>
      <Button asChild>
        <Link href="/">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
