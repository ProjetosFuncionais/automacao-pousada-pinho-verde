/**
 * Tela 4: Formulário de Cadastro e Edição de Reserva.
 * Contém:
 * - Máscara de CPF (000.000.000-00)
 * - Máscara de WhatsApp ((00) 00000-0000)
 * - Formatação monetária em Reais (R$)
 * - Cálculo do saldo a receber em tempo real (somente leitura)
 * - Validações com React Hook Form + Zod + tratamento de erros por campo da API Flask
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Lock,
  Save,
} from 'lucide-react';
import { reservaSchema, ReservaFormValues } from '../schemas/reservaSchema';
import {
  apiService,
  ApiClientError,
  LISTA_CHALES_SUGERIDOS,
} from '../services/api';
import {
  aplicarMascaraCpf,
  aplicarMascaraWhatsapp,
  calcularQuantidadeDiarias,
  calcularSaldoReserva,
  formatarInputMoeda,
  formatarMoedaBRL,
} from '../utils/formatters';

export const ReservaFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdicao = Boolean(id);
  const navigate = useNavigate();

  const [carregandoDados, setCarregandoDados] = useState<boolean>(isEdicao);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estados visuais para exibição formatada em Reais (R$) nos campos de moeda
  const [textoValorTotal, setTextoValorTotal] = useState<string>('R$ 0,00');
  const [textoValorPago, setTextoValorPago] = useState<string>('R$ 0,00');

  const hojeIso = new Date().toISOString().slice(0, 10);
  const amanhaIso = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 10);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      nome_completo: '',
      cpf: '',
      whatsapp: '',
      endereco: '',
      numero_chale: LISTA_CHALES_SUGERIDOS[0],
      quantidade_pessoas: 2,
      data_checkin: hojeIso,
      data_checkout: amanhaIso,
      valor_total_hospedagem: 0,
      valor_total_pago: 0,
      descricao: '',
    },
  });

  // Observa valores financeiros e datas em tempo real para calcular o saldo e diárias
  const valorTotalAssistido = watch('valor_total_hospedagem') || 0;
  const valorPagoAssistido = watch('valor_total_pago') || 0;
  const dataCheckinAssistida = watch('data_checkin');
  const dataCheckoutAssistida = watch('data_checkout');

  const saldoCalculadoTempoReal = calcularSaldoReserva(
    Number(valorTotalAssistido),
    Number(valorPagoAssistido)
  );
  const diariasCalculadas = calcularQuantidadeDiarias(
    dataCheckinAssistida,
    dataCheckoutAssistida
  );

  useEffect(() => {
    if (!id) return;
    let ativo = true;

    async function carregarReservaParaEdicao(reservaId: string) {
      try {
        setCarregandoDados(true);
        const reserva = await apiService.obterReservaPorId(reservaId);
        if (!ativo) return;

        if (reserva.status === 'cancelada') {
          setErroGeral(
            'Esta reserva está cancelada e não pode mais ser editada.'
          );
        }

        reset({
          nome_completo: reserva.nome_completo,
          cpf: aplicarMascaraCpf(reserva.cpf),
          whatsapp: aplicarMascaraWhatsapp(reserva.whatsapp),
          endereco: reserva.endereco,
          numero_chale: reserva.numero_chale,
          quantidade_pessoas: reserva.quantidade_pessoas,
          data_checkin: reserva.data_checkin,
          data_checkout: reserva.data_checkout,
          valor_total_hospedagem: Number(reserva.valor_total_hospedagem),
          valor_total_pago: Number(reserva.valor_total_pago),
          descricao: reserva.descricao || '',
        });

        setTextoValorTotal(formatarMoedaBRL(reserva.valor_total_hospedagem));
        setTextoValorPago(formatarMoedaBRL(reserva.valor_total_pago));
      } catch (err) {
        if (ativo) {
          setErroGeral(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os dados da reserva.'
          );
        }
      } finally {
        if (ativo) setCarregandoDados(false);
      }
    }

    carregarReservaParaEdicao(id);
    return () => {
      ativo = false;
    };
  }, [id, reset]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mascarado = aplicarMascaraCpf(e.target.value);
    setValue('cpf', mascarado, { shouldValidate: true });
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mascarado = aplicarMascaraWhatsapp(e.target.value);
    setValue('whatsapp', mascarado, { shouldValidate: true });
  };

  const handleValorTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { textoFormatado, valorNumerico } = formatarInputMoeda(e.target.value);
    setTextoValorTotal(textoFormatado);
    setValue('valor_total_hospedagem', valorNumerico, { shouldValidate: true });
  };

  const handleValorPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { textoFormatado, valorNumerico } = formatarInputMoeda(e.target.value);
    setTextoValorPago(textoFormatado);
    setValue('valor_total_pago', valorNumerico, { shouldValidate: true });
  };

  const aplicarSinalCinquentaPorCento = () => {
    const metade = Number((Number(valorTotalAssistido || 0) * 0.5).toFixed(2));
    setTextoValorPago(formatarMoedaBRL(metade));
    setValue('valor_total_pago', metade, { shouldValidate: true });
  };

  const onSubmit = async (dados: ReservaFormValues) => {
    setErroGeral(null);
    setMensagemSucesso(null);

    try {
      if (isEdicao && id) {
        const atualizada = await apiService.atualizarReserva(id, dados);
        setMensagemSucesso('Reserva atualizada com sucesso!');
        navigate(`/reservas/${atualizada.id}`);
      } else {
        const criada = await apiService.criarReserva(dados);
        setMensagemSucesso(
          'Reserva cadastrada com sucesso! Redirecionando para os detalhes e emissão do voucher...'
        );
        navigate(`/reservas/${criada.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErroGeral(err.message);
        Object.entries(err.campos).forEach(([campo, msg]) => {
          setError(campo as keyof ReservaFormValues, {
            type: 'server',
            message: msg,
          });
        });
      } else {
        setErroGeral(
          err instanceof Error
            ? err.message
            : 'Falha ao salvar a reserva. Verifique os campos informados.'
        );
      }
    }
  };

  if (carregandoDados) {
    return (
      <div className="p-12 text-center space-y-2">
        <div className="w-7 h-7 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-600">Carregando dados da reserva...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link
            to="/reservas"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a lista de reservas</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
            {isEdicao ? 'Editar Reserva' : 'Cadastrar Nova Reserva'}
          </h1>
        </div>
      </div>

      {erroGeral && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{erroGeral}</span>
        </div>
      )}

      {mensagemSucesso && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8"
      >
        {/* Seção 1: Dados do Hóspede */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-base font-semibold text-slate-900">
              01. Identificação do Hóspede Titular
            </h2>
            <p className="text-xs text-slate-500">
              Campos obrigatórios para emissão do voucher nominal da Pousada Pinho Verde.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label
                htmlFor="nome_completo"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nome Completo *
              </label>
              <input
                id="nome_completo"
                type="text"
                placeholder="Ex: Mariana Costa Mendes"
                {...register('nome_completo')}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.nome_completo && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.nome_completo.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="cpf"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                CPF *
              </label>
              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                {...register('cpf')}
                onChange={handleCpfChange}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.cpf && (
                <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="whatsapp"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                WhatsApp *
              </label>
              <input
                id="whatsapp"
                type="tel"
                inputMode="tel"
                placeholder="(35) 99999-9999"
                {...register('whatsapp')}
                onChange={handleWhatsappChange}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.whatsapp && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.whatsapp.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-12">
              <label
                htmlFor="endereco"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Endereço Completo *
              </label>
              <input
                id="endereco"
                type="text"
                placeholder="Rua, número, complemento, bairro, cidade - UF"
                {...register('endereco')}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.endereco && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.endereco.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Seção 2: Acomodação e Período */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                02. Acomodação e Período de Estadia
              </h2>
              <p className="text-xs text-slate-500">
                Check-in às 15h · Check-out às 12h.
              </p>
            </div>
            {diariasCalculadas > 0 && (
              <span className="font-mono tabular-nums text-xs font-semibold text-emerald-800">
                {diariasCalculadas}{' '}
                {diariasCalculadas === 1 ? 'diária calculada' : 'diárias calculadas'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5">
              <label
                htmlFor="numero_chale"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Número / Nome do Chalé *
              </label>
              <input
                id="numero_chale"
                list="chales-sugeridos"
                placeholder="Selecione ou digite o chalé"
                {...register('numero_chale')}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              <datalist id="chales-sugeridos">
                {LISTA_CHALES_SUGERIDOS.map((chale) => (
                  <option key={chale} value={chale} />
                ))}
              </datalist>
              {errors.numero_chale && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.numero_chale.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="quantidade_pessoas"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nº de Pessoas *
              </label>
              <input
                id="quantidade_pessoas"
                type="number"
                min={1}
                step={1}
                {...register('quantidade_pessoas', { valueAsNumber: true })}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.quantidade_pessoas && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.quantidade_pessoas.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2.5">
              <label
                htmlFor="data_checkin"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Data Check-in *
              </label>
              <input
                id="data_checkin"
                type="date"
                {...register('data_checkin')}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.data_checkin && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.data_checkin.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2.5">
              <label
                htmlFor="data_checkout"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Data Check-out *
              </label>
              <input
                id="data_checkout"
                type="date"
                {...register('data_checkout')}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.data_checkout && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.data_checkout.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Seção 3: Valores Financeiros e Cálculo Automático de Saldo */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                03. Valores Financeiros e Saldo Automático
              </h2>
              <p className="text-xs text-slate-500">
                Política da pousada: 50% na reserva e restante no check-in.
              </p>
            </div>
            <button
              type="button"
              onClick={aplicarSinalCinquentaPorCento}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer self-start sm:self-auto"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Preencher sinal de 50% automaticamente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="input_valor_total"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Valor Total da Hospedagem (R$) *
              </label>
              <input
                id="input_valor_total"
                type="text"
                inputMode="numeric"
                value={textoValorTotal}
                onChange={handleValorTotalChange}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.valor_total_hospedagem && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.valor_total_hospedagem.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="input_valor_pago"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Valor Total Pago (R$) *
              </label>
              <input
                id="input_valor_pago"
                type="text"
                inputMode="numeric"
                value={textoValorPago}
                onChange={handleValorPagoChange}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
              {errors.valor_total_pago && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.valor_total_pago.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="saldo_somente_leitura"
                className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5"
              >
                <span>Saldo a Receber (Automático)</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <input
                id="saldo_somente_leitura"
                type="text"
                readOnly
                tabIndex={-1}
                value={formatarMoedaBRL(saldoCalculadoTempoReal)}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums font-semibold bg-slate-100 text-slate-800 border border-slate-300 rounded-lg cursor-not-allowed select-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Calculado em tempo real (Total − Pago). Somente leitura.
              </p>
            </div>
          </div>
        </div>

        {/* Seção 4: Observações / Descrição */}
        <div className="space-y-2">
          <label
            htmlFor="descricao"
            className="block text-xs font-semibold text-slate-700"
          >
            04. Observações e Descrição da Reserva (Opcional)
          </label>
          <textarea
            id="descricao"
            rows={3}
            placeholder="Ex: Solicitação de berço extra, restrição alimentar no café da manhã, horário previsto de chegada..."
            {...register('descricao')}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
          />
          {errors.descricao && (
            <p className="mt-1 text-xs text-red-600">
              {errors.descricao.message}
            </p>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            O voucher oficial poderá ser visualizado e impresso imediatamente após salvar a reserva.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              to="/reservas"
              className="px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Salvando Reserva...'
                  : isEdicao
                  ? 'Salvar Alterações'
                  : 'Salvar Reserva e Habilitar Voucher'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
