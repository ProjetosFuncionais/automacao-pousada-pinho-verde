-- =============================================================================
-- MIGRATION: 001_initial_schema.sql
-- SISTEMA: Sistema de Vouchers e Gestão de Reservas da Pousada Pinho Verde
-- BANCO DE DADOS: PostgreSQL / Supabase
-- DESCRIÇÃO: Criação de extensões, tipos, tabelas profiles e reservas,
--            coluna gerada para saldo, constraints CHECK, triggers de
--            updated_at, índices de performance e políticas de RLS.
-- =============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
-- pgcrypto fornece gen_random_uuid() para chaves primárias UUID v4 seguras.
-- pg_trgm permite buscas textuais eficientes com ILIKE em nome_completo.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- 2. FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- Decisão arquitetural: manter updated_at gerenciado pelo próprio SGBD garante
-- consistência mesmo em atualizações administrativas via SQL Editor.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_set_updated_at() IS
'Atualiza automaticamente a coluna updated_at antes de qualquer UPDATE.';

-- =============================================================================
-- 3. TABELA: public.profiles
-- Relacionada 1:1 com auth.users do Supabase Auth.
-- Armazena dados funcionais do colaborador da pousada, perfil de acesso e
-- flag de ativação (funcionários desligados têm ativo = FALSE sem perder
-- o histórico de reservas criadas por eles).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo VARCHAR(150) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'recepcao',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restrições de domínio e integridade
    CONSTRAINT chk_profiles_nome_nao_vazio
        CHECK ( length(trim(nome_completo)) >= 3 ),
    CONSTRAINT chk_profiles_perfil_valido
        CHECK ( perfil IN ('admin', 'recepcao') )
);

COMMENT ON TABLE public.profiles IS
'Perfis de funcionários da Pousada Pinho Verde vinculados ao Supabase Auth.';
COMMENT ON COLUMN public.profiles.id IS
'Mesmo UUID do usuário na tabela auth.users.';
COMMENT ON COLUMN public.profiles.perfil IS
'Nível de acesso: admin (gestão total) ou recepcao (operação de reservas).';
COMMENT ON COLUMN public.profiles.ativo IS
'Indica se o funcionário pode acessar o sistema e operar reservas.';

-- =============================================================================
-- 4. TABELA: public.reservas
-- Armazena todas as reservas da Pousada Pinho Verde.
-- Decisões importantes:
-- - valor_total_receber é GENERATED ALWAYS AS (valor_total_hospedagem - valor_total_pago) STORED:
--   isso impede qualquer edição manual do saldo e garante exatidão contábil no banco.
-- - Cancelamentos apenas alteram status para 'cancelada', preservando auditoria.
-- - criado_por referencia public.profiles(id) com ON DELETE RESTRICT para nunca
--   perder a rastreabilidade do operador.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    endereco TEXT NOT NULL,
    numero_chale VARCHAR(50) NOT NULL,
    quantidade_pessoas INTEGER NOT NULL,
    data_checkin DATE NOT NULL,
    data_checkout DATE NOT NULL,
    valor_total_hospedagem NUMERIC(10,2) NOT NULL,
    valor_total_pago NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valor_total_receber NUMERIC(10,2) GENERATED ALWAYS AS (valor_total_hospedagem - valor_total_pago) STORED,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmada',
    criado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restrições CHECK das regras de negócio
    CONSTRAINT chk_reservas_nome_obrigatorio
        CHECK ( length(trim(nome_completo)) >= 3 ),
    CONSTRAINT chk_reservas_cpf_obrigatorio
        CHECK ( length(trim(cpf)) >= 11 ),
    CONSTRAINT chk_reservas_whatsapp_obrigatorio
        CHECK ( length(trim(whatsapp)) >= 10 ),
    CONSTRAINT chk_reservas_endereco_obrigatorio
        CHECK ( length(trim(endereco)) >= 5 ),
    CONSTRAINT chk_reservas_chale_obrigatorio
        CHECK ( length(trim(numero_chale)) >= 1 ),
    CONSTRAINT chk_reservas_quantidade_pessoas_positiva
        CHECK ( quantidade_pessoas > 0 ),
    CONSTRAINT chk_reservas_datas_validas
        CHECK ( data_checkout > data_checkin ),
    CONSTRAINT chk_reservas_valor_hospedagem_nao_negativo
        CHECK ( valor_total_hospedagem >= 0 ),
    CONSTRAINT chk_reservas_valor_pago_nao_negativo
        CHECK ( valor_total_pago >= 0 ),
    CONSTRAINT chk_reservas_valor_pago_menor_igual_total
        CHECK ( valor_total_pago <= valor_total_hospedagem ),
    CONSTRAINT chk_reservas_status_valido
        CHECK ( status IN ('confirmada', 'cancelada') )
);

