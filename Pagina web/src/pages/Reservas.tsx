import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bookmark, Clock, User, Trash2, ArrowRight, Lock, 
  CheckCircle, BookOpen, RefreshCw, Send, AlertCircle
} from 'lucide-react';

interface Reserva {
  Id: number;
  ObraId: number;
  Obra: string;
  ObraStatus: string;
  Cliente: string;
  ClienteEmail: string | null;
  ClienteTelefone: string | null;
  DataReserva: string;
  Status: string;
  Tipo: 'LEVANTAMENTO' | 'FILA_ESPERA';
}

export function Reservas() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { temPermissao } = useAuth();
  const navigate = useNavigate();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<number | null>(null);

  const podeCancelar = temPermissao('reservas_cancelar');
  const podeConfirmar = temPermissao('emprestimos_criar');

  const carregarReservas = async () => {
    try {
      const res = await apiFetch('/api/reservas');
      const data = await res.json();
      setReservas(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  useEffect(() => { carregarReservas(); }, []);

  // Separação por tipo
  const requisicoesLevantamento = useMemo(
    () => reservas.filter((r) => r.Tipo === 'LEVANTAMENTO'),
    [reservas]
  );
  const filaEspera = useMemo(
    () => reservas.filter((r) => r.Tipo === 'FILA_ESPERA'),
    [reservas]
  );

  const handleConfirmarRequisicao = async (reserva: Reserva) => {
    if (!podeConfirmar) return showToast('Não tens permissão para confirmar empréstimos.', 'error');

    const ok = await confirm({
      title: 'Confirmar Empréstimo',
      message: `Confirmas a entrega da obra "${reserva.Obra}" ao leitor "${reserva.Cliente}"? O empréstimo será registado e o leitor receberá um email.`,
      confirmText: 'Confirmar Entrega',
      cancelText: 'Cancelar',
      variant: 'info',
    });
    if (!ok) return;

    setProcessando(reserva.Id);
    try {
      const response = await apiFetch(`/api/emprestimos/confirmar-requisicao/${reserva.Id}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Empréstimo confirmado com sucesso!', 'success');
        carregarReservas();
        if (data.emprestimoId) {
          setTimeout(() => navigate(`/comprovativo/${data.emprestimoId}`), 600);
        }
      } else {
        showToast(data.error || 'Erro ao confirmar empréstimo.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessando(null);
    }
  };

  const handleCancelar = async (id: number, cliente: string, obra: string) => {
    if (!podeCancelar) return showToast('Não tens permissão para cancelar reservas.', 'error');

    const ok = await confirm({
      title: 'Cancelar Reserva',
      message: `Tens a certeza que queres cancelar a reserva de "${cliente}" para a obra "${obra}"?`,
      confirmText: 'Cancelar Reserva',
      cancelText: 'Manter',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/reservas/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Reserva cancelada com sucesso.', 'success');
        carregarReservas();
      } else {
        showToast('Erro ao cancelar reserva.', 'error');
      }
    } catch (error) { showToast('Erro de ligação ao servidor.', 'error'); }
  };

  const agruparPorObra = (lista: Reserva[]) => {
    return lista.reduce((acc: { [key: number]: Reserva[] }, reserva) => {
      if (!acc[reserva.ObraId]) acc[reserva.ObraId] = [];
      acc[reserva.ObraId].push(reserva);
      return acc;
    }, {});
  };

  const filaEsperaPorObra = agruparPorObra(filaEspera);

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      {/* CABEÇALHO */}
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-6 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Bookmark size={22} />
              </div>
              <h2 className="text-2xl font-bold">Gestão de Reservas e Requisições</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Requisições pendentes do portal e fila de espera para obras emprestadas.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl px-5 py-3 border border-yellow-300/30">
              <p className="text-xs text-yellow-100 font-medium uppercase tracking-wider">Requisições</p>
              <p className="text-3xl font-bold mt-1">{requisicoesLevantamento.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
              <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Fila de Espera</p>
              <p className="text-3xl font-bold mt-1">{filaEspera.length}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-at-blue" />
          A carregar...
        </div>
      ) : reservas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Bookmark size={56} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Sem reservas nem requisições</h3>
          <p className="text-gray-500 text-sm mb-6">
            Quando alguém requisitar pelo portal ou reservar uma obra emprestada, aparece aqui.
          </p>
          <Link
            to="/acervo"
            className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
          >
            Ver Acervo <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ============ SECÇÃO 1: REQUISIÇÕES DE LEVANTAMENTO ============ */}
          {requisicoesLevantamento.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Send className="text-yellow-700" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-at-blue">Requisições de Levantamento</h3>
                  <p className="text-xs text-gray-500">
                    Pedidos feitos pelo portal. Confirma a entrega quando o leitor chegar à biblioteca.
                  </p>
                </div>
                <span className="ml-auto bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
                  {requisicoesLevantamento.length} pendente(s)
                </span>
              </div>

              <div className="space-y-3">
                {requisicoesLevantamento.map((req) => (
                  <div
                    key={req.Id}
                    className="bg-white rounded-2xl shadow-sm border-l-4 border-yellow-400 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <BookOpen size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 truncate">{req.Obra}</h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                            <User size={12} className="text-gray-400" />
                            {req.Cliente}
                          </p>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {req.ClienteEmail && <span>✉️ {req.ClienteEmail}</span>}
                            {req.ClienteTelefone && <span>📞 {req.ClienteTelefone}</span>}
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {req.DataReserva}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleConfirmarRequisicao(req)}
                          disabled={processando === req.Id || !podeConfirmar}
                          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                          title={podeConfirmar ? 'Confirmar entrega' : 'Sem permissão'}
                        >
                          {processando === req.Id ? (
                            <><RefreshCw size={14} className="animate-spin" /> A processar...</>
                          ) : (
                            <><CheckCircle size={14} /> Confirmar Empréstimo</>
                          )}
                        </button>
                        <button
                          onClick={() => handleCancelar(req.Id, req.Cliente, req.Obra)}
                          disabled={!podeCancelar}
                          className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-2.5 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors ring-1 ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={podeCancelar ? 'Cancelar requisição' : 'Sem permissão'}
                        >
                          {podeCancelar ? <Trash2 size={14} /> : <Lock size={14} />} Cancelar
                        </button>
                      </div>
                    </div>
                    <div className="bg-yellow-50 border-t border-yellow-100 px-5 py-2 text-xs text-yellow-800 flex items-center gap-2">
                      <AlertCircle size={12} />
                      O livro ainda está <strong>disponível</strong>. Ao confirmar, será registado o empréstimo e o leitor receberá um email.
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============ SECÇÃO 2: FILA DE ESPERA ============ */}
          {filaEspera.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="text-blue-700" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-at-blue">Fila de Espera</h3>
                  <p className="text-xs text-gray-500">
                    Leitores à espera que uma obra emprestada seja devolvida.
                  </p>
                </div>
                <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                  {filaEspera.length} na fila
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(filaEsperaPorObra).map(([obraId, listaReservas]) => {
                  const obra = listaReservas[0];
                  const isEmprestada = obra.ObraStatus === 'EMPRESTADO';

                  return (
                    <div key={obraId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-at-blue flex items-center justify-center text-white">
                            <Bookmark size={18} />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-at-blue">{obra.Obra}</h4>
                            <p className="text-xs text-gray-500">{listaReservas.length} pessoa(s) na fila de espera</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isEmprestada ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-green-50 text-green-700 ring-1 ring-green-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isEmprestada ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {obra.ObraStatus}
                          </span>
                          <Link to={`/obras/${obraId}`} className="text-xs font-semibold text-at-blue hover:underline flex items-center gap-1">
                            Ver Obra <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-50">
                        {listaReservas.map((reserva, index) => (
                          <div key={reserva.Id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-blue-50/20 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300' : 'bg-gray-100 text-gray-600'}`}>
                                {index + 1}º
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                <p className="font-semibold text-gray-800 flex items-center gap-2">
                                  <User size={14} className="text-gray-400" />
                                  {reserva.Cliente}
                                </p>
                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                  {reserva.ClienteEmail && <span>✉️ {reserva.ClienteEmail}</span>}
                                  {reserva.ClienteTelefone && <span>📞 {reserva.ClienteTelefone}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase font-semibold">Reservado em</p>
                                <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                  <Clock size={12} /> {reserva.DataReserva}
                                </p>
                              </div>
                              <button
                                onClick={() => handleCancelar(reserva.Id, reserva.Cliente, reserva.Obra)}
                                disabled={!podeCancelar}
                                className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors ring-1 ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50"
                                title={podeCancelar ? 'Cancelar reserva' : 'Sem permissão para cancelar'}
                              >
                                {podeCancelar ? <Trash2 size={14} /> : <Lock size={14} />} Cancelar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isEmprestada && (
                        <div className="bg-yellow-50 border-t border-yellow-100 px-6 py-3 text-xs text-yellow-800 font-medium flex items-center gap-2">
                          ⚠️ A obra está emprestada. O <strong>1º da fila</strong> será notificado quando for devolvida.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}