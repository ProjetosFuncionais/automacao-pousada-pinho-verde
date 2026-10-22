export function extrairDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

export function aplicarMascaraCpf(valor: string): string {
  const digitos = extrairDigitos(valor).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  }
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

export function validarCpfBrasileiro(cpf: string): boolean {
  const digitos = extrairDigitos(cpf);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digitos.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(digitos.charAt(10), 10);
}

export function aplicarMascaraWhatsapp(valor: string): string {
  const digitos = extrairDigitos(valor).slice(0, 11);
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}

export function formatarMoedaBRL(valor: number | string | undefined | null): string {
  const numero = typeof valor === 'string' ? parseFloat(valor) : Number(valor ?? 0);
  if (Number.isNaN(numero)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numero);
}

export function formatarInputMoeda(valorBruto: string): {
  textoFormatado: string;
  valorNumerico: number;
} {
  const digitos = extrairDigitos(valorBruto);
  if (!digitos) {
    return { textoFormatado: 'R$ 0,00', valorNumerico: 0 };
  }
  const centavos = parseInt(digitos, 10);
  const valorNumerico = Number((centavos / 100).toFixed(2));
  return {
    textoFormatado: formatarMoedaBRL(valorNumerico),
    valorNumerico,
  };
}

export function calcularSaldoReserva(
  valorTotalHospedagem: number,
  valorTotalPago: number
): number {
  const total = Number.isFinite(valorTotalHospedagem) ? valorTotalHospedagem : 0;
  const pago = Number.isFinite(valorTotalPago) ? valorTotalPago : 0;
  return Number(Math.max(0, total - pago).toFixed(2));
}

export function calcularQuantidadeDiarias(
  dataCheckin: string,
  dataCheckout: string
): number {
  if (!dataCheckin || !dataCheckout) return 0;
  const inicio = new Date(`${dataCheckin}T00:00:00`);
  const fim = new Date(`${dataCheckout}T00:00:00`);
  const diffMs = fim.getTime() - inicio.getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 0;
}

export function formatarDataBR(dataIso: string | undefined | null): string {
  if (!dataIso) return '—';
  const partes = dataIso.slice(0, 10).split('-');
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function formatarDataHoraBR(isoString: string | undefined | null): string {
  if (!isoString) return '—';
  const data = new Date(isoString);
  if (Number.isNaN(data.getTime())) return isoString;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

export function obterCodigoCurtoReserva(id: string): string {
  if (!id) return 'PPV-000000';
  return `PPV-${id.split('-')[0].toUpperCase()}`;
}
