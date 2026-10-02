/**
 * Tela 6: Visualização e Impressão do Voucher Oficial da Pousada Pinho Verde.
 * Permite imprimir diretamente ou salvar como PDF pelo navegador (window.print()),
 * exibindo todos os dados da reserva, cálculo do saldo e as 9 políticas obrigatórias.
 */
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Printer, Trees, XCircle } from 'lucide-react';
import { apiService, ApiClientError } from '../services/api';
import { VoucherData } from '../types/reserva';
import {
  formatarDataBR,
  formatarDataHoraBR,
  formatarMoedaBRL,
} from '../utils/formatters';
import { AccessDeniedOrNotFoundPage } from './AccessDeniedOrNotFoundPage';

export const VoucherPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [naoEncontrado, setNaoEncontrado] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;

    async function carregarVoucher(reservaId: string) {
      try {
        setCarregando(true);
        const dados = await apiService.obterVoucher(reservaId);
        if (ativo) {
          setVoucher(dados);
          setNaoEncontrado(false);
        }
      } catch (err) {
        if (!ativo) return;
        if (err instanceof ApiClientError && err.status === 404) {
          setNaoEncontrado(true);
        } else {
          setErro(
            err instanceof Error
              ? err.message
              : 'Não foi possível gerar o voucher desta reserva.'
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarVoucher(id);
    return () => {
      ativo = false;
    };
  }, [id]);

  const handleImprimirOuSalvarPdf = () => {
    window.print();
  };

  if (carregando) {
    return (
      <div className="p-12 text-center space-y-2">
        <div className="w-7 h-7 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-600">
          Preparando documento oficial do voucher...
        </p>
      </div>
    );
  }

  if (naoEncontrado || !voucher) {
    return <AccessDeniedOrNotFoundPage tipo="nao_encontrado" />;
  }

  if (erro) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        {erro}
      </div>
    );
  }

  const { reserva, politicas } = voucher;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barra de Ações (Oculta na impressão via classe .no-print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/reservas/${reserva.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Detalhes da Reserva</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleImprimirOuSalvarPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar como PDF</span>
          </button>
        </div>
      </div>

      {/* Folha Oficial do Voucher */}
      <article className="print-only-container bg-white border border-slate-300 rounded-xl p-8 sm:p-10 space-y-8 text-slate-900">
        {/* Cabeçalho do Voucher */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-300 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Trees className="w-6 h-6 text-emerald-800" />
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
                Pousada Pinho Verde
              </h1>
            </div>
            <p className="text-xs text-slate-600">
              Comprovante Oficial de Reserva e Voucher de Hospedagem
            </p>
          </div>

          <div className="sm:text-right space-y-1 font-mono tabular-nums">
            <p className="text-xs text-slate-500">Código do Voucher</p>
            <p className="text-lg font-semibold text-slate-900">
              {voucher.codigo_voucher}
            </p>
            <div className="pt-1">
              {reserva.status === 'confirmada' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>RESERVA CONFIRMADA</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>RESERVA CANCELADA</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Bloco 1: Identificação do Hóspede */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            01. Dados do Hóspede Titular
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Nome Completo</p>
              <p className="font-semibold text-slate-900">
                {reserva.nome_completo}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CPF</p>
              <p className="font-mono tabular-nums font-medium text-slate-900">
                {reserva.cpf}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">WhatsApp de Contato</p>
              <p className="font-mono tabular-nums font-medium text-slate-900">
                {reserva.whatsapp}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-xs text-slate-500">Endereço Residencial</p>
              <p className="text-slate-800">{reserva.endereco}</p>
            </div>
          </div>
        </section>

        {/* Bloco 2: Acomodação e Datas */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            02. Detalhes da Acomodação e Período
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Chalé Reservado</p>
              <p className="font-semibold text-slate-900">
                {reserva.numero_chale}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nº de Hóspedes</p>
              <p className="font-mono tabular-nums font-semibold text-slate-900">
                {reserva.quantidade_pessoas}{' '}
                {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total de Diárias</p>
              <p className="font-mono tabular-nums font-semibold text-slate-900">
                {reserva.quantidade_diarias}{' '}
                {reserva.quantidade_diarias === 1 ? 'diária' : 'diárias'}
              </p>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Entrada (Check-in às 15h)</p>
              <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
                {formatarDataBR(reserva.data_checkin)} · a partir das 15h00
              </p>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Saída (Check-out às 12h)</p>
              <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
                {formatarDataBR(reserva.data_checkout)} · até as 12h00
              </p>
            </div>
          </div>

          {reserva.descricao && (
            <div className="pt-2">
              <p className="text-xs text-slate-500">Observações da Reserva</p>
              <p className="text-sm text-slate-800">{reserva.descricao}</p>
            </div>
          )}
        </section>

        {/* Bloco 3: Demonstrativo Financeiro */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            03. Demonstrativo Financeiro da Hospedagem
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono tabular-nums">
            <div>
              <p className="text-xs font-sans text-slate-500">
                Valor Total da Hospedagem
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatarMoedaBRL(reserva.valor_total_hospedagem)}
              </p>
            </div>
            <div>
              <p className="text-xs font-sans text-slate-500">
                Valor Recebido na Reserva
              </p>
              <p className="text-lg font-semibold text-emerald-800">
                {formatarMoedaBRL(reserva.valor_total_pago)}
              </p>
            </div>
            <div>
              <p className="text-xs font-sans text-slate-500">
                Saldo a Pagar no Check-in
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatarMoedaBRL(reserva.valor_total_receber)}
              </p>
            </div>
          </div>
        </section>

        {/* Bloco 4: Políticas Obrigatórias da Pousada Pinho Verde */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            04. Políticas de Hospedagem, Cancelamento e Pagamento — Pousada Pinho Verde
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
            {politicas.map((politica, index) => (
              <li key={index}>{politica}</li>
            ))}
          </ul>
        </section>

        {/* Rodapé de Autenticidade do Voucher (apenas na tela, oculto na impressão) */}
        <footer className="no-print pt-6 border-t border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
          <span>ID da Reserva: {reserva.id}</span>
          <span>
            Emitido em {formatarDataHoraBR(voucher.emitido_em)} por{' '}
            {voucher.emitido_por}
          </span>
        </footer>
      </article>
    </div>
  );
};
