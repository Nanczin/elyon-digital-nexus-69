import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, Package, CreditCard, BarChart3, Users } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const {
    user,
    isAdmin
  } = useAuth();
  
  const features = [{
    icon: Package,
    title: 'Produtos Digitais',
    description: 'Crie e gerencie seus infoprodutos com facilidade'
  }, {
    icon: CreditCard,
    title: 'Checkouts Personalizados',
    description: 'Páginas de vendas otimizadas para conversão'
  }, {
    icon: BarChart3,
    title: 'Analytics Avançados',
    description: 'Acompanhe suas vendas e métricas em tempo real'
  }, {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Mantenha relacionamento com seus compradores'
  }];
  
  return (
    <div>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/60aef8b0-cab0-4f83-87eb-eced18d89bff.png" 
              alt="Logo Elyon" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold text-foreground">Elyon</span>
          </Link>
          
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Criar conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="hero-section relative flex justify-center items-center z-[1]" 
        style={{ 
          backgroundImage: `url('/lovable-uploads/db2f06d9-33b1-4a0b-817b-81cb3e2b0760.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          width: '100vw',
          height: 'calc(100vh + 100px)',
          marginTop: '-100px',
          paddingTop: '0',
          boxSizing: 'border-box',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          zIndex: 1
        }}
      >
        {/* Overlay darker in light mode, slightly lighter in dark mode */}
        <div className="absolute inset-0 bg-black/70 dark:bg-transparent"></div>
        
        <div className="text-center relative z-10 w-full max-w-none px-0 mx-0">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Bem-vindo à <span className="text-primary">Elyon</span>
          </h1>
          
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            A plataforma completa para criadores de infoprodutos. 
            Crie, venda e gerencie seus produtos digitais com facilidade.
          </p>
          
          {/* Botões foram removidos conforme solicitado */}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para vender online
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nossa plataforma oferece todas as ferramentas necessárias 
              para o sucesso do seu negócio digital
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(feature => {
              const IconComponent = feature.icon;
              return (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="bg-primary/5 py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de criadores que já confiam na Elyon 
              para vender seus produtos digitais
            </p>
            {/* Botão removido conforme solicitado */}
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;