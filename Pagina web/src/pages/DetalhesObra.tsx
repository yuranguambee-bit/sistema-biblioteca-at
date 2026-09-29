import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  ArrowLeft, BookOpen, User, Building2, CheckCircle, XCircle, 
  Clock, Mail, Phone, History, Bookmark, Plus, Printer,
  Calendar, Award, TrendingUp, Users, UserPlus, AlertTriangle,
  BookMarked, Sparkles
} from 'lucide-react';

interface ObraDetalhe {
  Id: number;
  Titulo: string;
  Ano: number;
  Status: string;
  Autor: string | null;
  Nacionalidade: string | null;
  Editora: string | null;
  EditoraContacto: string | null;
}

interface EmprestimoHistorico {
  Id: number;
  Cliente: string;
  ClienteEmail: string | null;
  ClienteTelefone: string | null;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DataDevolucao: string | null;
  Status: string;
}

interface Reserva {
  Posicao: number;
  Id: number;
  Cliente: string;
  ClienteEmail: string | null;
  ClienteTelefone: string | null;
  DataReserva: string;
}

interface Cliente { Id: number; Nome: string; }

export function DetalhesObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [historico, setHistorico] = useState<EmprestimoHistorico[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [mostrarFormReserva, setMostrarFormReserva] = useState(false);

  const carregarTudo = async () => {
    if (!id) return;
    try {
      const [dObra, dHistorico, dReservas, dClientes] = await Promise.all([
        apiFetch(`/api/obras/${id}`).then((r) => {
          if (!r.ok) throw new Error('Obra não encontrada');
          return r.json();
        }),
        apiFetch(`/api/obras/${id}/historico`).then((r) => r.json()),
        apiFetch(`/api/obras/${id}/reservas`).then((r) => r.json()),
        apiFetch('/api/clientes').then((r) => r.json()),
      ]);
      setObra(dObra);
      setHistorico(Array.isArray(dHistorico) ? dHistorico : []);
      setReservas(Array.isArray(dReservas) ? dReservas : []);
      setClientes(Array.isArray(dClientes) ? dClientes : []);
      if (Array.isArray(dClientes) && dClientes.length > 0) {
        setClienteSelecionado(dClientes[0].Id.toString());
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar os detalhes da obra.', 'error');
      setLoading(false);
    }
  };

  useEffect(() => { carregarTudo(); }, [id]);

  const handleCriarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado) return;
    
    try {
      const response = await apiFetch('/api/reservas', {
        method: 'POST',
        body: JSON.stringify({ ObraId: Number(id), ClienteId: Number(clienteSelecionado) }),
      });
      const data = await response.json();
      
      if (response.ok) {
        showToast('Reserva criada com sucesso!', 'success');
        setMostrarFormReserva(false);
        carregarTudo();
      } else {
        showToast(data.error || 'Erro ao criar reserva.', 'error');
      }
    } catch (error) { showToast('Erro de ligação ao servidor.', 'error'); }
  };

  const handleCancelarReserva = async (reservaId: number, cliente: string) => {
    const ok = await confirm({
      title: 'Cancelar Reserva',
      message: `Queres cancelar a reserva de "${cliente}"?`,
      confirmText: 'Cancelar Reserva',
      cancelText: 'Manter',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/reservas/${reservaId}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Reserva cancelada.', 'success');
        carregarTudo();
      } else {
        showToast('Erro ao cancelar reserva.', 'error');
      }
    } catch (error) { showToast('Erro de ligação.', 'error'); }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6 mt-6 animate-fade-up">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar detalhes...
        </div>
      </main>
    );
  }

  if (!obra) {
    return (
      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <XCircle size={56} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Obra não encontrada</h2>
          <p className="text-gray-500 text-sm mb-6">A obra que procuras não existe ou foi removida.</p>
          <button onClick={() => navigate('/acervo')}
            className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
            Voltar ao Acervo
          </button>
        </div>
      </main>
    );
  }

  const isDisponivel = obra.Status === 'DISPONIVEL';
  const totalEmprestimos = historico.length;
  const emprestimosDevolvidos = historico.filter(h => h.Status === 'DEVOLVIDO').length;
  const emprestimosAtivos = historico.filter(h => h.Status === 'ATIVO').length;
  const isTop5 = totalEmprestimos >= 3; // Badge "Popular" se tiver 3+ empréstimos

  return (
    <main className="max-w-6xl mx-auto p-6 mt-6 animate-fade-up">
      {/* Botão Voltar */}
      <Link to="/acervo"
        className="inline-flex items-center gap-2 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors mb-4">
        <ArrowLeft size={16} /> Voltar ao Acervo
      </Link>

      {/* ============ CABEÇALHO DA OBRA ============ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-3xl shadow-2xl p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-white/5 rounded-full -mb-24"></div>

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[280px]">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <BookOpen size={22} />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDisponivel ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
              }`}>
                ● {obra.Status}
              </span>
              {isTop5 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 flex items-center gap-1">
                  <Award size={12} /> POPULAR
                </span>
              )}
            </div>

            {/* Título */}
            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{obra.Titulo}</h1>
            <p className="text-blue-100 text-sm">
              Obra #<strong>{obra.Id}</strong> · Publicada em <strong>{obra.Ano}</strong>
            </p>
          </div>

          {/* Ações rápidas */}
          <div className="flex flex-col gap-3">
            {isDisponivel ? (
              <Link to="/emprestimos"
                className="bg-white text-at-blue px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors text-sm flex items-center gap-2 shadow-lg">
                <CheckCircle size={18} /> Requisitar Obra
              </Link>
            ) : (
              <button onClick={() => setMostrarFormReserva(!mostrarFormReserva)}
                className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-lg font-bold hover:bg-yellow-300 transition-colors text-sm flex items-center gap-2 shadow-lg">
                <Bookmark size={18} /> {mostrarFormReserva ? 'Fechar' : 'Reservar Obra'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============ ESTATÍSTICAS DA OBRA ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="text-at-blue" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
            </div>
            <p className="text-3xl font-bold text-at-blue">{totalEmprestimos}</p>
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
            <p className="text-3xl font-bold text-orange-600">{emprestimosAtivos}</p>
            <p className="text-xs text-gray-400 mt-1">em curso</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-yellow-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-yellow-600" size={18} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reservas</p>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{reservas.length}</p>
            <p className="text-xs text-gray-400 mt-1">na fila</p>
          </div>
        </div>
      </div>

      {/* ============ DADOS DA OBRA ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <User className="text-purple-600" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Autor</p>
            <p className="text-base font-bold text-gray-800 truncate">{obra.Autor || 'Sem autor'}</p>
            {obra.Nacionalidade && (
              <p className="text-xs text-gray-500 mt-0.5">🌍 {obra.Nacionalidade}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="text-blue-600" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Editora</p>
            <p className="text-base font-bold text-gray-800 truncate">{obra.Editora || 'Sem editora'}</p>
            {obra.EditoraContacto && (
              <p className="text-xs text-gray-500 mt-0.5">📞 {obra.EditoraContacto}</p>
            )}
          </div>
        </div>
      </div>

      {/* ============ FORMULÁRIO DE RESERVA ============ */}
      {mostrarFormReserva && !isDisponivel && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-2xl p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <Plus size={18} /> Adicionar Cliente à Fila de Reserva
          </h3>
          <form onSubmit={handleCriarReserva} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
              <select value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)} required
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white">
                {clientes.map((c) => <option key={c.Id} value={c.Id}>{c.Nome}</option>)}
              </select>
            </div>
            <button type="submit"
              className="bg-yellow-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-yellow-600 transition-colors text-sm">
              Confirmar Reserva
            </button>
          </form>
        </div>
      )}

      {/* ============ FILA DE RESERVAS ============ */}
      {!isDisponivel && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Bookmark className="text-yellow-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-at-blue">Fila de Reservas</h3>
              <p className="text-xs text-gray-400">
                {reservas.length === 0 ? 'Ninguém à espera' : `${reservas.length} pessoa(s) à espera`}
              </p>
            </div>
          </div>

          {reservas.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Bookmark size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Esta obra ainda não tem reservas</p>
              <p className="text-xs mt-1">Clica em "Reservar Obra" acima para adicionar alguém à fila</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reservas.map((reserva, index) => (
                <div key={reserva.Id} className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                  index === 0 ? 'bg-yellow-50/50' : 'hover:bg-yellow-50/30'
                }`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      index === 0 
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg ring-2 ring-yellow-300' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}º
                    </div>
                    <div>
                      <p className={`font-semibold ${index === 0 ? 'text-yellow-900' : 'text-gray-800'}`}>
                        {reserva.Cliente}
                        {index === 0 && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">PRÓXIMO</span>}
                      </p>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3">
                        {reserva.ClienteEmail && <span>✉️ {reserva.ClienteEmail}</span>}
                        {reserva.ClienteTelefone && <span>📞 {reserva.ClienteTelefone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Clock size={12} /> {reserva.DataReserva}
                    </span>
                    <button onClick={() => handleCancelarReserva(reserva.Id, reserva.Cliente)}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline">
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ HISTÓRICO DE EMPRÉSTIMOS ============ */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <History className="text-at-blue" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-at-blue">Histórico de Empréstimos</h3>
            <p className="text-xs text-gray-400">Todos os empréstimos desta obra</p>
          </div>
          {totalEmprestimos > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
              {totalEmprestimos} registo(s)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {historico.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <History size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Esta obra nunca foi requisitada</p>
              <p className="text-xs mt-1">Será o primeiro a requisitá-la?</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Contacto</th>
                  <th className="px-6 py-4 font-bold">Empréstimo</th>
                  <th className="px-6 py-4 font-bold">Devolução Prevista</th>
                  <th className="px-6 py-4 font-bold">Devolvido em</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {historico.map((emp) => (
                  <tr key={emp.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{emp.Cliente}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {emp.ClienteEmail && (
                          <p className="flex items-center gap-1 text-gray-500">
                            <Mail size={12} /> {emp.ClienteEmail}
                          </p>
                        )}
                        {emp.ClienteTelefone && (
                          <p className="flex items-center gap-1 text-gray-500">
                            <Phone size={12} /> {emp.ClienteTelefone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{emp.DataEmprestimo}</td>
                    <td className="px-6 py-4 text-red-600 font-semibold">{emp.DataPrevistaDevolucao}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {emp.DataDevolucao || <span className="text-gray-300 italic">Pendente</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        emp.Status === 'ATIVO' 
                          ? 'bg-red-50 text-red-700 ring-1 ring-red-200' 
                          : 'bg-green-50 text-green-700 ring-1 ring-green-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          emp.Status === 'ATIVO' ? 'bg-red-500' : 'bg-green-500'
                        }`}></span>
                        {emp.Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}