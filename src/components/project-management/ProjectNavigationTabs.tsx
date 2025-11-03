import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, Palette, BarChart3, MessageSquare, Settings } from 'lucide-react';

export interface Project {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface ProjectNavigationTabsProps {
  projectId: string;
  activeTab: 'content' | 'members' | 'design' | 'analytics' | 'community' | 'settings';
}

const ProjectNavigationTabs: React.FC<ProjectNavigationTabsProps> = ({ projectId, activeTab }) => {
  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:grid-cols-6">
        <TabsTrigger value="content" asChild>
          <Link to={`/admin/projects/${projectId}/content`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Conteúdo
          </Link>
        </TabsTrigger>
        <TabsTrigger value="members" asChild>
          <Link to={`/admin/projects/${projectId}/members`}>
            <Users className="mr-2 h-4 w-4" />
            Membros
          </Link>
        </TabsTrigger>
        <TabsTrigger value="design" asChild>
          <Link to={`/admin/projects/${projectId}/design`}>
            <Palette className="mr-2 h-4 w-4" />
            Design
          </Link>
        </TabsTrigger>
        <TabsTrigger value="analytics" asChild>
          <Link to={`/admin/projects/${projectId}/analytics`}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Link>
        </TabsTrigger>
        <TabsTrigger value="community" asChild>
          <Link to={`/admin/projects/${projectId}/community`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Comunidade
          </Link>
        </TabsTrigger>
        <TabsTrigger value="settings" asChild>
          <Link to={`/admin/projects/${projectId}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ProjectNavigationTabs;