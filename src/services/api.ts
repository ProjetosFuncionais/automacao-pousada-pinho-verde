import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  ApiErrorResponse,
  Profile,
  Reserva,
  ReservaPayload,
  StatusReserva,
  VoucherData,
} from '../types/reserva';
import {
  aplicarMascaraCpf,
  aplicarMascaraWhatsapp,
  calcularQuantidadeDiarias,
  calcularSaldoReserva,
  obterCodigoCurtoReserva,
} from '../utils/formatters';
import { reservaSchema } from '../schemas/reservaSchema';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

const STORAGE_KEY_RESERVAS = 'pinho_verde_reservas_v1';
const STORAGE_KEY_SESSION = 'pinho_verde_demo_session_v1';

export const POLITICAS_OFICIAIS_VOUCHER: string[] = [
  'Reembolso integral para cancelamento solicitado até 14 dias antes do check-in.',
  'Fora do prazo ou em caso de não comparecimento, não haverá reembolso nem crédito.',
  'Check-in às 15h.',
  'Check-out às 12h.',
  'Permanência após o horário poderá gerar taxa adicional.',
  'Não são permitidos animais de estimação.',
  'Não é permitido fumar nas dependências e acomodações.',
  'Pagamento de 50% na reserva.',
  'Restante pago no check-in por PIX, dinheiro ou cartão de crédito em até duas vezes.',
];

export const LISTA_CHALES_SUGERIDOS: string[] = [
  'Chalé 01 - Araucária Imperial',
  'Chalé 02 - Manacá da Serra',
  'Chalé 03 - Pinho Bravo',
  'Chalé 04 - Ipê Amarelo',
  'Chalé 05 - Cedro do Mato',
  'Chalé 06 - Vale das Neblinas (Master)',
  'Chalé 07 - Bosque dos Pinhos',
  'Chalé 08 - Mirante da Mantiqueira',
];

const RESERVAS_INICIAIS_FICTICIAS: Reserva[] = [
  {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    nome_completo: 'Mariana Costa Mendes',
    cpf: '529.982.247-25',
    whatsapp: '(11) 99812-3344',
    endereco: 'Rua das Hortênsias, 420, Jardim Europa, São Paulo - SP',
    numero_chale: 'Chalé 06 - Vale das Neblinas (Master)',
    quantidade_pessoas: 2,
    data_checkin: '2026-10-16',
    data_checkout: '2026-10-19',
    valor_total_hospedagem: 2580.0,
    valor_total_pago: 1290.0,
    valor_total_receber: 1290.0,
    descricao:
      'Comemoração de aniversário de casamento. Preparar cesta de queijos e vinhos da Serra da Mantiqueira.',
    status: 'confirmada',
    criado_por: '11111111-2222-3333-4444-555555555555',
    created_at: '2026-10-01T14:20:00Z',
    updated_at: '2026-10-01T14:20:00Z',
  },
  {
    id: '4f8c2e11-7a90-4d3e-812c-901a4f66b201',
    nome_completo: 'Roberto Almeida Prado',
    cpf: '123.456.789-09',
    whatsapp: '(19) 99140-8821',
    endereco: 'Av. Barão de Itapura, 1890, Cambuí, Campinas - SP',
    numero_chale: 'Chalé 01 - Araucária Imperial',
    quantidade_pessoas: 4,
    data_checkin: '2026-10-09',
    data_checkout: '2026-10-12',
    valor_total_hospedagem: 3120.0,
    valor_total_pago: 3120.0,
    valor_total_receber: 0.0,
    descricao: 'Família com duas crianças. Solicitaram lenha extra para lareira.',
    status: 'confirmada',
    criado_por: '11111111-2222-3333-4444-555555555555',
    created_at: '2026-09-29T10:15:00Z',
    updated_at: '2026-09-30T16:40:00Z',
  },
  {
    id: '7c3a9104-12f5-4c88-b92a-5501d3e8f112',
    nome_completo: 'Fernanda Vasconcelos Lira',
    cpf: '390.533.447-05',
    whatsapp: '(35) 98845-1902',
    endereco: 'Rua Coronel Rennó, 85, Centro, Itajubá - MG',
    numero_chale: 'Chalé 03 - Pinho Bravo',
    quantidade_pessoas: 2,
    data_checkin: '2026-10-23',
    data_checkout: '2026-10-25',
    valor_total_hospedagem: 1480.0,
    valor_total_pago: 740.0,
    valor_total_receber: 740.0,
    descricao: 'Restrição alimentar: café da manhã sem lactose para 1 hóspede.',
    status: 'confirmada',
    criado_por: '22222222-3333-4444-5555-666666666666',
    created_at: '2026-09-28T09:05:00Z',
    updated_at: '2026-09-28T09:05:00Z',
  },
  {
    id: '2e91b508-88d4-4210-a711-0092c4e7a990',
    nome_completo: 'Lucas Cavalcanti Peixoto',
    cpf: '705.484.450-52',
    whatsapp: '(21) 99765-4321',
    endereco: 'Rua Marquês de São Vicente, 210, Gávea, Rio de Janeiro - RJ',
    numero_chale: 'Chalé 08 - Mirante da Mantiqueira',
    quantidade_pessoas: 2,
    data_checkin: '2026-11-06',
    data_checkout: '2026-11-09',
    valor_total_hospedagem: 2850.0,
    valor_total_pago: 1425.0,
    valor_total_receber: 1425.0,
    descricao: 'Chegada prevista às 17h30 de sexta-feira.',
    status: 'confirmada',
    criado_por: '22222222-3333-4444-5555-666666666666',
    created_at: '2026-09-26T18:12:00Z',
    updated_at: '2026-09-26T18:12:00Z',
  },
  {
    id: '6d40a819-55c1-4e72-9301-8841f0b2c334',
    nome_completo: 'Patrícia Silveira Fontes',
    cpf: '852.491.360-74',
    whatsapp: '(31) 99201-7755',
    endereco: 'Rua Rio de Janeiro, 1540, Lourdes, Belo Horizonte - MG',
    numero_chale: 'Chalé 02 - Manacá da Serra',
    quantidade_pessoas: 3,
    data_checkin: '2026-10-02',
    data_checkout: '2026-10-04',
    valor_total_hospedagem: 1640.0,
    valor_total_pago: 820.0,
    valor_total_receber: 820.0,
    descricao:
      'Cancelamento solicitado pelo hóspede com 16 dias de antecedência (reembolso integral realizado).',
    status: 'cancelada',
    criado_por: '11111111-2222-3333-4444-555555555555',
    created_at: '2026-09-12T11:30:00Z',
    updated_at: '2026-09-16T15:00:00Z',
  },
];

