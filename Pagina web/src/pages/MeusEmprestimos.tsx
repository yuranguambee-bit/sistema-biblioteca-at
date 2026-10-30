import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  BookMarked, Clock, AlertTriangle, CheckCircle, 
  Calendar, ArrowLeft, RefreshCw, BookOpen, User, BellRing, RotateCw, Hourglass
} from 'lucide-react';

interface Emprestimo {
  Id: number;
  ObraId: number;
  Obra: string;
  Autor: string | null;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DiasAtraso: number;
  RenovacaoPendente?: boolean | number;
}

interface Requisicao {
  Id: number;
  ObraId: number;
  Obra: string;
  Autor: string | null;
  DataReserva: string;
  Tipo: 'LEVANTAMENTO' | 'FILA_ESPERA';
}

function isRenovacaoPendente(v: boolean | number | undefined): boolean {
  return v === true || v === 1;
}

export function MeusEmprestimos() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<number | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [resEmp, resReq] = await Promise.all([
        apiFetch('/api/portal/meus-emprestimos'),
        apiFetch('/api/portal/minhas-requisicoes')
      ]);
      const dataEmp = await resEmp.json();
      const dataReq = await resReq.json();
      
      setEmprestimos(Array.isArray(dataEmp) ? dataEmp : []);
      setRequisicoes(Array.isArray(dataReq) ? dataReq : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const totalAtrasados = emprestimos.filter((e) => e.DiasAtraso > 0).length;

  const handleSolicitarRenovacao = async (id: number, titulo: string) => {
    const ok = await confirm({
      title: 'Solicitar Renovação',
      message: `Queres pedir a renovação do empréstimo de "${titulo}" por mais 15 dias?\n\nO teu pedido será enviado à biblioteca e aguardará aprovação.`,
      confirmText: 'Enviar Pedido',
      cancelText: 'Cancelar',
      variant: 'info',
    });
    if (!ok) return;

    setProcessando(id);
    try {
      const response = await apiFetch(`/api/portal/emprestimos/${id}/renovar`, {
        method: 'PUT'
      });
      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Pedido de renovação enviado!', 'success');
        carregar();
      } else {
        showToast(data.error || 'Erro ao pedir renovação.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessando(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Voltar ao início
      </Link>

      {/* CABEÇALHO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-700 rounded-3xl shadow-2xl p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <BookMarked size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Os Meus Empréstimos</h1>
                <p className="text-orange-100 text-sm mt-0.5">Obras que tens neste momento</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20 text-center">
            <p className="text-xs text-orange-100 font-medium uppercase tracking-wider">Ativos</p>
            <p className="text-3xl font-bold mt-1">{emprestimos.length}</p>
          </div>
        </div>
      </div>

      {/* AVISOS */}
      {totalAtrasados > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-red-800">
              Atenção: tens {totalAtrasados} empréstimo(s) em atraso.
            </p>
            <p className="text-sm text-red-700 mt-1">
              Dirige-te à biblioteca para devolver as obras e evitar multas.
            </p>
          </div>
        </div>
      )}

      {/* CONTEÚDO */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-at-blue" />
          A carregar empréstimos...
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECÇÃO: RESERVAS PENDENTES */}
          {requisicoes.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BellRing className="text-blue-700" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-at-blue">Reservas e Requisições</h3>
                  <p className="text-xs text-gray-500">Livros que aguardam levantamento ou a tua vez na fila.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requisicoes.map((req) => {
                  const isLevantamento = req.Tipo === 'LEVANTAMENTO';
                  return (
                    <div 
                      key={req.Id} 
                      className={`rounded-2xl shadow-sm border-2 overflow-hidden ${
                        isLevantamento ? 'bg-blue-50/50 border-blue-200' : 'bg-orange-50/50 border-orange-200'
                      }`}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isLevantamento ? 'bg-blue-600' : 'bg-orange-500'
                        }`}>
                          <BookOpen className="text-white" size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{req.Obra}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate mt-0.5">
                            <User size={10} /> {req.Autor || 'Autor desconhecido'}
                          </p>
                          <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
                            isLevantamento ? 'text-blue-700' : 'text-orange-700'
                          }`}>
                            <Calendar size={12} /> Requisitado em {req.DataReserva}
                          </div>
                        </div>
                      </div>
                      <div className={`px-4 py-2 text-[11px] font-medium border-t ${
                        isLevantamento 
                          ? 'bg-blue-100/50 text-blue-800 border-blue-200' 
                          : 'bg-orange-100/50 text-orange-800 border-orange-200'
                      }`}>
                        {isLevantamento 
                          ? '💡 Dirige-te à biblioteca para levantares esta obra.' 
                          : '⏳ Aguarda que o livro seja devolvido. Serás notificado por email.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECÇÃO: EMPRÉSTIMOS ATIVOS */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <BookMarked className="text-orange-700" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-at-blue">Empréstimos Ativos</h3>
                <p className="text-xs text-gray-500">Obras que tens em teu poder neste momento.</p>
              </div>
            </div>

            {emprestimos.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <BookMarked size={56} className="mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">Sem empréstimos ativos</h3>
                <p className="text-gray-500 text-sm mb-6">
                  De momento não tens livros em teu poder.
                </p>
                <Link
                  to="/catalogo"
                  className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
                >
                  <BookOpen size={16} /> Explorar Catálogo
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emprestimos.map((emp) => {
                  const atrasado = emp.DiasAtraso > 0;
                  const renovacaoPendente = isRenovacaoPendente(emp.RenovacaoPendente);
                  return (
                    <div
                      key={emp.Id}
                      className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all hover:shadow-md ${
                        atrasado ? 'border-red-200' : renovacaoPendente ? 'border-yellow-300' : 'border-gray-100'
                      }`}
                    >
                      <div className={`p-4 ${atrasado ? 'bg-red-50' : renovacaoPendente ? 'bg-yellow-50' : 'bg-gradient-to-r from-orange-50 to-amber-50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              atrasado ? 'bg-red-500' : renovacaoPendente ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}>
                              <BookOpen className="text-white" size={18} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{emp.Obra}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                <User size={10} /> {emp.Autor || 'Autor desconhecido'}
                              </p>
                            </div>
                          </div>
                          {atrasado ? (
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                              <AlertTriangle size={10} /> ATRASO
                            </span>
                          ) : renovacaoPendente ? (
                            <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                              <Hourglass size={10} /> EM ANÁLISE
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                              <CheckCircle size={10} /> EM DIA
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Calendar size={11} /> Empréstimo
                          </span>
                          <span className="font-semibold text-gray-700">{emp.DataEmprestimo}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className={`flex items-center gap-1 ${atrasado ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            <Clock size={11} /> Devolver até
                          </span>
                          <span className={`font-bold ${atrasado ? 'text-red-600' : 'text-gray-700'}`}>
                            {emp.DataPrevistaDevolucao}
                          </span>
                        </div>

                        {atrasado && (
                          <div className="bg-red-50 rounded-lg p-2 text-center mt-2">
                            <p className="text-xs text-red-700 font-bold">
                              {emp.DiasAtraso} dia{emp.DiasAtraso !== 1 ? 's' : ''} de atraso
                            </p>
                          </div>
                        )}

                        {/* BOTÃO SOLICITAR RENOVAÇÃO - só se não atrasado e não pendente */}
                        {!atrasado && !renovacaoPendente && (
                          <button
                            onClick={() => handleSolicitarRenovacao(emp.Id, emp.Obra)}
                            disabled={processando === emp.Id}
                            className="w-full mt-2 bg-blue-600 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {processando === emp.Id ? (
                              <><RefreshCw size={12} className="animate-spin" /> A enviar pedido...</>
                            ) : (
                              <><RotateCw size={12} /> Solicitar Renovação +15 dias</>
                            )}
                          </button>
                        )}

                        {/* MENSAGEM SE RENOVAÇÃO ESTÁ PENDENTE */}
                        {!atrasado && renovacaoPendente && (
                          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                            <p className="text-xs text-yellow-800 font-semibold flex items-center justify-center gap-1">
                              <Hourglass size={11} /> Pedido de renovação aguarda aprovação da biblioteca
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* RODAPÉ INFORMATIVO */}
      {emprestimos.length > 0 && (
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Nota:</strong> Quando devolveres um livro na biblioteca, ele desaparecerá automaticamente desta lista.
            Podes consultar o histórico em <Link to="/meu-historico" className="font-semibold underline">Meu Histórico</Link>.
            <br />
            <strong>💡 Renovação:</strong> O pedido de renovação é enviado à biblioteca para aprovação. Só podes pedir se o empréstimo não estiver em atraso e se não houver fila de espera.
          </p>
        </div>
      )}
    </main>
  );
}