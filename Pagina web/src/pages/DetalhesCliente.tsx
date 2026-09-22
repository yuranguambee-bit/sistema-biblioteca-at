import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  ArrowLeft, User, Mail, Phone, BookOpen, AlertTriangle, 
  CheckCircle, Clock, Bookmark, History, Award, XCircle
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
      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar detalhes...
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="max-w-5xl mx-auto p-6 mt-6">
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

  const isBomLeitor = estatisticas.emprestimosAtrasados === 0 && estatisticas.totalEmprestimos >= 3;
  const temAtrasos = estatisticas.emprestimosAtrasados > 0;

  return (
    <main className="max-w-5xl mx-auto p-6 mt-6">
      <Link to="/clientes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors mb-4">
        <ArrowLeft size={16} /> Voltar à lista de clientes
      </Link>

      {/* Cabeçalho */}
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 right-24 w-40 h-40 bg-white/5 rounded-full -mb-20"></div>
        
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <User size={26} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-400 text-white">
                  Cliente #{cliente.Id}
                </span>
                {isBomLeitor && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 flex items-center gap-1">
                    <Award size={12} /> BOM LEITOR
                  </span>
                )}
                {temAtrasos && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={12} /> COM ATRASOS
                  </span>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{cliente.Nome}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-blue-100 text-sm mt-3">
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

      {/* Cartões de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="text-at-blue" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Empréstimos</p>
            </div>
            <p className="text-3xl font-bold text-at-blue">{estatisticas.totalEmprestimos}</p>
            <p className="text-xs text-gray-400 mt-1">total histórico</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ativos</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{estatisticas.emprestimosAtivos}</p>
            <p className="text-xs text-gray-400 mt-1">em curso</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-600" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atrasos</p>
            </div>
            <p className={`text-3xl font-bold ${estatisticas.emprestimosAtrasados > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {estatisticas.emprestimosAtrasados}
            </p>
            <p className="text-xs text-gray-400 mt-1">em atraso</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Bookmark className="text-yellow-600" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reservas</p>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{estatisticas.totalReservas}</p>
            <p className="text-xs text-gray-400 mt-1">pendentes</p>
          </div>
        </div>
      </div>

      {/* Reservas Ativas */}
      {reservas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Bookmark className="text-yellow-600" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-at-blue">Reservas Ativas</h3>
              <p className="text-xs text-gray-400">Obras que este cliente está à espera</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {reservas.map((reserva) => (
              <div key={reserva.Id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-yellow-50/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="text-yellow-700" size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{reserva.Obra}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reservado em {reserva.DataReserva}
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

      {/* Histórico de Empréstimos */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <History className="text-at-blue" size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-at-blue">Histórico de Empréstimos</h3>
            <p className="text-xs text-gray-400">Todas as obras requisitadas por este cliente</p>
          </div>
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
    </main>
  );
}