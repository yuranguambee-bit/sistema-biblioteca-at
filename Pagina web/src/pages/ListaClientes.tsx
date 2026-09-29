import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Eye, UserPlus, Search, Users, Edit3, Trash2, Save, X, 
  User, Mail, Phone, BookOpen, AlertCircle
} from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';

interface Cliente {
  Id: number;
  Nome: string;
  Email: string | null;
  Telefone: string | null;
  TotalEmprestimos: number;
  EmprestimosAtivos: number;
}

export function ListaClientes() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarClientes = async () => {
    try {
      const res = await apiFetch('/api/clientes');
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  useEffect(() => { carregarClientes(); }, []);

  const clientesFiltrados = useMemo(() => {
    if (!pesquisa.trim()) return clientes;
    const p = pesquisa.toLowerCase();
    return clientes.filter((c) =>
      c.Nome.toLowerCase().includes(p) ||
      (c.Email && c.Email.toLowerCase().includes(p)) ||
      (c.Telefone && c.Telefone.toLowerCase().includes(p))
    );
  }, [clientes, pesquisa]);

  const abrirEdicao = (cliente: Cliente) => {
    setEditando(cliente);
    setFormNome(cliente.Nome);
    setFormEmail(cliente.Email || '');
    setFormTelefone(cliente.Telefone || '');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setFormNome('');
    setFormEmail('');
    setFormTelefone('');
  };

  const handleGuardarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    if (!formNome.trim()) {
      showToast('O nome do cliente é obrigatório.', 'error');
      return;
    }

    setSalvando(true);
    try {
      const response = await apiFetch(`/api/clientes/${editando.Id}`, {
        method: 'PUT',
        body: JSON.stringify({
          Nome: formNome.trim(),
          Email: formEmail.trim() || null,
          Telefone: formTelefone.trim() || null,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Cliente atualizado com sucesso!', 'success');
        fecharModal();
        carregarClientes();
      } else {
        showToast(data.error || 'Erro ao atualizar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleEliminar = async (cliente: Cliente) => {
    const ok = await confirm({
      title: 'Eliminar Cliente',
      message: `Tens a certeza que queres eliminar "${cliente.Nome}"? Esta ação não pode ser revertida.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/clientes/${cliente.Id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        showToast('Cliente removido com sucesso.', 'success');
        carregarClientes();
      } else {
        showToast(data.error || 'Erro ao eliminar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6 animate-fade-up">
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Users size={22} />
              </div>
              <h2 className="text-2xl font-bold">Clientes</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Gestão e consulta dos leitores da biblioteca.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
              <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total</p>
              <p className="text-3xl font-bold mt-1">{clientes.length}</p>
            </div>
            <button
              onClick={() => navigate('/cadastrar-cliente')}
              className="bg-white text-at-blue px-5 py-3 rounded-md font-bold hover:bg-blue-50 transition-colors text-sm flex items-center gap-2 shadow-lg"
            >
              <UserPlus size={16} /> Novo Cliente
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          🔍 Pesquisar Cliente
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Nome, email ou telefone..."
            className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
          />
        </div>
        {pesquisa && (
          <p className="text-xs text-gray-500 mt-2">
            {clientesFiltrados.length} resultado(s) encontrado(s)
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {pesquisa ? 'Nenhum cliente corresponde à pesquisa.' : 'Sem clientes registados.'}
              </p>
              {!pesquisa && (
                <button
                  onClick={() => navigate('/cadastrar-cliente')}
                  className="inline-flex items-center gap-2 mt-4 bg-at-blue text-white px-5 py-2.5 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
                >
                  <UserPlus size={16} /> Cadastrar Primeiro Cliente
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Nome</th>
                  <th className="px-6 py-4 font-bold">Email</th>
                  <th className="px-6 py-4 font-bold">Telefone</th>
                  <th className="px-6 py-4 font-bold text-center">Empréstimos</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {clientesFiltrados.map((cliente) => {
                  const iniciais = cliente.Nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <tr key={cliente.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {iniciais}
                          </div>
                          <p className="font-semibold text-gray-800">{cliente.Nome}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {cliente.Email || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {cliente.Telefone || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {cliente.TotalEmprestimos > 0 ? (
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">
                              <BookOpen size={12} />
                              {cliente.TotalEmprestimos}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                          {cliente.EmprestimosAtivos > 0 && (
                            <span className="text-[10px] text-orange-600 font-bold">
                              {cliente.EmprestimosAtivos} ativo(s)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/clientes/${cliente.Id}`)}
                            className="bg-at-blue text-white p-2 rounded-md hover:bg-at-blue-light transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => abrirEdicao(cliente)}
                            className="bg-yellow-500 text-white p-2 rounded-md hover:bg-yellow-600 transition-colors"
                            title="Editar cliente"
                          >
                            <Edit3 size={14} />
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => handleEliminar(cliente)}
                              className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors"
                              title="Eliminar cliente"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalAberto && editando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-at-blue">Editar Cliente</h3>
                  <p className="text-xs text-gray-500">Altera os dados do leitor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicao} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                    placeholder="Nome do cliente"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                    placeholder="+258 84 000 0000"
                  />
                </div>
              </div>

              {editando.EmprestimosAtivos > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-xs text-yellow-800 flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Este cliente tem <strong>{editando.EmprestimosAtivos} empréstimo(s) ativo(s)</strong>. 
                    Podes editar os dados, mas não eliminar até devolver as obras.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-5 py-2.5 rounded-md bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2.5 rounded-md bg-at-blue text-white font-semibold hover:bg-at-blue-light transition-colors text-sm flex items-center gap-2 disabled:bg-gray-400"
                >
                  <Save size={16} />
                  {salvando ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}