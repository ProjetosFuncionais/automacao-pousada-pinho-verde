import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail, Printer, Trees, XCircle } from 'lucide-react';
import { apiService, ApiClientError } from '../services/api';
import { VoucherData } from '../types/reserva';
import {
  formatarDataBR,
  formatarDataHoraBR,
  formatarMoedaBRL,
} from '../utils/formatters';
import { AccessDeniedOrNotFoundPage } from './AccessDeniedOrNotFoundPage';
import { EnviarVoucherEmailModal } from '../components/EnviarVoucherEmailModal';

export const VoucherPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [naoEncontrado, setNaoEncontrado] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null);

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
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/reservas/${reserva.id}`}
            className="inline-flex items-center gap-1.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a reserva</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {reserva.status === 'confirmada' && (
            <button
              type="button"
              onClick={() => setModalEmailAberto(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar por e-mail</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleImprimirOuSalvarPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir ou salvar PDF</span>
          </button>
        </div>
      </div>

      {avisoEmail && (
        <div role="status" className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
          {avisoEmail}
        </div>
      )}

      <EnviarVoucherEmailModal
        aberto={modalEmailAberto}
        reservaId={reserva.id}
        nomeHospede={reserva.nome_completo}
        emailSalvo={reserva.email}
        onEnviado={(email, mensagem) => {
          setModalEmailAberto(false);
          setAvisoEmail(mensagem);
          setVoucher((v) => (v ? { ...v, reserva: { ...v.reserva, email } } : v));
        }}
        onFechar={() => setModalEmailAberto(false)}
      />

      <article className="print-only-container bg-white border border-slate-300 rounded-xl p-5 sm:p-10 space-y-7 sm:space-y-8 print:space-y-5 text-slate-900">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 border-b border-slate-300 pb-5 sm:pb-6 print:pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Trees className="w-6 h-6 text-emerald-800" />
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
                Pousada Pinho Verde
              </h1>
            </div>
            <p className="text-xs text-slate-600">
              Voucher de hospedagem
            </p>
          </div>

          <div className="sm:text-right space-y-1 tabular-nums">
            <p className="text-xs text-slate-500">Código do voucher</p>
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

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            Hóspede
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500">Nome completo</p>
              <p className="font-semibold text-slate-900">
                {reserva.nome_completo}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CPF</p>
              <p className="tabular-nums font-medium text-slate-900">
                {reserva.cpf}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">WhatsApp</p>
              <p className="tabular-nums font-medium text-slate-900">
                {reserva.whatsapp}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-slate-500">Endereço</p>
              <p className="text-slate-800">{reserva.endereco}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            Hospedagem
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Chalé</p>
              <p className="font-semibold text-slate-900">
                {reserva.numero_chale}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Hóspedes</p>
              <p className="tabular-nums font-semibold text-slate-900">
                {reserva.quantidade_pessoas}{' '}
                {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Diárias</p>
              <p className="tabular-nums font-semibold text-slate-900">
                {reserva.quantidade_diarias}{' '}
                {reserva.quantidade_diarias === 1 ? 'diária' : 'diárias'}
              </p>
            </div>

            <div className="col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Entrada (Check-in às 15h)</p>
              <p className="tabular-nums text-sm sm:text-base font-semibold text-slate-900">
                {formatarDataBR(reserva.data_checkin)} · a partir das 15h00
              </p>
            </div>

            <div className="col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Saída (Check-out às 12h)</p>
              <p className="tabular-nums text-sm sm:text-base font-semibold text-slate-900">
                {formatarDataBR(reserva.data_checkout)} · até as 12h00
              </p>
            </div>
          </div>

          {reserva.descricao && (
            <div className="pt-2">
              <p className="text-xs text-slate-500">Observações</p>
              <p className="text-sm text-slate-800">{reserva.descricao}</p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            Valores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg tabular-nums">
            <div>
              <p className="text-xs font-sans text-slate-500">
                Valor total da hospedagem
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatarMoedaBRL(reserva.valor_total_hospedagem)}
              </p>
            </div>
            <div>
              <p className="text-xs font-sans text-slate-500">
                Pago na reserva
              </p>
              <p className="text-lg font-semibold text-emerald-800">
                {formatarMoedaBRL(reserva.valor_total_pago)}
              </p>
            </div>
            <div>
              <p className="text-xs font-sans text-slate-500">
                A pagar no check-in
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatarMoedaBRL(reserva.valor_total_receber)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5">
            Políticas da pousada
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 print:gap-y-1 text-xs text-slate-700 leading-relaxed print:leading-snug list-disc pl-4">
            {politicas.map((politica, index) => (
              <li key={index}>{politica}</li>
            ))}
          </ul>
        </section>

        <section className="assinaturas space-y-5" aria-label="Assinaturas">
          <p className="text-xs text-slate-700">
            Declaro que conferi os dados desta reserva e que li e concordo com as
            políticas da pousada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
            <div className="pt-7">
              <div className="border-t border-slate-500" />
              <p className="mt-1.5 text-xs font-semibold text-slate-800">
                Assinatura do hóspede
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {reserva.nome_completo} · CPF {reserva.cpf}
              </p>
            </div>
            <div className="pt-7">
              <div className="border-t border-slate-500" />
              <p className="mt-1.5 text-xs font-semibold text-slate-800">
                Recepção
              </p>
              <p className="text-xs text-slate-500">Pousada Pinho Verde</p>
            </div>
          </div>
          <p className="text-xs text-slate-700 tabular-nums">
            Data: ______/______/__________
          </p>
        </section>

        <footer className="no-print pt-6 border-t border-slate-300 text-xs text-slate-500 tabular-nums">
          <span>
            Emitido em {formatarDataHoraBR(voucher.emitido_em)} por{' '}
            {voucher.emitido_por}
          </span>
        </footer>
      </article>
    </div>
  );
};
