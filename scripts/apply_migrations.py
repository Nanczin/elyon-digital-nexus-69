#!/usr/bin/env python3
"""
Script para aplicar migrações do banco de dados via Supabase API
Uso: python3 apply_migrations.py <SERVICE_ROLE_KEY>
"""

import sys
import os
import json
import requests
from pathlib import Path

def apply_migration(service_role_key: str) -> bool:
    """Aplica a migração usando a Service Role Key"""
    
    # Ler arquivo de migração
    migration_file = Path(__file__).parent / "supabase/migrations/20251114_create_member_tables.sql"
    
    if not migration_file.exists():
        print(f"❌ Arquivo não encontrado: {migration_file}")
        return False
    
    print(f"📖 Lendo migração: {migration_file}")
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    # Conectar ao Supabase via API REST
    # A migração precisa ser executada via Admin API ou via direct DB connection
    # A melhor forma é usar a função edge_function ou executar SQL direto
    
    print("⚠️  NOTA: A execução de SQL raw via REST API não é suportada.")
    print("Use uma das alternativas:")
    print("  1. Supabase Console → SQL Editor → Cole o SQL → Run")
    print("  2. Use psql diretamente no terminal")
    print("  3. Use a Supabase CLI: supabase db push")
    
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 apply_migrations.py <SERVICE_ROLE_KEY>")
        print("\nObtém a SERVICE_ROLE_KEY em:")
        print("  Supabase Console → Settings → API Keys → service_role")
        sys.exit(1)
    
    service_role_key = sys.argv[1]
    success = apply_migration(service_role_key)
    sys.exit(0 if success else 1)