COMMENT ON TABLE public.reservas IS
'Registro oficial de reservas e estadias dos chalés da Pousada Pinho Verde.';
COMMENT ON COLUMN public.reservas.valor_total_receber IS
'Saldo pendente calculado automaticamente pelo PostgreSQL (valor_total_hospedagem - valor_total_pago). Somente leitura.';
COMMENT ON COLUMN public.reservas.status IS
'Estado da reserva: confirmada ou cancelada. Registros nunca são excluídos fisicamente.';

-- =============================================================================
-- 5. TRIGGER DE ATUALIZAÇÃO DE updated_at NA TABELA reservas
-- =============================================================================
DROP TRIGGER IF EXISTS trg_reservas_set_updated_at ON public.reservas;

CREATE TRIGGER trg_reservas_set_updated_at
BEFORE UPDATE ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- 6. ÍNDICES DE PERFORMANCE
-- Índices planejados para os filtros mais frequentes na recepção da pousada:
-- busca por CPF, nome do hóspede, status, data de check-in e ordenação por criação.
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_reservas_cpf
    ON public.reservas (cpf);

CREATE INDEX IF NOT EXISTS idx_reservas_nome_completo_trgm
    ON public.reservas USING gin (nome_completo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_reservas_nome_completo_btree
    ON public.reservas (lower(nome_completo));

CREATE INDEX IF NOT EXISTS idx_reservas_status
    ON public.reservas (status);

CREATE INDEX IF NOT EXISTS idx_reservas_data_checkin
    ON public.reservas (data_checkin);

CREATE INDEX IF NOT EXISTS idx_reservas_created_at_desc
    ON public.reservas (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservas_numero_chale
    ON public.reservas (numero_chale);

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) E POLÍTICAS DE SEGURANÇA
-- Arquitetura de Segurança:
-- - O frontend NUNCA acessa a tabela public.reservas diretamente via Anon Key.
-- - Todas as leituras e escritas em public.reservas passam pela API Flask,
--   que utiliza a SUPABASE_SERVICE_ROLE_KEY (que faz bypass de RLS no Supabase)
--   após validar o JWT do usuário e checar seu perfil ativo.
-- - Portanto, habilitamos RLS em ambas as tabelas e NÃO criamos políticas
--   públicas (anon) para reservas, bloqueando qualquer tentativa de acesso
--   direto pelo navegador caso alguém tente usar o cliente Supabase no frontend.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Força RLS para usuários comuns, mantendo acesso total apenas ao service_role do backend
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reservas FORCE ROW LEVEL SECURITY;

-- Política em profiles: um usuário autenticado pode ler apenas o seu próprio perfil
DROP POLICY IF EXISTS "Usuarios autenticados podem ler o proprio profile" ON public.profiles;
CREATE POLICY "Usuarios autenticados podem ler o proprio profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING ( auth.uid() = id AND ativo = TRUE );

-- Política em profiles para service_role (API Flask): acesso integral
DROP POLICY IF EXISTS "Service role gerencia todos os profiles" ON public.profiles;
CREATE POLICY "Service role gerencia todos os profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING ( TRUE )
    WITH CHECK ( TRUE );

-- Política em reservas: NENHUMA permissão para 'anon' ou acesso direto não mediado.
-- Exclusivo para a API Flask operando com service_role.
DROP POLICY IF EXISTS "Apenas backend Flask via service_role acessa reservas" ON public.reservas;
CREATE POLICY "Apenas backend Flask via service_role acessa reservas"
    ON public.reservas
    FOR ALL
    TO service_role
    USING ( TRUE )
    WITH CHECK ( TRUE );

-- Revoga permissões diretas do papel anônimo na tabela reservas por defesa em profundidade
REVOKE ALL ON public.reservas FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.reservas FROM authenticated;
REVOKE ALL ON public.profiles FROM anon;
