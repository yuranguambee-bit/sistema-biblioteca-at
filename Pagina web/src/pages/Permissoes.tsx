import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, ShieldCheck, ShieldOff, Mail, Save, 
  BookOpen, UserPlus, Users, Building2, BookMarked, 
  Bookmark, History, Library, BarChart3, FileText,
  Crown, RefreshCw
} from 'lucide-react';

interface Permissoes {
  obras?: boolean;
  autores?: boolean;
  clientes?: boolean;
  editoras?: boolean;
  emprestimos?: boolean;
  reservas?: boolean;
  historico?: boolean;
  acervo?: boolean;
  relatorios?: boolean;
  manual?: boolean;
}

interface Utilizador {
  Id: number;
  Nome: string;
  Email: string;
  Role: string;
  permissoes: Permissoes;
}

interface Funcionalidade {
  chave: keyof Permissoes;
  nome: string;
  descricao: string;
  icone: React.ReactNode;
  cor: string;
}

const FUNCIONALIDADES: Funcionalidade[] = [
  { chave: 'obras', nome: 'Obras', descricao: 'Cadastrar, editar e eliminar obras', icone: <BookOpen size={18} />, cor: 'blue' },
  { chave: 'autores', nome: 'Autores', descricao: 'Gerir autores do acervo', icone: <UserPlus size={18} />, cor: 'purple' },
  { chave: 'clientes', nome: 'Clientes', descricao: 'Gerir leitores da biblioteca', icone: <Users size={18} />, cor: 'pink' },
  { chave: 'editoras', nome: 'Editoras', descricao: 'Gerir editoras e contactos', icone: <Building2 size={18} />, cor: 'orange' },
  { chave: 'emprestimos', nome: 'Empréstimos', descricao: 'Registar empréstimos e devoluções', icone: <BookMarked size={18} />, cor: 'red' },
  { chave: 'reservas', nome: 'Reservas', descricao: 'Gerir fila de reservas', icone: <Bookmark size={18} />, cor: 'yellow' },
  { chave: 'historico', nome: 'Histórico', descricao: 'Consultar histórico completo', icone: <History size={18} />, cor: 'cyan' },
  { chave: 'acervo', nome: 'Acervo', descricao: 'Consultar inventário completo', icone: <Library size={18} />, cor: 'indigo' },
  { chave: 'relatorios', nome: 'Relatórios', descricao: 'Gerar e imprimir relatórios', icone: <BarChart3 size={18} />, cor: 'teal' },
  { chave: 'manual', nome: 'Manual', descricao: 'Aceder ao manual do utilizador', icone: <FileText size={18} />, cor: 'gray' },
];

