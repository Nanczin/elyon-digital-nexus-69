import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';

const ProjectContentPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6">
      <Button variant="outline" onClick={() => navigate('/admin/elyon-builder')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Projetos
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Gerenciar Conteúdo do Projeto: {projectId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta é a página para gerenciar o conteúdo (módulos, aulas) do projeto com ID: <span className="font-semibold">{projectId}</span>.
          </p>
          <p className="mt-4">
            Funcionalidade em desenvolvimento. Aqui você poderá criar e organizar seus módulos e aulas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectContentPage;