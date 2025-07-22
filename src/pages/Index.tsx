import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, Package, CreditCard, BarChart3, Users } from 'lucide-react';
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
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="py-20 relative bg-cover bg-center bg-no-repeat min-h-[80vh] flex items-center" 
        style={{ 
          backgroundImage: `url('/lovable-uploads/db2f06d9-33b1-4a0b-817b-81cb3e2b0760.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-elyon-dark/50"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Bem-vindo à <span className="text-primary">Elyon</span>
          </h1>
<p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            A plataforma completa para criadores de infoprodutos. 
            Crie, venda e gerencie seus produtos digitais com facilidade.
          </p>
          
{user ? <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAdmin && <Button size="lg" className="flex items-center gap-2 bg-primary hover:bg-primary/90" asChild>
                  <Link to="/admin/dashboard">
                    Ir para Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>}
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/20" asChild>
                <Link to="/payments">Ver Meus Pagamentos</Link>
              </Button>
            </div> : <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="flex items-center gap-2 bg-primary hover:bg-primary/90" asChild>
                <Link to="/auth/login">
                  Fazer Login
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/20" asChild>
                <Link to="/auth/register">Criar Conta</Link>
              </Button>
            </div>}
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
            return <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>;
          })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && <section className="bg-primary/5 py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de criadores que já confiam na Elyon 
              para vender seus produtos digitais
            </p>
            <Button size="lg" className="flex items-center gap-2 mx-auto" asChild>
              <Link to="/auth/register">
                Criar Conta Gratuita
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>}
    </div>;
};
export default Index;