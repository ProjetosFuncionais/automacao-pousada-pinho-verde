import {
  ApiErrorResponse,
  NovoUsuarioPayload,
  PerfilUsuario,
  Profile,
  Reserva,
  ReservaPayload,
  StatusReserva,
  VoucherData,
} from '../types/reserva';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const STORAGE_KEY_TOKEN = 'pinho_verde_token_v1';

export const EVENTO_SESSAO_EXPIRADA = 'pinho-verde:sessao-expirada';

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

export function obterTokenSalvo(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  } catch {
    return null;
  }
}

export function salvarToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  } catch {
    // Navegador sem acesso ao armazenamento: a sessão dura só até recarregar.
  }
}

function lerErro(
  response: Response,
  data: unknown,
  mensagemPadrao: string
): never {
  const errPayload = data as Partial<ApiErrorResponse>;
  throw new ApiClientError(
    response.status,
    errPayload.erro || 'erro_requisicao',
    errPayload.mensagem || mensagemPadrao,
    errPayload.campos || {}
  );
}

async function requestFlaskApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = obterTokenSalvo();
  if (!token) {
    throw new ApiClientError(
      401,
      'nao_autenticado',
      'Sua sessão expirou. Faça login novamente.'
    );
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      salvarToken(null);
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    return lerErro(response, data, 'Não foi possível concluir a operação na API.');
  }

  return data as T;
}

export const apiService = {
  async login(email: string, password: string): Promise<Profile> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return lerErro(response, data, 'Não foi possível fazer login. Tente novamente.');
    }

    const { token, usuario } = data as { token: string; usuario: Profile };
    salvarToken(token);
    return usuario;
  },

  getMe(): Promise<Profile> {
    return requestFlaskApi<Profile>('/me');
  },

  listarReservas(filtros?: {
    busca?: string;
    status?: StatusReserva | 'todas';
  }): Promise<Reserva[]> {
    const params = new URLSearchParams();
    if (filtros?.busca?.trim()) params.set('busca', filtros.busca.trim());
    if (filtros?.status && filtros.status !== 'todas') {
      params.set('status', filtros.status);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return requestFlaskApi<Reserva[]>(`/reservas${query}`);
  },

  obterReservaPorId(id: string): Promise<Reserva> {
    return requestFlaskApi<Reserva>(`/reservas/${encodeURIComponent(id)}`);
  },

  criarReserva(payload: ReservaPayload): Promise<Reserva> {
    return requestFlaskApi<Reserva>('/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  atualizarReserva(id: string, payload: ReservaPayload): Promise<Reserva> {
    return requestFlaskApi<Reserva>(`/reservas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  cancelarReserva(id: string): Promise<Reserva> {
    return requestFlaskApi<Reserva>(
      `/reservas/${encodeURIComponent(id)}/cancelar`,
      { method: 'PATCH' }
    );
  },

  obterVoucher(id: string): Promise<VoucherData> {
    return requestFlaskApi<VoucherData>(
      `/reservas/${encodeURIComponent(id)}/voucher`
    );
  },

  registrarPagamento(id: string, valor: number): Promise<Reserva> {
    return requestFlaskApi<Reserva>(
      `/reservas/${encodeURIComponent(id)}/pagamentos`,
      { method: 'POST', body: JSON.stringify({ valor }) }
    );
  },

  alterarMinhaSenha(senhaAtual: string, senhaNova: string): Promise<void> {
    return requestFlaskApi<void>('/me/senha', {
      method: 'PUT',
      body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
    });
  },

  listarUsuarios(): Promise<Profile[]> {
    return requestFlaskApi<Profile[]>('/usuarios');
  },

  criarUsuario(payload: NovoUsuarioPayload): Promise<Profile> {
    return requestFlaskApi<Profile>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  atualizarUsuario(
    id: string,
    dados: { ativo?: boolean; perfil?: PerfilUsuario }
  ): Promise<Profile> {
    return requestFlaskApi<Profile>(`/usuarios/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  },

  redefinirSenhaUsuario(id: string, senha: string): Promise<void> {
    return requestFlaskApi<void>(`/usuarios/${encodeURIComponent(id)}/senha`, {
      method: 'PUT',
      body: JSON.stringify({ senha }),
    });
  },
};
