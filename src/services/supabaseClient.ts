/**
 * Configuração do cliente Supabase JS no frontend.
 * IMPORTANTE: O frontend utiliza o Supabase EXCLUSIVAMENTE para autenticação
 * (login, logout e recuperação do token JWT da sessão).
 * NUNCA coloque a SUPABASE_SERVICE_ROLE_KEY no frontend.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Verifica se as variáveis reais do Supabase foram configuradas no ambiente.
 * Quando o projeto é executado no preview sem um projeto Supabase externo conectado,
 * habilitamos o modo de demonstração fiel à API Flask para testes imediatos.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('seu-projeto.supabase.co') &&
    !supabaseAnonKey.includes('sua-chave-publica')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