export class ApiClientError extends Error {
  status: number;
  erro: string;
  campos: Record<string, string>;

  constructor(
    status: number,
    erro: string,
    mensagem: string,
    campos: Record<string, string> = {}
  ) {
    super(mensagem);
    this.name = 'ApiClientError';
    this.status = status;
    this.erro = erro;
    this.campos = campos;
  }
}

function carregarReservasLocais(): Reserva[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESERVAS);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEY_RESERVAS,
        JSON.stringify(RESERVAS_INICIAIS_FICTICIAS)
      );
      return [...RESERVAS_INICIAIS_FICTICIAS];
    }
    const parsed = JSON.parse(raw) as Reserva[];
    return Array.isArray(parsed) ? parsed : [...RESERVAS_INICIAIS_FICTICIAS];
  } catch {
    return [...RESERVAS_INICIAIS_FICTICIAS];
  }
}

function salvarReservasLocais(reservas: Reserva[]): void {
  localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservas));
}

export function obterSessaoDemoLocal(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function salvarSessaoDemoLocal(profile: Profile | null): void {
  if (!profile) {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } else {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(profile));
  }
}

async function obterAccessToken(): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new ApiClientError(
        401,
        'nao_autenticado',
        'Sua sessão expirou. Faça login novamente.'
      );
    }
    return token;
  }

  const demoProfile = obterSessaoDemoLocal();
  if (!demoProfile) {
    throw new ApiClientError(
      401,
      'nao_autenticado',
      'Cabeçalho de autenticação ausente. Faça login para continuar.'
    );
  }
  if (!demoProfile.ativo) {
    throw new ApiClientError(
      403,
      'usuario_inativo',
      'Seu perfil de acesso está inativo. Contate a administração da pousada.'
    );
  }
  return `demo-jwt-${demoProfile.id}`;
}

async function requestFlaskApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await obterAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errPayload = data as Partial<ApiErrorResponse>;
    throw new ApiClientError(
      response.status,
      errPayload.erro || 'erro_requisicao',
      errPayload.mensagem || 'Não foi possível concluir a operação na API.',
      errPayload.campos || {}
    );
  }

  return data as T;
}

function gerarUuidV4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function validarPayloadSimulandoBackend(payload: ReservaPayload): ReservaPayload {
  const resultado = reservaSchema.safeParse(payload);
  if (!resultado.success) {
    const campos: Record<string, string> = {};
    for (const issue of resultado.error.issues) {
      const chave = String(issue.path[0] || 'geral');
      if (!campos[chave]) {
        campos[chave] = issue.message;
      }
    }
    throw new ApiClientError(
      422,
      'erro_validacao',
      'Existem campos inválidos nos dados enviados.',
      campos
    );
  }

  return {
    ...resultado.data,
    cpf: aplicarMascaraCpf(resultado.data.cpf),
    whatsapp: aplicarMascaraWhatsapp(resultado.data.whatsapp),
    descricao: resultado.data.descricao?.trim() || null,
  };
}

export const apiService = {
  async getMe(): Promise<Profile> {
    if (isSupabaseConfigured) {
      return requestFlaskApi<Profile>('/me');
    }
    const profile = obterSessaoDemoLocal();
    if (!profile) {
      throw new ApiClientError(
        401,
        'nao_autenticado',
        'Sessão não encontrada. Faça login.'
      );
    }
    if (!profile.ativo) {
      throw new ApiClientError(
        403,
        'usuario_inativo',
        'Seu perfil de acesso está inativo.'
      );
    }
    return profile;
  },

  async listarReservas(filtros?: {
    busca?: string;
    status?: StatusReserva | 'todas';
  }): Promise<Reserva[]> {
    if (isSupabaseConfigured) {
      const params = new URLSearchParams();
      if (filtros?.busca?.trim()) params.set('busca', filtros.busca.trim());
      if (filtros?.status && filtros.status !== 'todas') {
        params.set('status', filtros.status);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      return requestFlaskApi<Reserva[]>(`/reservas${query}`);
    }

    await obterAccessToken();
    const todas = carregarReservasLocais().sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );

    return todas.filter((r) => {
      if (
        filtros?.status &&
        filtros.status !== 'todas' &&
        r.status !== filtros.status
      ) {
        return false;
      }

      if (filtros?.busca?.trim()) {
        const termo = filtros.busca.trim().toLowerCase();
        const termoDigitos = termo.replace(/\D/g, '');
        const codigoVoucher = obterCodigoCurtoReserva(r.id).toLowerCase();
        const cpfDigitos = r.cpf.replace(/\D/g, '');
        const whatsDigitos = r.whatsapp.replace(/\D/g, '');

        const matchTexto =
          r.id.toLowerCase().includes(termo) ||
          codigoVoucher.includes(termo) ||
          r.nome_completo.toLowerCase().includes(termo) ||
          r.cpf.toLowerCase().includes(termo) ||
          r.whatsapp.toLowerCase().includes(termo) ||
          r.numero_chale.toLowerCase().includes(termo);

        const matchDigitos =
          termoDigitos.length > 0 &&
          (cpfDigitos.includes(termoDigitos) ||
            whatsDigitos.includes(termoDigitos));

        return matchTexto || matchDigitos;
      }

      return true;
    });
  },

  async obterReservaPorId(id: string): Promise<Reserva> {
    if (isSupabaseConfigured) {
      return requestFlaskApi<Reserva>(`/reservas/${encodeURIComponent(id)}`);
    }

    await obterAccessToken();
    const reservas = carregarReservasLocais();
    const encontrada = reservas.find((r) => r.id === id);
    if (!encontrada) {
      throw new ApiClientError(
        404,
        'nao_encontrado',
        'Reserva não encontrada no sistema.'
      );
    }
    return encontrada;
  },

  async criarReserva(payload: ReservaPayload): Promise<Reserva> {
    if (isSupabaseConfigured) {
      return requestFlaskApi<Reserva>('/reservas', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    await obterAccessToken();
    const perfil = obterSessaoDemoLocal()!;
    const validado = validarPayloadSimulandoBackend(payload);
    const agora = new Date().toISOString();

    const saldoCalculado = calcularSaldoReserva(
      validado.valor_total_hospedagem,
      validado.valor_total_pago
    );

    const novaReserva: Reserva = {
      id: gerarUuidV4(),
      nome_completo: validado.nome_completo,
      cpf: validado.cpf,
      whatsapp: validado.whatsapp,
      endereco: validado.endereco,
      numero_chale: validado.numero_chale,
      quantidade_pessoas: validado.quantidade_pessoas,
      data_checkin: validado.data_checkin,
      data_checkout: validado.data_checkout,
      valor_total_hospedagem: Number(validado.valor_total_hospedagem.toFixed(2)),
      valor_total_pago: Number(validado.valor_total_pago.toFixed(2)),
      valor_total_receber: saldoCalculado,
      descricao: validado.descricao ?? null,
      status: 'confirmada',
      criado_por: perfil.id,
      created_at: agora,
      updated_at: agora,
    };

    const reservas = carregarReservasLocais();
    reservas.unshift(novaReserva);
    salvarReservasLocais(reservas);
    return novaReserva;
  },

  async atualizarReserva(id: string, payload: ReservaPayload): Promise<Reserva> {
    if (isSupabaseConfigured) {
      return requestFlaskApi<Reserva>(`/reservas/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }

    await obterAccessToken();
    const reservas = carregarReservasLocais();
    const idx = reservas.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new ApiClientError(
        404,
        'nao_encontrado',
        'Reserva não encontrada no sistema.'
      );
    }

    if (reservas[idx].status === 'cancelada') {
      throw new ApiClientError(
        409,
        'conflito_estado',
        'Não é permitido editar uma reserva que já foi cancelada.'
      );
    }

    const validado = validarPayloadSimulandoBackend(payload);
    const saldoCalculado = calcularSaldoReserva(
      validado.valor_total_hospedagem,
      validado.valor_total_pago
    );

    const atualizada: Reserva = {
      ...reservas[idx],
      nome_completo: validado.nome_completo,
      cpf: validado.cpf,
      whatsapp: validado.whatsapp,
      endereco: validado.endereco,
      numero_chale: validado.numero_chale,
      quantidade_pessoas: validado.quantidade_pessoas,
      data_checkin: validado.data_checkin,
      data_checkout: validado.data_checkout,
      valor_total_hospedagem: Number(validado.valor_total_hospedagem.toFixed(2)),
      valor_total_pago: Number(validado.valor_total_pago.toFixed(2)),
      valor_total_receber: saldoCalculado,
      descricao: validado.descricao ?? null,
      updated_at: new Date().toISOString(),
    };

    reservas[idx] = atualizada;
    salvarReservasLocais(reservas);
    return atualizada;
  },

  async cancelarReserva(id: string): Promise<Reserva> {
    if (isSupabaseConfigured) {
      return requestFlaskApi<Reserva>(
        `/reservas/${encodeURIComponent(id)}/cancelar`,
        {
          method: 'PATCH',
        }
      );
    }

    await obterAccessToken();
    const reservas = carregarReservasLocais();
    const idx = reservas.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new ApiClientError(
        404,
        'nao_encontrado',
        'Reserva não encontrada no sistema.'
      );
    }

    if (reservas[idx].status === 'cancelada') {
      throw new ApiClientError(
        409,
        'conflito_estado',
        'Esta reserva já se encontra cancelada.'
      );
    }

    const cancelada: Reserva = {
      ...reservas[idx],
      status: 'cancelada',
      updated_at: new Date().toISOString(),
    };

    reservas[idx] = cancelada;
    salvarReservasLocais(reservas);
    return cancelada;
  },

  async obterVoucher(id: string): Promise<VoucherData> {
    if (isSupabaseConfigured) {
      return requestFlaskApi<VoucherData>(
        `/reservas/${encodeURIComponent(id)}/voucher`
      );
    }

    await obterAccessToken();
    const perfil = obterSessaoDemoLocal()!;
    const reserva = await this.obterReservaPorId(id);
    const quantidade_diarias = Math.max(
      1,
      calcularQuantidadeDiarias(reserva.data_checkin, reserva.data_checkout)
    );

    return {
      codigo_voucher: obterCodigoCurtoReserva(reserva.id),
      emitido_em: new Date().toISOString(),
      emitido_por: perfil.nome_completo,
      pousada: {
        nome: 'Pousada Pinho Verde',
        subtitulo: 'Serra da Mantiqueira · Gestão de Reservas e Vouchers',
        horario_checkin: '15h00',
        horario_checkout: '12h00',
      },
      reserva: {
        ...reserva,
        quantidade_diarias,
      },
      politicas: POLITICAS_OFICIAIS_VOUCHER,
    };
  },
};
