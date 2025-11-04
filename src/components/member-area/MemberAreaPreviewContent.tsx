import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, User, MessageSquare } from 'lucide-react';

interface MemberAreaPreviewContentProps {
  settings: any; // Usar o tipo PlatformSettings de AdminDesign.tsx
  onLogout: () => void;
}

const MemberAreaPreviewContent: React.FC<MemberAreaPreviewContentProps> = ({ settings, onLogout }) => {
  const primaryColor = settings.colors?.button_background || '#3b82f6';
  const textColor = settings.colors?.text_primary || '#1F2937';
  const secondaryTextColor = settings.colors?.text_secondary || '#6B7280';
  const cardBackground = settings.colors?.card_login || '#FFFFFF';
  const fontFamily = settings.global_font_family || 'Inter';

  return (
    <div 
      className="w-full h-full p-4 flex flex-col" 
      style={{ 
        backgroundColor: settings.colors?.background_login || '#F0F2F5',
        fontFamily: fontFamily 
      }}
    >
      <Card style={{ backgroundColor: cardBackground, color: textColor }} className="flex-1 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle style={{ color: textColor }} className="text-lg">
            Bem-vindo, Membro!
          </CardTitle>
          <Button onClick={onLogout} variant="outline" size="sm" style={{ borderColor: primaryColor, color: primaryColor }}>
            Sair
          </Button>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 pt-4">
          <p style={{ color: secondaryTextColor }}>
            Este é um preview de como sua área de membros aparecerá.
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2" style={{ color: textColor }}>
              <BookOpen className="h-5 w-5" style={{ color: primaryColor }} />
              <span className="font-medium">Módulo 1: Introdução</span>
            </div>
            <div className="flex items-center space-x-2" style={{ color: textColor }}>
              <User className="h-5 w-5" style={{ color: primaryColor }} />
              <span className="font-medium">Seu Perfil</span>
            </div>
            <div className="flex items-center space-x-2" style={{ color: textColor }}>
              <MessageSquare className="h-5 w-5" style={{ color: primaryColor }} />
              <span className="font-medium">Comunidade</span>
            </div>
          </div>
          <p className="text-xs mt-4" style={{ color: secondaryTextColor }}>
            O conteúdo real será exibido aqui após o login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberAreaPreviewContent;