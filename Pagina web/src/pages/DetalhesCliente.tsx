import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  ArrowLeft, Mail, Phone, AlertTriangle, 
  CheckCircle, Clock, Bookmark, History, Award, XCircle, 
  TrendingUp, Calendar, Star, UserCheck, BookMarked
} from 'lucide-react';

interface ClienteDetalhe {
  Id: number;
  Nome: string;
  Email: string | null;
  Telefone: string | null;
}

interface Estatisticas {
  totalEmprestimos: number;
  emprestimosAtivos: number;
  emprestimosAtrasados: number;
  totalReservas: number;
}

interface EmprestimoHistorico {
  Id: number;
  Obra: string;
  Autor: string | null;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DataDevolucao: string | null;
  DiasAtraso: number;
  Status: string;
}

interface Reserva {
  Id: number;
  ObraId: number;
  Obra: string;
  ObraStatus: string;
  DataReserva: string;
}

export function DetalhesCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalEmprestimos: 0, emprestimosAtivos: 0, emprestimosAtrasados: 0, totalReservas: 0
  });
  const [historico, setHistorico] = useState<EmprestimoHistorico[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch(`/api/clientes/${id}`).then((r) => {
        if (!r.ok) throw new Error('Cliente não encontrado');
        return r.json();
      }),
      apiFetch(`/api/clientes/${id}/historico`).then((r) => r.json()),
      apiFetch(`/api/clientes/${id}/reservas`).then((r) => r.json()),
    ])
      .then(([dCliente, dHistorico, dReservas]) => {
        setCliente(dCliente.cliente);
        setEstatisticas(dCliente.estatisticas);
        setHistorico(Array.isArray(dHistorico) ? dHistorico : []);
        setReservas(Array.isArray(dReservas) ? dReservas : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        showToast('Erro ao carregar os detalhes do cliente.', 'error');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-6 mt-6 animate-fade-up">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar detalhes...
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="max-w-6xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <XCircle size={56} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Cliente não encontrado</h2>
          <p className="text-gray-500 text-sm mb-6">O cliente que procuras não existe ou foi removido.</p>
          <button onClick={() => navigate('/clientes')}
            className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
            Voltar à lista de clientes
          </button>
        </div>
      </main>
    );
  }

  const iniciais = cliente.Nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const temAtrasos = estatisticas.emprestimosAtrasados > 0;
  const bomLeitor = !temAtrasos && estatisticas.totalEmprestimos >= 3;
  const emprestimosDevolvidos = historico.filter(h => h.Status === 'DEVOLVIDO').length;

  return (
    <main className="max-w-6xl mx-auto p-6 mt-6 animate-fade-up">
      <Link to="/clientes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors mb-4">
        <ArrowLeft size={16} /> Voltar à lista de clientes
      </Link>

      {/* CABEÇALHO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-3xl shadow-2xl p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-white/5 rounded-full -mb-24"></div>

        <div className="relative flex flex-wrap items-start gap-6">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-2xl flex-shrink-0 ${
            bomLeitor ? 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-4 ring-yellow-300/50' :
            temAtrasos ? 'bg-gradient-to-br from-red-500 to-red-700 ring-4 ring-red-400/50' :
            'bg-white/20 backdrop-blur-sm border-2 border-white/30'
          }`}>
            {bomLeitor ? <Star size={40} /> : iniciais}
          </div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {bomLeitor && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 flex items-center gap-1 shadow-md">
                  <Award size={12} /> BOM LEITOR
                </span>
              )}
              {temAtrasos && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white flex items-center gap-1 shadow-md animate-pulse">
                  <AlertTriangle size={12} /> COM ATRASOS
                </span>
              )}
              {!bomLeitor && !temAtrasos && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-400 text-white flex items-center gap-1">
                  <UserCheck size={12} /> LEITOR ATIVO
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30">
                Cliente #{cliente.Id}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{cliente.Nome}</h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-blue-100 text-sm">
              {cliente.Email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={14} /> {cliente.Email}
                </span>
              )}
              {cliente.Telefone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} /> {cliente.Telefone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ESTATÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="text-at-blue" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
            </div>
            <p className="text-3xl font-bold text-at-blue">{estatisticas.totalEmprestimos}</p>
            <p className="text-xs text-gray-400 mt-1">empréstimos</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Devolvidos</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{emprestimosDevolvidos}</p>
            <p className="text-xs text-gray-400 mt-1">já entregues</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-orange-600" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ativos</p>
            </div>
            <p className="text-3xl font-bold text-orange-600">{estatisticas.emprestimosAtivos}</p>
            <p className="text-xs text-gray-400 mt-1">em curso</p>
          </div>
        </div>

        <div className={`group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden ${
          temAtrasos ? 'ring-2 ring-red-200' : ''
        }`}>
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`${temAtrasos ? 'text-red-600' : 'text-gray-400'}`} size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atrasos</p>
            </div>
            <p className={`text-3xl font-bold ${temAtrasos ? 'text-red-600' : 'text-gray-400'}`}>
              {estatisticas.emprestimosAtrasados}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {temAtrasos ? 'a resolver' : 'sem atrasos'}
            </p>
          </div>
        </div>
      </div>

      {/* RESERVAS */}
      {reservas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Bookmark className="text-yellow-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-at-blue">Reservas Ativas</h3>
              <p className="text-xs text-gray-400">Obras que este cliente está à espera</p>
            </div>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold">
              {reservas.length} em fila
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {reservas.map((reserva) => (
              <div key={reserva.Id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-yellow-50/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="text-yellow-700" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{reserva.Obra}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Calendar size={11} /> Reservado em {reserva.DataReserva}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/obras/${reserva.ObraId}`}
                  className="text-xs font-semibold text-at-blue hover:underline flex items-center gap-1"
                >
                  Ver Obra →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <History className="text-at-blue" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-at-blue">Histórico de Empréstimos</h3>
            <p className="text-xs text-gray-400">Todas as obras requisitadas por este cliente</p>
          </div>
          {estatisticas.totalEmprestimos > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
              {estatisticas.totalEmprestimos} registo(s)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {historico.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <History size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Este cliente ainda não requisitou nenhuma obra</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Obra</th>
                  <th className="px-6 py-4 font-bold">Autor</th>
                  <th className="px-6 py-4 font-bold">Empréstimo</th>
                  <th className="px-6 py-4 font-bold">Devolver até</th>
                  <th className="px-6 py-4 font-bold">Devolvido em</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {historico.map((emp) => {
                  const atrasado = emp.DiasAtraso > 0;
                  return (
                    <tr 
                      key={emp.Id} 
                      className={`border-b border-gray-50 transition-colors ${
                        atrasado ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-blue-50/30'
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800">{emp.Obra}</td>
                      <td className="px-6 py-4 text-gray-600">{emp.Autor || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{emp.DataEmprestimo}</td>
                      <td className={`px-6 py-4 font-medium ${atrasado ? 'text-red-600' : 'text-gray-600'}`}>
                        {emp.DataPrevistaDevolucao}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {emp.DataDevolucao || <span className="text-gray-300 italic">Pendente</span>}
                      </td>
                      <td className="px-6 py-4">
                        {emp.Status === 'DEVOLVIDO' ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-200">
                            <CheckCircle size={12} /> Devolvido
                          </span>
                        ) : atrasado ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-200">
                            <AlertTriangle size={12} /> Atrasado {emp.DiasAtraso}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">
                            <Clock size={12} /> Em curso
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RESUMO */}
      {estatisticas.totalEmprestimos > 0 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-at-blue rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-at-blue flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <TrendingUp size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-at-blue">Resumo do Leitor</h3>
            <p className="text-sm text-gray-700 mt-1">
              {cliente.Nome.split(' ')[0]} já requisitou <strong>{estatisticas.totalEmprestimos}</strong> obra(s) 
              {emprestimosDevolvidos > 0 && (
                <> e devolveu <strong>{emprestimosDevolvidos}</strong></>
              )}.
              {bomLeitor && (
                <span className="block mt-2 text-yellow-700 font-semibold flex items-center gap-1">
                  <Star size={14} /> Excelente histórico — leitor exemplar!
                </span>
              )}
              {temAtrasos && (
                <span className="block mt-2 text-red-700 font-semibold flex items-center gap-1">
                  <AlertTriangle size={14} /> Atenção: tem {estatisticas.emprestimosAtrasados} empréstimo(s) em atraso
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}