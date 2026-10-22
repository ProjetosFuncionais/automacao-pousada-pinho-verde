export type PerfilUsuario = 'admin' | 'recepcao';

export type StatusReserva = 'confirmada' | 'cancelada';

export interface Profile {
  id: string;
  email: string;
  nome_completo: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  created_at?: string;
}

export interface Reserva {
  id: string;
  nome_completo: string;
  cpf: string;
  whatsapp: string;
  endereco: string;
  numero_chale: string;
  quantidade_pessoas: number;
  data_checkin: string;
  data_checkout: string;
  valor_total_hospedagem: number;
  valor_total_pago: number;
  valor_total_receber: number;
  descricao: string | null;
  status: StatusReserva;
  criado_por: string;
  created_at: string;
  updated_at: string;
}

export interface ReservaPayload {
  nome_completo: string;
  cpf: string;
  whatsapp: string;
  endereco: string;
  numero_chale: string;
  quantidade_pessoas: number;
  data_checkin: string;
  data_checkout: string;
  valor_total_hospedagem: number;
  valor_total_pago: number;
  descricao?: string | null;
}

export interface VoucherData {
  codigo_voucher: string;
  emitido_em: string;
  emitido_por: string;
  pousada: {
    nome: string;
    subtitulo: string;
    horario_checkin: string;
    horario_checkout: string;
  };
  reserva: Reserva & {
    quantidade_diarias: number;
  };
  politicas: string[];
}

export interface ApiErrorResponse {
  erro: string;
  mensagem: string;
  campos: Record<string, string>;
}
