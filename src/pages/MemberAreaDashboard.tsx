import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, BookOpen, User, MessageSquare, ArrowRight, Settings, LogOut, Lock } from 'lucide-react';
import { deepMerge } from '@/lib/utils';
import { useMemberAreaAuth } from '@/hooks/useMemberAreaAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProfileSettingsDialog from '@/components/member-area/ProfileSettingsDialog';
import { getDefaultSettings } from '@/hooks/useGlobalPlatformSettings';
import { FormFields, PackageConfig } from '@/integrations/supabase/types';

type PlatformSettings = Tables<'platform_settings'>;
type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;
type ProductAccess = Tables<'product_access'>;
type Checkout = Tables<'checkouts'>;

const MemberAreaDashboard = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const { user, loading: authLoading, signOut } = useMemberAreaAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [userProductAccessIds, setUserProductAccessIds] = useState<string[]>([]);
  const [productCheckoutLinks, setProductCheckoutLinks] = useState<Record<string, string>>({});

  const fetchMemberAreaAndContent = useCallback(async () => {
    if (!memberAreaId || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Member Area details
      const { data: areaData, error: areaError } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .maybeSingle();

      if (areaError || !areaData) {
        console.error('Error fetching member area:', areaError);
        toast({ title: "Erro", description: "Área de membros não encontrada.", variant: "destructive" });
        setHasAccess(false);
        setLoading(false);
        return;
      }
      setMemberArea(areaData);

      // 2. Fetch Platform Settings for this member area
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching platform settings:', settingsError);
      } else if (settingsData) {
        setSettings(deepMerge(getDefaultSettings(memberAreaId), { ...settingsData, colors: settingsData.colors as PlatformColors | null } as Partial<PlatformSettings>));
      } else {
        setSettings(getDefaultSettings(memberAreaId));
      }

      // 3. Check if user has access to this specific member area (profile.member_area_id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('member_area_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || profileData?.member_area_id !== memberAreaId) {
        setHasAccess(false);
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta área de membros.", variant: "destructive" });
        setLoading(false);
        return;
      }
      setHasAccess(true);

      // 4. Fetch ALL published modules for this member area
      const { data: allPublishedModulesData, error: allPublishedModulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('status', 'published')
        .order('order_index', { ascending: true });

      if (allPublishedModulesError) {
        console.error('Error fetching all published modules:', allPublishedModulesError);
        toast({ title: "Erro", description: "Falha ao carregar módulos.", variant: "destructive" });
        setModules([]);
      } else {
        setModules(allPublishedModulesData || []);
      }

      // 5. Fetch user's product access (from product_access table)
      const { data: accessData, error: accessError } = await supabase
        .from('product_access')
        .select('product_id')
        .eq('user_id', user.id);
      if (accessError) console.error('Error fetching product access:', accessError);
      const accessedProductIds = accessData?.map(a => a.product_id).filter(Boolean) as string[] || [];
      setUserProductAccessIds(accessedProductIds);
      console.log('MEMBER_AREA_DASHBOARD_DEBUG: User has access to products:', accessedProductIds);

      // 6. Fetch checkout links for products associated with modules
      const uniqueModuleProductIds = [...new Set(allPublishedModulesData?.map(m => m.product_id).filter(Boolean))] as string[];
      const checkoutLinksMap: Record<string, string> = {};

      if (uniqueModuleProductIds.length > 0) {
        // Fetch all checkouts belonging to the member area owner
        const { data: allCheckouts, error: allCheckoutsError } = await supabase
          .from('checkouts')
          .select('id, product_id, form_fields')
          .eq('user_id', areaData.user_id);

        if (allCheckoutsError) {
          console.error('Error fetching all checkouts for member area owner:', allCheckoutsError);
        }

        allCheckouts?.forEach(checkout => {
          // Check if the main product of the checkout is one of the module products
          if (checkout.product_id && uniqueModuleProductIds.includes(checkout.product_id)) {
            if (!checkoutLinksMap[checkout.product_id]) {
              checkoutLinksMap[checkout.product_id] = `/checkout/${checkout.id}`;
            }
          }

          // Check if any product associated with a package in this checkout is one of the module products
          const packages = (checkout.form_fields as FormFields)?.packages;
          if (packages && Array.isArray(packages)) {
            packages.forEach((pkg: PackageConfig) => {
              if (pkg.associatedProductIds && Array.isArray<dyad-problem-report summary="60 problems">
<problem file="src/pages/Customers.tsx" line="12" column="32" code="1005">'from' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="234" column="109" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="246" column="89" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="300" column="122" code="1005">')' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="301" column="12" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="323" column="229" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="359" column="235" code="1005">'...' expected.</problem>
<problem file="src/pages/Payments.tsx" line="206" column="199" code="1005">'...' expected.</problem>
<problem file="src/pages/Reports.tsx" line="191" column="126" code="1005">'...' expected.</problem>
<problem file="src/pages/Sales.tsx" line="186" column="199" code="1005">'...' expected.</problem>
<problem file="src/pages/Settings.tsx" line="48" column="73" code="1005">'...' expected.</problem>
<problem file="src/pages/Settings.tsx" line="57" column="64" code="1005">'...' expected.</problem>
<problem file="src/hooks/useIntegrations.ts" line="94" column="127" code="2352">Conversion of type '{ [key: string]: Json; } | Json[]' to type 'EmailConfig' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'Json[]' is missing the following properties from type 'EmailConfig': email, appPassword, displayName</problem>
<problem file="src/pages/AdminCheckouts.tsx" line="1610" column="27" code="2322">Type 'string' is not assignable to type 'boolean'.</problem>
<problem file="src/pages/AdminCheckouts.tsx" line="1711" column="87" code="2322">Type '{ children: (string | Element)[]; to: string; target: string; rel: string; }' is not assignable to type 'IntrinsicAttributes &amp; Omit&lt;LucideProps, &quot;ref&quot;&gt; &amp; RefAttributes&lt;SVGSVGElement&gt;'.
  Property 'rel' does not exist on type 'IntrinsicAttributes &amp; Omit&lt;LucideProps, &quot;ref&quot;&gt; &amp; RefAttributes&lt;SVGSVGElement&gt;'.</problem>
<problem file="src/components/integrations/IntegrationsStatus.tsx" line="90" column="32" code="2345">Argument of type 'string' is not assignable to parameter of type 'boolean'.</problem>
<problem file="src/components/integrations/IntegrationsStatus.tsx" line="94" column="33" code="2345">Argument of type 'string' is not assignable to parameter of type 'boolean'.</problem>
<problem file="src/pages/Customers.tsx" line="12" column="32" code="1141">String literal expected.</problem>
<problem file="src/pages/AdminDesign.tsx" line="156" column="17" code="2769">No overload matches this call.
  Overload 1 of 2, '(values: { colors?: Json; created_at?: string; global_font_family?: string; id?: string; logo_url?: string; login_subtitle?: string; login_title?: string; member_area_id: string; updated_at?: string; user_id?: string; }, options?: { ...; }): PostgrestFilterBuilder&lt;...&gt;', gave the following error.
    Argument of type '{ user_id: string; member_area_id: string; logo_url: string; login_title: string; login_subtitle: string; global_font_family: string; colors: PlatformColors; }' is not assignable to parameter of type '{ colors?: Json; created_at?: string; global_font_family?: string; id?: string; logo_url?: string; login_subtitle?: string; login_title?: string; member_area_id: string; updated_at?: string; user_id?: string; }'.
      Types of property 'colors' are incompatible.
        Type 'PlatformColors' is not assignable to type 'Json'.
          Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
            Index signature for type 'string' is missing in type 'PlatformColors'.
  Overload 2 of 2, '(values: { colors?: Json; created_at?: string; global_font_family?: string; id?: string; logo_url?: string; login_subtitle?: string; login_title?: string; member_area_id: string; updated_at?: string; user_id?: string; }[], options?: { ...; }): PostgrestFilterBuilder&lt;...&gt;', gave the following error.
    Argument of type '{ user_id: string; member_area_id: string; logo_url: string; login_title: string; login_subtitle: string; global_font_family: string; colors: PlatformColors; }' is not assignable to parameter of type '{ colors?: Json; created_at?: string; global_font_family?: string; id?: string; logo_url?: string; login_subtitle?: string; login_title?: string; member_area_id: string; updated_at?: string; user_id?: string; }[]'.
      Type '{ user_id: string; member_area_id: string; logo_url: string; login_title: string; login_subtitle: string; global_font_family: string; colors: PlatformColors; }' is missing the following properties from type '{ colors?: Json; created_at?: string; global_font_family?: string; id?: string; logo_url?: string; login_subtitle?: string; login_title?: string; member_area_id: string; updated_at?: string; user_id?: string; }[]': length, pop, push, concat, and 29 more.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="70" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="70" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="72" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="210" column="48" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="211" column="45" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="212" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="213" column="50" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="215" column="52" code="2339">Property 'checkmark_background' does not exist on type 'Json | PlatformColors'.
  Property 'checkmark_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="216" column="54" code="2339">Property 'checkmark_icon' does not exist on type 'Json | PlatformColors'.
  Property 'checkmark_icon' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="228" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="236" column="52" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="237" column="48" code="2339">Property 'header_border' does not exist on type 'Json | PlatformColors'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="238" column="42" code="2339">Property 'text_header' does not exist on type 'Json | PlatformColors'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="67" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="67" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="69" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="188" column="48" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="189" column="45" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="190" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="191" column="50" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="202" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="210" column="52" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="211" column="48" code="2339">Property 'header_border' does not exist on type 'Json | PlatformColors'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="212" column="42" code="2339">Property 'text_header' does not exist on type 'Json | PlatformColors'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="68" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="68" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="70" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="120" column="7" code="2552">Cannot find name 'setLesson'. Did you mean 'setLessons'?</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="206" column="163" code="2339">Property 'text_cards' does not exist on type 'Json | PlatformColors'.
  Property 'text_cards' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="244" column="8" code="2552">Cannot find name 'lesson'. Did you mean 'lessons'?</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="263" column="45" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="264" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="265" column="50" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="276" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="284" column="52" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="285" column="48" code="2339">Property 'header_border' does not exist on type 'Json | PlatformColors'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="286" column="42" code="2339">Property 'text_header' does not exist on type 'Json | PlatformColors'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="339" column="16" code="2552">Cannot find name 'lesson'. Did you mean 'lessons'?</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="341" column="14" code="2552">Cannot find name 'lesson'. Did you mean 'lessons'?</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="343" column="18" code="2552">Cannot find name 'lesson'. Did you mean 'lessons'?</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="348" column="34" code="2552">Cannot find name 'lesson'. Did you mean 'lessons'?</problem>
</dyad-problem-report><think>**Analyzing Compile Errors**

I'm currently confronting 60 TypeScript compile-time errors. My strategy is to methodically address each error. I've broken down the error types and will tackle them systematically. The immediate focus is on resolving the "'...' expected" and "Unexpected token" issues. I'll inspect the problematic code locations carefully and apply the needed corrections.


**Debugging JSX Syntax**

I've discovered the root of the JSX syntax errors. Incorrectly placed JSX comments are at fault. Addressing these initial errors should ripple through the code and resolve the cascading issues with missing closing tags, too. I'm carefully removing those comments now to make sure I am on the right track.


**Refining Type Definitions**

The TypeScript errors have been further categorized and prioritized. I'm focusing on resolving type-related issues now. I've pinpointed an incompatibility in how the `smtp_config` field is handled: I need to ensure explicit casting from `Json | null` to `EmailConfig` after validating the data type. Additionally, the `Module` type definition needs extending to accommodate the joined `products` property to avoid a 'Property does not exist' error. I've also identified a missing import for the `Link` component, which is a simple fix.


**Categorizing Compile Issues**

I'm now methodically addressing the reported TypeScript errors. Initially, I prioritized the JSX and syntax-related problems, fixing the malformed JSX comments to resolve errors like "'...' expected" and the missing closing tags. I've also tackled the type compatibility issues related to `smtp_config`, implementing the necessary type casting after null checks to ensure type correctness. Now I'm resolving the missing import errors, starting with the fix for the Link component. I'm moving on to type-related errors, focusing on `isConfigured.email` and extending the `Module` type to include the `products` property for consistent type safety.


**Resolving Remaining Type Issues**

I've resolved the "Cannot find name 'setLesson'" error in `MemberAreaLesson.tsx` by correcting the state variable setter. In `Customers.tsx`, I've fixed the incorrect import syntax for `formatDistanceToNow` and also removed the conflicting JSX comments. I'm now addressing the type-related issues in `Settings.tsx` and `AdminCheckouts.tsx`, ensuring proper handling of `currentSettings.colors` and the `addTopicToPackage` function's argument. Lastly, I'm working to make sure `data.smtp_config` is cast to the right type in `useIntegrations.ts`.


**Tackling Type Casting**

I'm now focusing on resolving type-related inconsistencies. I've ensured explicit type casting of `smtp_config` to `SimplifiedEmailConfig` after validation to eliminate compatibility errors. Additionally, I've addressed the misleading type error concerning `isConfigured.email` by verifying the boolean data type within the `useIntegrations` hook and removing potential conflicts.


**Resolving Remaining Issues**

I'm now methodically addressing the remaining TypeScript errors. I've corrected the incorrect `formatDistanceToNow` import and the `setLesson` variable in `MemberAreaLesson.tsx`. In `AdminCheckouts.tsx`, I've adjusted the `addTopicToPackage` function to accept `packageId` and fixed the `Link` import. I'm carefully double-checking the `useIntegrations` hook to resolve the `isConfigured.email` type issue, ensuring it's a correct boolean. I'm also ensuring the proper handling of `currentSettings.colors` properties across files and casting `settingsData.colors` when necessary.


**Tackling Remaining Errors**

I'm now in the midst of addressing the remaining compiler errors. The focus is now on meticulously verifying the type definitions for the `useIntegrations` hook and ensuring accurate type castings. I've corrected the misleading import in `Customers.tsx` and the `setLesson` function in `MemberAreaLesson.tsx`. Currently, I'm working to correctly configure the `addTopicToPackage` function in `AdminCheckouts.tsx` and the corresponding `Link` import. I'm also carefully checking and recasting the `currentSettings.colors` properties across relevant files.


</think>Com certeza! Parece que os erros de compilação são causados principalmente por comentários JSX malformados e algumas inconsistências de tipo no TypeScript.

Vou corrigir esses problemas de forma concisa:

1.  **Remover comentários JSX problemáticos**: O compilador TypeScript/React tem dificuldade em interpretar comentários JSX (`{/* ... */}`) quando eles estão diretamente após um atributo ou antes de uma tag de fechamento. Vou remover esses comentários para resolver os erros de sintaxe.
2.  **Ajustar tipagem de `PlatformSettings.colors`**: A propriedade `colors` dentro de `PlatformSettings` está sendo tratada como `Json` em alguns lugares, o que é muito genérico. Vou garantir que ela seja tipada corretamente como um objeto de cores.
3.  **Ajustar tipagem de dados carregados do Supabase**: Em alguns `useState` e `setX` calls, os dados retornados do Supabase não estão perfeitamente compatíveis com os tipos `Tables<'...' >` esperados. Vou adicionar casts explícitos (`as Type[]`) para resolver isso.
4.  **Ajustar tipo `Module` para relações**: O tipo `Module` em `AdminContent.tsx` precisa incluir a relação `products(name)` que está sendo selecionada.
5.  **Importar `Link`**: Adicionar a importação de `Link` do `react-router-dom` onde estiver faltando.
6.  **Corrigir `setLesson` para `setLessons`**: No `MemberAreaLesson.tsx`, o `useState` para aulas é `lessons` (plural), então a função de atualização deve ser `setLessons`.
7.  **Corrigir `selectedPackage` em `AdminCheckouts.tsx`**: A função `addTopicToPackage` estava tentando usar `selectedPackage` que não estava no escopo correto. Vou ajustá-la para receber o `packageId` como argumento, similar a `updatePackageTopic` e `removeTopicFromPackage`.
8.  **Corrigir importação `formatDistanceToNow`**: No `Customers.tsx`, a sintaxe de importação estava incorreta.
9.  **Remover `deliverable` de `PackageConfig`**: A propriedade `deliverable` foi removida de `PackageConfig` em `src/integrations/supabase/types.ts` para refletir as alterações no `AdminCheckouts.tsx` e `PaymentSuccess.tsx`.

Aqui estão as alterações:

<dyad-write path="src/integrations/supabase/types.ts" description="Exporting FormFields interface and ensuring correct typing for EmailConfig.">
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_automatic: boolean
          lesson_id: string | null
          member_area_id: string | null
          module_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_automatic?: boolean
          lesson_id?: string | null
          member_area_id?: string | null
          module_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_automatic?: boolean
          lesson_id?: string | null
          member_area_id?: string | null
          module_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compras: {
        Row: {
          acesso_expira_em: string | null
          cliente_documento: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string | null
          email_entrega_id: string | null
          entregavel_enviado: boolean | null
          entregavel_enviado_em: string | null
          id: string
          mercadopago_order_id: string | null
          mercadopago_payment_id: string
          metodo_pagamento: string | null
          moeda: string | null
          password: string | null
          produto_id: string | null
          status_pagamento: string
          updated_at: string | null
          username: string | null
          valor_pago: number
          webhook_payload: Json | null
        }
        Insert: {
          acesso_expira_em?: string | null
          cliente_documento?: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string | null
          email_entrega_id?: string | null
          entregavel_enviado?: boolean | null
          entregavel_enviado_em?: string | null
          id?: string
          mercadopago_order_id?: string | null
          mercadopago_payment_id: string
          metodo_pagamento?: string | null
          moeda?: string | null
          password?: string | null
          produto_id?: string | null
          status_pagamento?: string
          updated_at?: string | null
          username?: string | null
          valor_pago: number
          webhook_payload?: Json | null
        }
        Update: {
          acesso_expira_em?: string | null
          cliente_documento?: string | null
          cliente_email?: string
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string | null
          email_entrega_id?: string | null
          entregavel_enviado?: boolean | null
          entregavel_enviado_em?: string | null
          id?: string
          mercadopago_order_id?: string | null
          mercadopago_payment_id?: string
          metodo_pagamento?: string | null
          moeda?: string | null
          password?: string | null
          produto_id?: string | null
          status_pagamento?: string
          updated_at?: string | null
          username?: string | null
          valor_pago?: number
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_digitais"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_history: {
        Row: {
          action_type: string
          changes: Json
          checkout_id: string
          created_at: string
          description: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          changes?: Json
          checkout_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          changes?: Json
          checkout_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_history_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkouts: {
        Row: {
          created_at: string
          extra_content: Json | null
          form_fields: Json | null
          id: string
          integrations: Json | null
          layout: string
          member_area_id: string | null
          name: string | null
          order_bumps: Json | null
          payment_methods: Json | null
          price: number
          product_id: string
          promotional_price: number | null
          styles: Json | null
          support_contact: Json | null
          timer: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          extra_content?: Json | null
          form_fields?: Json | null
          id?: string
          integrations?: Json | null
          layout?: string
          member_area_id?: string | null
          name?: string | null
          order_bumps?: Json | null
          payment_methods?: Json | null
          price: number
          product_id: string
          promotional_price?: number | null
          styles?: Json | null
          support_contact?: Json | null
          timer?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          extra_content?: Json | null
          form_fields?: Json | null
          id?: string
          integrations?: Json | null
          layout?: string
          member_area_id?: string | null
          name?: string | null
          order_bumps?: Json | null
          payment_methods?: Json | null
          price?: number
          product_id?: string
          promotional_price?: number | null
          styles?: Json | null
          support_contact?: Json | null
          timer?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          cpf: string | null
          email: string
          id: string
          last_purchase: string | null
          name: string
          phone: string | null
          purchase_count: number | null
          status: string | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cpf?: string | null
          email: string
          id?: string
          last_purchase?: string | null
          name: string
          phone?: string | null
          purchase_count?: number | null
          status?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cpf?: string | null
          email?: string
          id?: string
          last_purchase?: string | null
          name?: string
          phone?: string | null
          purchase_count?: number | null
          status?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          created_at: string
          id: string
          mercado_pago_access_token: string | null
          mercado_pago_token_public: string | null
          meta_pixel_id: string | null
          smtp_config: Json | null
          updated_at: string
          user_id: string
          utmify_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_token_public?: string | null
          meta_pixel_id?: string | null
          smtp_config?: Json | null
          updated_at?: string
          user_id: string
          utmify_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_token_public?: string | null
          meta_pixel_id?: string | null
          smtp_config?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lesson_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lesson_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          status: string
          text_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          status?: string
          text_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          status?: string
          text_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_entrega: {
        Row: {
          assunto: string | null
          compra_id: string | null
          created_at: string | null
          destinatario: string
          erro_mensagem: string | null
          id: string
          status: string
          tentativa_numero: number | null
          tipo: string
        }
        Insert: {
          assunto?: string | null
          compra_id?: string | null
          created_at?: string | null
          destinatario: string
          erro_mensagem?: string | null
          id?: string
          status: string
          tentativa_numero?: number | null
          tipo: string
        }
        Update: {
          assunto?: string | null
          compra_id?: string | null
          created_at?: string | null
          destinatario?: string
          erro_mensagem?: string | null
          id?: string
          status?: string
          tentativa_numero?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_entrega_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
        ]
      }
      member_access: {
        Row: {
          access_granted_at: string
          created_at: string
          id: string
          is_active: boolean
          member_area_id: string | null
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_area_id?: string | null
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_area_id?: string | null
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_access_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_areas: {
        Row: {
          associated_products: string[] | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          associated_products?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          associated_products?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      modules: {
        Row: {
          banner_url: string | null
          checkout_link: string | null // NEW FIELD
          created_at: string
          description: string | null
          id: string
          member_area_id: string
          order_index: number
          product_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          checkout_link?: string | null // NEW FIELD
          created_at?: string
          description?: string | null
          id?: string
          member_area_id: string
          order_index?: number
          product_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          checkout_link?: string | null // NEW FIELD
          created_at?: string
          description?: string | null
          id?: string
          member_area_id?: string
          order_index?: number
          product_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          payment_id: string | null
          product_id: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_id: string
          created_at: string
          date: string
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          payment_method: string | null
          payment_url: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_id: string
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          payment_method?: string | null
          payment_url?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          payment_method?: string | null
          payment_url?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          colors: Json | null
          created_at: string
          global_font_family: string | null
          id: string
          logo_url: string | null
          login_subtitle: string | null
          login_title: string | null
          member_area_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          colors?: Json | null
          created_at?: string
          global_font_family?: string | null
          id?: string
          logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          member_area_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          colors?: Json | null
          created_at?: string
          global_font_family?: string | null
          id?: string
          logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          member_area_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_access: {
        Row: {
          access_granted_at: string
          created_at: string | null
          id: string
          payment_id: string | null
          product_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          access_granted_at?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted_at?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_access_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_deliveries: {
        Row: {
          created_at: string | null
          error_message: string | null
          gmail_account_id: string | null
          id: string
          purchase_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          gmail_account_id?: string | null
          id?: string
          purchase_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          gmail_account_id?: string | null
          id?: string
          purchase_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_deliveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "product_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          access_sent: boolean | null
          access_sent_at: string | null
          amount: number
          created_at: string | null
          customer_email: string
          customer_name: string
          id: string
          password: string | null
          payment_id: string
          payment_status: string
          product_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount: number
          created_at?: string | null
          customer_email: string
          customer_name: string
          id?: string
          password?: string | null
          payment_id: string
          payment_status: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount?: number
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          id?: string
          password?: string | null
          payment_id?: string
          payment_status?: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          access_url: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          email_template: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          member_area_id: string | null
          member_area_link: string | null
          name: string
          price: number
          price_original: number | null
          project_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email_template?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          member_area_id?: string | null
          member_area_link?: string | null
          name: string
          price: number
          price_original?: number | null
          project_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email_template?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          member_area_id?: string | null
          member_area_link?: string | null
          name?: string
          price?: number
          price_original?: number | null
          project_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          login_url: string | null
          member_area_id: string | null
          name: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          login_url?: string | null
          member_area_id?: string | null
          name?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          login_url?: string | null
          member_area_id?: string | null
          name?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          access_url: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_url: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_url?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      produtos_digitais: {
        Row: {
          acesso_expira_em: number | null
          arquivo_url: string | null
          created_at: string | null
          descricao: string | null
          email_assunto: string
          email_template: string
          gerar_credenciais: boolean | null
          id: string
          instrucoes_acesso: string | null
          is_active: boolean | null
          nome: string
          preco: number
          tipo_entregavel: string
          updated_at: string | null
          url_acesso: string | null
        }
        Insert: {
          acesso_expira_em?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email_assunto?: string
          email_template: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome: string
          preco: number
          tipo_entregavel: string
          updated_at?: string | null
          url_acesso?: string | null
        }
        Update: {
          acesso_expira_em?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email_assunto?: string
          email_template?: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome?: string
          preco?: number
          tipo_entregavel?: string
          updated_at?: string | null
          url_acesso?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          checkout_id: string | null
          commission_amount: number | null
          created_at: string
          customer_id: string | null
          id: string
          net_amount: number | null
          order_bumps: Json | null
          payment_id: string | null
          payment_method: string | null
          product_id: string | null
          product_name: string
          quantity: number | null
          selected_package: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          net_amount?: number | null
          order_bumps?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number | null
          selected_package?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          net_amount?: number | null
          order_bumps?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number | null
          selected_package?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: {
          user_id?: string
        }
        Returns: boolean
      }
      is_admin_of_member_area: {
        Args: {
          p_member_area_id: string
        }
        Returns: boolean
      }
      log_checkout_changes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      process_completed_sale: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_customer_stats: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export interface DeliverableConfig {
  type: 'none' | 'link' | 'upload';
  link?: string | null;
  fileUrl?: string | null; // For uploaded files
  name?: string | null;
  description?: string | null;
}

export interface PackageConfig {
  id: number;
  name: string;
  description: string;
  topics: string[];
  price: number; // in Reais
  originalPrice: number; // in Reais
  mostSold?: boolean;
  associatedProductIds?: string[] | null; // Changed to array
}

export interface GuaranteeConfig {
  enabled: boolean;
  days: number;
  description: string;
}

export interface ReservedRightsConfig {
  enabled: boolean;
  text: string;
}

export interface EmailConfig {
  email: string;
  appPassword: string;
  displayName: string;
  host?: string;
  port?: string;
  secure?: boolean;
  provider?: string;
}

// Export FormFields
export interface FormFields {
  requireName?: boolean;
  requireEmail?: boolean;
  requireEmailConfirm?: boolean;
  requirePhone?: boolean;
  requireCpf?: boolean;
  packages?: PackageConfig[];
  deliverable?: DeliverableConfig;
  sendTransactionalEmail?: boolean;
  transactionalEmailSubject?: string;
  transactionalEmailBody?: string;
  guarantee?: GuaranteeConfig;
  reservedRights?: ReservedRightsConfig;
}