export function Permissoes() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);

  const carregarUtilizadores = async () => {
    try {
      const res = await apiFetch('/api/usuarios');
      const data = await res.json();
      setUtilizadores(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  useEffect(() => { carregarUtilizadores(); }, []);

  const togglePermissao = (userId: number, chave: keyof Permissoes) => {
    setUtilizadores((prev) =>
      prev.map((u) => {
        if (u.Id !== userId) return u;
        return {
          ...u,
          permissoes: {
            ...u.permissoes,
            [chave]: !u.permissoes[chave],
          },
        };
      })
    );
  };

  const ativarTodas = (userId: number) => {
    const todas: Permissoes = {};
    FUNCIONALIDADES.forEach((f) => { todas[f.chave] = true; });
    setUtilizadores((prev) =>
      prev.map((u) => (u.Id === userId ? { ...u, permissoes: todas } : u))
    );
  };

  const desativarTodas = (userId: number) => {
    setUtilizadores((prev) =>
      prev.map((u) => (u.Id === userId ? { ...u, permissoes: {} } : u))
    );
  };

  const guardarPermissoes = async (utilizador: Utilizador) => {
    setSalvando(utilizador.Id);
    try {
      const response = await apiFetch(`/api/usuarios/${utilizador.Id}/permissoes`, {
        method: 'PUT',
        body: JSON.stringify({ permissoes: utilizador.permissoes }),
      });

      if (response.ok) {
        showToast(`Permissões de ${utilizador.Nome} atualizadas!`, 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Erro ao guardar permissões.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvando(null);
    }
  };

  const contPermissoesAtivas = (permissoes: Permissoes) => {
    return FUNCIONALIDADES.filter((f) => permissoes[f.chave] === true).length;
  };

  const admins = utilizadores.filter((u) => u.Role === 'Admin');
  const bibliotecarios = utilizadores.filter((u) => u.Role !== 'Admin');

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar utilizadores...
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6 animate-fade-up">
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Gestão de Permissões</h2>
                <p className="text-purple-100 text-sm">Controla o que cada utilizador pode acessar</p>
              </div>
            </div>
            <p className="text-purple-100 text-sm max-w-2xl mt-3">
              Ativa ou desativa funcionalidades para cada utilizador. 
              Os administradores têm sempre acesso total e não podem ser restringidos.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6 flex items-start gap-3">
        <ShieldCheck className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-900">
          <strong>Como funciona:</strong> Os links do menu e as ações rápidas só aparecem para 
          utilizadores com permissão. Se tentarem aceder pelo URL direto, são redirecionados.
        </div>
      </div>

      {admins.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-at-blue mb-3 flex items-center gap-2">
            <Crown className="text-yellow-500" size={20} /> Administradores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {admins.map((admin) => (
              <div key={admin.Id} className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold">
                    {admin.Nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">
                      {admin.Nome} {admin.Id === currentUser?.id && <span className="text-xs text-yellow-700">(tu)</span>}
                    </p>
                    <p className="text-xs text-gray-600 truncate flex items-center gap-1">
                      <Mail size={11} /> {admin.Email}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold flex items-center gap-1">
                    <Crown size={11} /> Acesso Total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-at-blue mb-3 flex items-center gap-2">
          <Users size={20} /> Bibliotecários ({bibliotecarios.length})
        </h3>

        {bibliotecarios.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <ShieldOff size={56} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-semibold">Sem bibliotecários registados</p>
            <p className="text-xs text-gray-400 mt-1">
              Cria um utilizador em "Utilizadores" primeiro
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bibliotecarios.map((utilizador) => {
              const ativas = contPermissoesAtivas(utilizador.permissoes);
              const total = FUNCIONALIDADES.length;

              return (
                <div key={utilizador.Id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
                    <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white font-bold">
                        {utilizador.Nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{utilizador.Nome}</p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <Mail size={11} /> {utilizador.Email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ativas === total 
                          ? 'bg-green-100 text-green-700' 
                          : ativas === 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ativas} / {total} acessos
                      </span>

                      <button
                        onClick={() => ativarTodas(utilizador.Id)}
                        className="text-xs font-semibold text-green-600 hover:text-green-700 px-2 py-1 hover:bg-green-50 rounded transition-colors"
                      >
                        Tudo ON
                      </button>
                      <button
                        onClick={() => desativarTodas(utilizador.Id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                      >
                        Tudo OFF
                      </button>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FUNCIONALIDADES.map((func) => {
                      const ativo = utilizador.permissoes[func.chave] === true;

                      return (
                        <button
                          key={func.chave}
                          onClick={() => togglePermissao(utilizador.Id, func.chave)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            ativo
                              ? 'border-green-300 bg-green-50 hover:bg-green-100'
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-70'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            ativo ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            {func.icone}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${ativo ? 'text-gray-800' : 'text-gray-500'}`}>
                              {func.nome}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {func.descricao}
                            </p>
                          </div>
                          <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                            ativo ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${
                              ativo ? 'left-4.5 translate-x-[18px]' : 'left-0.5'
                            }`}></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => guardarPermissoes(utilizador)}
                      disabled={salvando === utilizador.Id}
                      className="bg-at-blue text-white px-5 py-2.5 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm flex items-center gap-2 disabled:bg-gray-400"
                    >
                      {salvando === utilizador.Id ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> A guardar...
                        </>
                      ) : (
                        <>
                          <Save size={14} /> Guardar Permissões
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}