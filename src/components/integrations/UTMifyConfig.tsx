import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useIntegrations } from '@/hooks/useIntegrations';

interface UTMifyConfig {
  apiKey: string;
  websiteId: string;
  trackPurchases: boolean;
  trackEvents: boolean;
  customDomain?: string;
}

interface UTMifyConfigProps {
  children: React.ReactNode;
}

const UTMifyConfig: React.FC<UTMifyConfigProps> = ({ children }) => {
  const { utmifyConfig, saveIntegrations, loading } = useIntegrations();
  const [config, setConfig] = useState<UTMifyConfig>({
    apiKey: '',
    websiteId: '',
    trackPurchases: true,
    trackEvents: true,
    customDomain: ''
  });
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (utmifyConfig) {
      setConfig(utmifyConfig);
    }
  }, [utmifyConfig]);

  const saveConfig = async () => {
    if (!config.apiKey || !config.websiteId) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a API Key e o Website ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await saveIntegrations({ utmifyConfig: config });
      
      toast({
        title: "Sucesso",
        description: "Configuração do UTMify salva com sucesso!",
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração do UTMify",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearConfig = async () => {
    try {
      setSaving(true);
      await saveIntegrations({ utmifyConfig: null });
      
      setConfig({
        apiKey: '',
        websiteId: '',
        trackPurchases: true,
        trackEvents: true,
        customDomain: ''
      });
      
      toast({
        title: "Configuração limpa",
        description: "Configuração do UTMify removida com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover configuração do UTMify",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = config.apiKey && config.websiteId;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurar UTMify</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status atual */}
          {isConfigured && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status da Configuração</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  <p>API Key: {config.apiKey.substring(0, 20)}...</p>
                  <p>Website ID: {config.websiteId}</p>
                  <p>Rastreamento de Compras: {config.trackPurchases ? 'Ativo' : 'Inativo'}</p>
                  <p>Rastreamento de Eventos: {config.trackEvents ? 'Ativo' : 'Inativo'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuração */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurações</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                  placeholder="sua-api-key-aqui"
                />
              </div>
              
              <div>
                <Label htmlFor="websiteId">Website ID *</Label>
                <Input
                  id="websiteId"
                  value={config.websiteId}
                  onChange={(e) => setConfig({...config, websiteId: e.target.value})}
                  placeholder="123456"
                />
              </div>
              
              <div>
                <Label htmlFor="customDomain">Domínio Personalizado (Opcional)</Label>
                <Input
                  id="customDomain"
                  value={config.customDomain}
                  onChange={(e) => setConfig({...config, customDomain: e.target.value})}
                  placeholder="track.seudominio.com"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trackPurchases">Rastrear Compras</Label>
                  <Switch
                    id="trackPurchases"
                    checked={config.trackPurchases}
                    onCheckedChange={(checked) => setConfig({...config, trackPurchases: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="trackEvents">Rastrear Eventos</Label>
                  <Switch
                    id="trackEvents"
                    checked={config.trackEvents}
                    onCheckedChange={(checked) => setConfig({...config, trackEvents: checked})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={saveConfig} disabled={saving || loading} className="flex-1">
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </Button>
              
              {isConfigured && (
                <Button variant="outline" onClick={clearConfig} disabled={saving || loading}>
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UTMifyConfig;