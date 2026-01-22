'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Target, TrendingUp, Activity } from 'lucide-react';

export default function MarketingPage() {
  // Placeholder state and functions for ROI calculation
  const handleCalculateRoi = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, you would calculate ROI here
  };

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Plano de Ação de Marketing
          </CardTitle>
          <CardDescription>
            Defina e acompanhe suas iniciativas de marketing. Esta é uma área em desenvolvimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Funcionalidade de Plano de Ação em breve.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Aqui você poderá criar campanhas, definir metas e prazos.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Cálculo de Retorno sobre Investimento (ROI)
          </CardTitle>
          <CardDescription>
            Calcule o ROI de suas campanhas de marketing para avaliar a eficácia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculateRoi} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="investment">Investimento Total (R$)</Label>
                <Input id="investment" type="number" placeholder="Ex: 5000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue">Receita Gerada (R$)</Label>
                <Input id="revenue" type="number" placeholder="Ex: 25000" />
              </div>
            </div>
            <div className="flex justify-start">
              <Button type="submit">
                <TrendingUp className="mr-2 h-4 w-4" />
                Calcular ROI
              </Button>
            </div>
          </form>
           <div className="mt-6 p-6 bg-muted/50 rounded-lg text-center">
             <h3 className="text-lg font-medium text-muted-foreground">Seu ROI</h3>
             <p className="text-4xl font-bold text-primary mt-2">-%</p>
             <p className="text-sm text-muted-foreground mt-1">O resultado do seu cálculo aparecerá aqui.</p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
