import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, User, MessageSquare, Check, ArrowRight } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom'; // Import Link

interface MemberAreaPreviewContentProps {
  settings: any; // Usar o tipo PlatformSettings de AdminDesign.tsx
  onLogout: () => void;
  memberArea: Tables<'member_areas'> | null;
  modules: Tables<'modules'>[];
}

const MemberAreaPreviewContent: React.FC<MemberAreaPreviewContentProps> = ({ settings, onLogout, memberArea, modules }) => {
  const primaryColor = settings.colors?.button_background || 'hsl(var(--member-area-primary))';
  const textColor = settings.colors?.text_primary || 'hsl(var(--member-area-text-dark))';
  const secondaryTextColor = settings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))';
  const cardBackground = settings.colors?.card_login || 'hsl(var(--member-area-card-background))';
  const fontFamily = settings.global_font_family || 'Nunito';
  const checkmarkBgColor = settings.colors?.checkmark_background || 'hsl(var(--member-area-checkmark-background))';
  const checkmarkIconColor = settings.colors?.checkmark_icon || 'hsl(var(--member-area-checkmark-icon))';

  // Placeholder para o nome do usuário logado
  const userName = "Estevão Venancio Garcia"; 
  const userInitial = userName.charAt(0).toUpperCase();
  const memberAreaNameInitials = memberArea?.name ? memberArea.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'MA';


  // Dados de módulos de exemplo se não houver módulos reais
  const defaultModules = [
    {
      id: 'welcome',
      title: 'Boas-vindas e orientações iniciais',
      description: 'Comece sua jornada aqui! Orientações essenciais para aproveitar ao máximo o Método Remãe.',
      banner_url: '/lovable-uploads/60aef8b0-cab0-41fd-9e08-b1335d8fe50f.png', // Exemplo de imagem
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
      className="w-full h-full flex flex-col overflow-auto" 
      style={{ 
        backgroundColor: settings.colors?.background_login || 'hsl(var(--member-area-background))',
        fontFamily: fontFamily 
      }}
    >
      {/* Header da Área de Membros */}
      <header 
        className="flex items-center justify-between h-[72px] px-4 sm:px-8 py-4 border-b"
        style={{ 
          backgroundColor: settings.colors?.background_login || 'hsl(var(--member-area-background))', // Use background_login
          borderBottom: `1px solid transparent`, // No border
          color: settings.colors?.text_header || 'hsl(var(--member-area-text-dark))'
        }}
      >
        <div className="flex items-center space-x-3">
          {settings.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt={memberArea?.name || "Logo da Plataforma"} 
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
          ) : (
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border border-gray-200">
              <AvatarFallback className="bg-white text-memberArea-text-dark text-lg sm:text-xl font-semibold">
                {memberAreaNameInitials}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-lg sm:text-xl font-semibold" style={{ color: textColor }}>{memberArea?.name || 'Área de Membros'}</span>
        </div>
        <Button onClick={onLogout} variant="ghost" size="sm" className="p-0 h-auto w-auto rounded-full">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-gray-200">
            <AvatarImage src={undefined} alt={userName} />
            <AvatarFallback className="bg-white text-memberArea-text-dark text-sm sm:text-base font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 px-4 sm:px-8 py-8 sm:py-16 text-center space-y-4 sm:space-y-6">
        <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: textColor }}>
          Olá, {userName}!
        </h1>
        <p className="text-lg sm:text-xl" style={{ color: secondaryTextColor }}>
          Bem-vindo(a) à sua área de membros. Escolha um módulo para começar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mt-8 sm:mt-16 max-w-6xl mx-auto">
          {modulesToDisplay.length === 0 && (
            <p className="text-memberArea-text-muted text-sm sm:text-base">Nenhum módulo disponível para você ainda.</p>
          )}
          {modulesToDisplay.length > 0 && (
            modulesToDisplay.map((module) => (
              <Card 
                key={module.id} 
                className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl"
                style={{ backgroundColor: cardBackground, color: settings.colors?.text_cards || textColor }}
              >
                <div className="relative aspect-video w-full bg-gray-200"> {/* Alterado para aspect-video e removido h-XX */}
                  {module.banner_url && (
                    <img 
                      src={module.banner_url} 
                      alt={module.title} 
                      className={`w-full h-full object-cover ${module.isCompleted ? '' : 'grayscale brightness-50'}`} 
                    />
                  )}
                  {module.isCompleted && (
                    <div 
                      className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full"
                      style={{ backgroundColor: checkmarkBgColor }}
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: checkmarkIconColor }} />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 sm:p-6 space-y-2 sm:space-y-4 flex flex-col flex-1">
                  <h3 className="text-lg sm:text-xl font-bold" style={{ color: settings.colors?.text_cards || textColor }}>
                    {module.title}
                  </h3>
                  <p className="text-xs sm:text-sm flex-1" style={{ color: secondaryTextColor }}>
                    {module.description}
                  </p>
                  
                  <Button 
                    className="w-full h-10 sm:h-12 rounded-lg flex items-center justify-center gap-2 font-semibold hover:bg-memberArea-primary-hover transition-colors duration-300 text-sm sm:text-base"
                    style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
                    asChild
                  >
                    <Link to={`/membros/${memberArea?.id}/modules/${module.id}`}>
                      Acessar Módulo <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberAreaPreviewContent;