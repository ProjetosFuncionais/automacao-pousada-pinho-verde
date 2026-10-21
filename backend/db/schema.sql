-- Schema do banco PostgreSQL (Neon) da Pousada Pinho Verde.
-- Pode ser executado mais de uma vez sem apagar dados: python manage.py init-db

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    senha_hash TEXT,
    nome_completo VARCHAR(150) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'recepcao',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_profiles_email_valido
        CHECK ( position('@' in email) > 1 ),
    CONSTRAINT chk_profiles_nome_nao_vazio
        CHECK ( length(trim(nome_completo)) >= 3 ),
    CONSTRAINT chk_profiles_perfil_valido
        CHECK ( perfil IN ('admin', 'recepcao') )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unico
    ON public.profiles (lower(email));

COMMENT ON TABLE public.profiles IS
'Colaboradores da Pousada Pinho Verde com acesso ao sistema (login e perfil).';
COMMENT ON COLUMN public.profiles.senha_hash IS
'Hash da senha (werkzeug/scrypt). A senha em texto nunca é gravada.';
COMMENT ON COLUMN public.profiles.perfil IS
'Nível de acesso: admin (gestão total) ou recepcao (operação de reservas).';
COMMENT ON COLUMN public.profiles.ativo IS
'Indica se o funcionário pode acessar o sistema e operar reservas.';

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

DROP TRIGGER IF EXISTS trg_reservas_set_updated_at ON public.reservas;

CREATE TRIGGER trg_reservas_set_updated_at
BEFORE UPDATE ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

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

-- Tentativas de login com senha errada, para bloquear quem tenta adivinhar senhas.
CREATE TABLE IF NOT EXISTS public.tentativas_login (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip VARCHAR(64),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tentativas_login_email
    ON public.tentativas_login (lower(email), criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_tentativas_login_ip
    ON public.tentativas_login (ip, criado_em DESC);

COMMENT ON TABLE public.tentativas_login IS
'Falhas de login recentes. Usada para bloquear temporariamente após muitas senhas erradas.';
