import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIntegrations } from '@/hooks/useIntegrations';

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken?: string;
}

interface MetaPixelConfigProps {
  children: React.ReactNode;
}

const MetaPixelConfig: React.FC<MetaPixelConfigProps> = ({ children }) => {
  const { metaPixels, saveIntegrations, loading } = useIntegrations();
  const [isOpen, setIsOpen] = useState(false);
  const [newPixel, setNewPixel] = useState({
    name: '',
    pixelId: '',
    accessToken: ''
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addPixel = async () => {
    if (!newPixel.name || !newPixel.pixelId) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome e o ID do pixel",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const pixel: MetaPixel = {
        id: Date.now().toString(),
        ...newPixel
      };

      const updatedPixels = [...metaPixels, pixel];
      await saveIntegrations({ metaPixels: updatedPixels });
      
      setNewPixel({
        name: '',
        pixelId: '',
        accessToken: ''
      });

      toast({
        title: "Sucesso",
        description: "Meta Pixel salvo com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar Meta Pixel",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removePixel = async (id: string) => {
    try {
      setSaving(true);
      const updatedPixels = metaPixels.filter(pixel => pixel.id !== id);
      await saveIntegrations({ metaPixels: updatedPixels });
      
      toast({
        title: "Pixel removido",
        description: "Meta Pixel removido com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover Meta Pixel",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-xs sm:max-w-lg lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Configurar Meta Pixel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Pixels existentes */}
          {metaPixels.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Pixels Configurados</h3>
              {metaPixels.map((pixel) => (
                <Card key={pixel.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                      {pixel.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePixel(pixel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <p>Pixel ID: {pixel.pixelId}</p>
                      {pixel.accessToken && (
                        <p>Access Token: {pixel.accessToken.substring(0, 20)}...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Novo pixel */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Adicionar Novo Pixel</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pixelName">Nome do Pixel *</Label>
                <Input
                  id="pixelName"
                  value={newPixel.name}
                  onChange={(e) => setNewPixel({...newPixel, name: e.target.value})}
                  placeholder="Ex: Pixel Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="pixelId">Pixel ID *</Label>
                <Input
                  id="pixelId"
                  value={newPixel.pixelId}
                  onChange={(e) => setNewPixel({...newPixel, pixelId: e.target.value})}
                  placeholder="123456789012345"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <Label htmlFor="accessToken">Access Token (Opcional)</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={newPixel.accessToken}
                  onChange={(e) => setNewPixel({...newPixel, accessToken: e.target.value})}
                  placeholder="Para API de Conversões"
                />
              </div>
            </div>
            
            <Button onClick={addPixel} disabled={saving || loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Adicionar Pixel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetaPixelConfig;