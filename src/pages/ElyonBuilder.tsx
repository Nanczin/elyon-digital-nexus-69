import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Layout, Users, Palette, BarChart3, MessageSquare, Shield, Blocks, FileText, BookOpen, Settings, Upload } from 'lucide-react';

const ElyonBuilder = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const features = [
    {
      icon: Layout,
      title: 'Gestão de Projetos',
      description: 'Crie e gerencie suas áreas de membros distintas, cada uma com sua própria configuração e conteúdo.',
      buttonText: 'Gerenciar Projetos',
      action: () => console.log('Gerenciar Projetos')
    },
    {
      icon: BookOpen,
      title: 'Gestão de Conteúdo',
      description: 'Organize seu conteúdo em módulos e aulas, suportando vídeos, PDFs, imagens e texto/HTML.',
      buttonText: 'Gerenciar Conteúdo',
      action: () => console.log('Gerenciar Conteúdo')
    },
    {
      icon: Users,
      title: 'Gestão de Membros',
      description: 'Adicione membros, controle o acesso a módulos específicos e gerencie o status de cada usuário.',
      buttonText: 'Gerenciar Membros',
      action: () => console.log('Gerenciar Membros')
    },
    {
      icon: Palette,
      title: 'Personalização de Design',
      description: 'Personalize o logo, cores, fontes e textos da página de login para alinhar à sua marca.',
      buttonText: 'Personalizar Design',
      action: () => console.log('Personalizar Design')
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Monitore métricas chave como total de membros, aulas concluídas e atividade na comunidade.',
      buttonText: 'Ver Relatórios',
      action: () => console.log('Ver Relatórios')
    },
    {
      icon: MessageSquare,
      title: 'Comunidade',
      description: 'Modere posts e comentários criados pelos membros dentro dos módulos de conteúdo.',
      buttonText: 'Moderar Comunidade',
      action: () => console.log('Moderar Comunidade')
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Gerencie a segurança dos seus projetos e dados, incluindo a exclusão de áreas de membros.',
      buttonText: 'Configurar Segurança',
      action: () => console.log('Configurar Segurança')
    },
    {
      icon: Upload,
      title: 'Upload de Arquivos',
      description: 'Armazene seus vídeos, PDFs e imagens de forma segura para uso em suas aulas.',
      buttonText: 'Gerenciar Arquivos',
      action: () => console.log('Gerenciar Arquivos')
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Blocks className="h-8 w-8 text-primary" />
          Elyon Builder
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Plataforma no-code e white label para criar e gerenciar suas próprias áreas de membros personalizadas, focando na entrega de conteúdo e na experiência do usuário.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <CardDescription className="min-h-[60px]">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={feature.action} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {feature.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ElyonBuilder;