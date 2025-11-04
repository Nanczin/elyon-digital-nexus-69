import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, User, MessageSquare, Check, ArrowRight } from 'lucide-react'; // Adicionado ArrowRight
import { Tables } from '@/integrations/supabase/types';

interface MemberAreaPreviewContentProps {
  settings: any; // Usar o tipo PlatformSettings de AdminDesign.tsx
  onLogout: () => void;
  memberArea: Tables<'member_areas'> | null;
  modules: Tables<'modules'>[];
}

const MemberAreaPreviewContent: React.FC<MemberAreaPreviewContentProps> = ({ settings, onLogout, memberArea, modules }) => {
  const primaryColor = settings.colors?.button_background || '#E98B8B'; // Usar a nova cor padrão
  const textColor = settings.colors?.text_primary || '#1F2937';
  const secondaryTextColor = settings.colors?.text_secondary || '#6B7280';
  const cardBackground = settings.colors?.card_login || '#FFFFFF';
  const fontFamily = settings.global_font_family || 'Inter';
  const checkmarkBgColor = settings.colors?.checkmark_background || '#D1FAE5';
  const checkmarkIconColor = settings.colors?.checkmark_icon || '#059669';

  // Placeholder para o nome do usuário logado
  const userName = "Estevão Venancio Garcia"; 

  // Dados de módulos de exemplo se não houver módulos reais
  const defaultModules = [
    {
      id: 'welcome',
      title: 'Boas-vindas e orientações iniciais',
      description: 'Comece sua jornada aqui! Orientações essenciais para aproveitar ao máximo o Método Remãe.',
      banner_url: '/lovable-uploads/60aef8b0-cab0-4f83-87eb-eced18d89bff.png', // Exemplo de imagem
      isCompleted: true,
    },
    {
      id: 'recovery',
      title: 'Recuperação Pós-Parto: 30 Dias',
      description: 'Um plano de 30 dias para reconquistar seu corpo de forma saudável e segura.',
      banner_url: '/lovable-uploads/357f51bf-cb26-4978-b65c-17227703a149.png', // Exemplo de imagem
      isCompleted: true, // Marcar como completo para o preview
    },
    {
      id: 'exercises',
      title: 'Guia de Exercícios Seguros',
      description: 'Aprenda os melhores e mais seguros exercícios para fazer no pós-parto.',
      banner_url: '/lovable-uploads/a76239a2-eeaf-4efa-9312-9084cbcd1865.png', // Exemplo de imagem
      isCompleted: true, // Marcar como completo para o preview
    },
  ];

  const modulesToDisplay = modules.length > 0 ? modules.map(mod => ({
    id: mod.id,
    title: mod.title,
    description: mod.description || '',
    banner_url: mod.banner_url || '/placeholder.svg', // Usar placeholder se não houver banner
    isCompleted: true, // Para o preview, assumir completo para mostrar o checkmark
  })) : defaultModules;

  return (
    <div 
      className="w-full h-full flex flex-col overflow-auto p-4" 
      style={{ 
        backgroundColor: settings.colors?.background_login || '#F0F2F5',
        fontFamily: fontFamily 
      }}
    >
      {/* Header da Área de Membros */}
      <header 
        className="flex items-center justify-between p-4 mb-6 rounded-lg shadow-sm"
        style={{ 
          backgroundColor: settings.colors?.header_background || '#FFFFFF',
          borderBottom: `1px solid ${settings.colors?.header_border || '#E5E7EB'}`,
          color: settings.colors?.text_header || '#1F2937'
        }}
      >
        <div className="flex items-center space-x-3">
          {memberArea?.logo_url && (
            <img 
              src={memberArea.logo_url} 
              alt={memberArea.name || "Logo"} 
              className="h-8 w-8 object-contain" 
            />
          )}
          <span className="text-lg font-semibold">{memberArea?.name || "Área de Membros RE-MÃE"}</span>
        </div>
        <Button onClick={onLogout} variant="ghost" size="sm" style={{ color: secondaryTextColor }}>
          {userName.charAt(0).toUpperCase()}
        </Button>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-4 space-y-6">
        <h1 className="text-3xl font-bold" style={{ color: textColor }}>
          Olá, {userName}!
        </h1>
        <p className="text-lg" style={{ color: secondaryTextColor }}>
          Bem-vinda à sua área de membros. Escolha um módulo para começar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulesToDisplay.map((module) => (
            <Card 
              key={module.id} 
              className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              style={{ backgroundColor: cardBackground, color: settings.colors?.text_cards || textColor }}
            >
              <div className="relative aspect-video w-full bg-gray-200">
                {module.banner_url && (
                  <img 
                    src={module.banner_url} 
                    alt={module.title} 
                    className="w-full h-full object-cover" 
                  />
                )}
                {module.isCompleted && (
                  <div 
                    className="absolute top-4 right-4 p-2 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: checkmarkBgColor }}
                  >
                    <Check className="h-5 w-5" style={{ color: checkmarkIconColor }} />
                  </div>
                )}
              </div>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold" style={{ color: settings.colors?.text_cards || textColor }}>
                  {module.title}
                </h3>
                <p className="text-sm" style={{ color: secondaryTextColor }}>
                  {module.description}
                </p>
                <Button 
                  className="w-full flex items-center justify-center gap-2" 
                  style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
                >
                  Acessar Módulo <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemberAreaPreviewContent;