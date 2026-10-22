import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { Reserva } from '../types/reserva';
import { formatarDataBR, formatarMoedaBRL, hojeLocalIso } from '../utils/formatters';

const DIAS_A_FRENTE = 7;

const formatoDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

function rotuloDia(dataIso: string, hoje: string, amanha: string): string {
  if (dataIso === hoje) return 'Hoje';
  if (dataIso === amanha) return 'Amanhã';
  const diaSemana = formatoDiaSemana.format(new Date(`${dataIso}T12:00:00`)).replace('.', '');
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${formatarDataBR(dataIso).slice(0, 5)}`;
}

const Linha: React.FC<{ reserva: Reserva; detalhe: React.ReactNode }> = ({ reserva, detalhe }) => (
  <li>
    <Link
      to={`/reservas/${reserva.id}`}
      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 truncate">{reserva.nome_completo}</span>
        <span className="block text-xs text-slate-500 truncate">
          {reserva.numero_chale} · {reserva.quantidade_pessoas}{' '}
          {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'}
        </span>
      </span>
      <span className="shrink-0 text-right text-xs">{detalhe}</span>
    </Link>
  </li>
);

export const AgendaChegadasSaidas: React.FC<{ reservas: Reserva[]; carregando: boolean }> = ({
  reservas,
  carregando,
}) => {
  const { chegadas, saidasHoje, hoje, amanha } = useMemo(() => {
    const hojeIso = hojeLocalIso();
    const amanhaIso = hojeLocalIso(1);
    const limite = hojeLocalIso(DIAS_A_FRENTE);
    const confirmadas = reservas.filter((r) => r.status === 'confirmada');
    return {
      hoje: hojeIso,
      amanha: amanhaIso,
      chegadas: confirmadas
        .filter((r) => r.data_checkin >= hojeIso && r.data_checkin < limite)
        .sort((a, b) => a.data_checkin.localeCompare(b.data_checkin)),
      saidasHoje: confirmadas.filter((r) => r.data_checkout === hojeIso),
    };
  }, [reservas]);

  const chegadasHoje = chegadas.filter((r) => r.data_checkin === hoje).length;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Próximas chegadas</h2>
            <p className="text-xs text-slate-500">Check-ins dos próximos {DIAS_A_FRENTE} dias, a partir das 15h</p>
          </div>
          {!carregando && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <LogIn className="w-3.5 h-3.5 text-emerald-700" />
              {chegadasHoje} hoje
            </span>
          )}
        </div>
        {carregando ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : chegadas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Nenhuma chegada prevista nos próximos {DIAS_A_FRENTE} dias.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {chegadas.map((r) => (
              <Linha
                key={r.id}
                reserva={r}
                detalhe={
                  <>
                    <span
                      className={`block font-semibold ${r.data_checkin === hoje ? 'text-emerald-800' : 'text-slate-700'}`}
                    >
                      {rotuloDia(r.data_checkin, hoje, amanha)}
                    </span>
                    <span className="block text-slate-500 tabular-nums">
                      {r.valor_total_receber > 0
                        ? `Receber ${formatarMoedaBRL(r.valor_total_receber)}`
                        : 'Quitada'}
                    </span>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Saídas de hoje</h2>
            <p className="text-xs text-slate-500">Check-out até as 12h</p>
          </div>
          <LogOut className="w-4 h-4 text-slate-400" />
        </div>
        {carregando ? (
          <div className="p-5">
            <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : saidasHoje.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Nenhuma saída hoje.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {saidasHoje.map((r) => (
              <Linha
                key={r.id}
                reserva={r}
                detalhe={
                  r.valor_total_receber > 0 ? (
                    <span className="font-semibold text-amber-700 tabular-nums">
                      Falta {formatarMoedaBRL(r.valor_total_receber)}
                    </span>
                  ) : (
                    <span className="text-slate-500">Quitada</span>
                  )
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
