import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, Package, CreditCard, BarChart3, Users } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  
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
    <div className="flex flex-col min-h-screen">
      {/* Cabeçalho fixo */}
      <header className="w-full px-8 py-4 flex justify-between items-center bg-background shadow-sm fixed top-0 left-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/lovable-uploads/357f51bf-cb26-4978-b65c-17227703a149.png" alt="Logo Elyon" className="h-8" />
          <span className="text-lg font-bold text-primary">ELYON</span>
        </div>
        <div className="flex gap-4">
          {!user ? (
            <>
              <Link to="/login">
                <Button variant="ghost" className="text-foreground hover:text-primary">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium">
                  Criar conta
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium">
                Dashboard
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero com imagem de fundo */}
      <main className="flex-grow">
        <div
          className="w-full h-screen bg-cover bg-center flex items-center justify-center"
          style={{ backgroundImage: "url('/lovable-uploads/db2f06d9-33b1-4a0b-817b-81cb3e2b0760.png')" }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 dark:bg-elyon-dark/50"></div>
          
          <div className="text-center text-white px-4 relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Bem-vindo à <span className="text-primary">Elyon</span>
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              A plataforma completa para criadores de infoprodutos. 
              Crie, venda e gerencie seus produtos digitais com facilidade.
            </p>
          </div>
        </div>
      </main>

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