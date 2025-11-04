import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { useLocation, useParams } from 'react-router-dom';

type PlatformSettings = Tables<'platform_settings'>;

const DEFAULT_FONT_FAMILY = 'Inter, sans-serif';

export const useGlobalPlatformSettings = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();

  const [globalFontFamily, setGlobalFontFamily] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    let currentMemberAreaId: string | null = null;

    // Tenta extrair memberAreaId da URL para páginas de administração de área de membros
    if (location.pathname.startsWith('/admin/member-areas/') && urlMemberAreaId) {
      currentMemberAreaId = urlMemberAreaId;
    }

    if (currentMemberAreaId) {
      // Busca as configurações para a área de membros específica
      const { data, error } = await supabase
        .from('platform_settings')
        .select('global_font_family')
        .eq('member_area_id', currentMemberAreaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = nenhuma linha retornada
        console.error('Erro ao buscar configurações da plataforma:', error);
        setGlobalFontFamily(DEFAULT_FONT_FAMILY);
      } else if (data?.global_font_family) {
        setGlobalFontFamily(data.global_font_family);
      } else {
        setGlobalFontFamily(DEFAULT_FONT_FAMILY);
      }
    } else {
      // Para páginas públicas ou se nenhum memberAreaId na URL, usa o padrão
      setGlobalFontFamily(DEFAULT_FONT_FAMILY);
    }
    setLoadingSettings(false);
  }, [location.pathname, urlMemberAreaId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    globalFontFamily,
    loadingSettings,
  };
};