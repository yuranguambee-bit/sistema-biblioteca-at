import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, ShieldCheck, ShieldOff, Mail, Save, 
  BookOpen, UserPlus, Users, Building2, BookMarked, 
  Bookmark, History, Library, BarChart3, FileText,
  Crown, RefreshCw, CheckSquare, Edit3
} from 'lucide-react';

interface Permissoes {
  [key: string]: boolean | undefined;
}

interface Utilizador {
  Id: number;
  Nome: string;
  Email: string;
  Role: string;
  permissoes: Permissoes;
}

// Módulos Principais (Acesso à página)
const MODULOS = [
  { chave: 'obras', nome: 'Obras', descricao: 'Acesso ao módulo de obras', icone: <BookOpen size={18} /> },
  { chave: 'autores', nome: 'Autores', descricao: 'Acesso ao módulo de autores', icone: <UserPlus size={18} /> },
  { chave: 'clientes', nome: 'Clientes', descricao: 'Acesso ao módulo de clientes', icone: <Users size={18} /> },
  { chave: 'editoras', nome: 'Editoras', descricao: 'Acesso ao módulo de editoras', icone: <Building2 size={18} /> },
  { chave: 'emprestimos', nome: 'Empréstimos', descricao: 'Acesso a empréstimos', icone: <BookMarked size={18} /> },
  { chave: 'reservas', nome: 'Reservas', descricao: 'Acesso a reservas', icone: <Bookmark size={18} /> },
  { chave: 'historico', nome: 'Histórico', descricao: 'Acesso ao histórico', icone: <History size={18} /> },
  { chave: 'acervo', nome: 'Acervo', descricao: 'Acesso ao acervo', icone: <Library size={18} /> },
  { chave: 'relatorios', nome: 'Relatórios', descricao: 'Acesso a relatórios', icone: <BarChart3 size={18} /> },
  { chave: 'manual', nome: 'Manual', descricao: 'Acesso ao manual', icone: <FileText size={18} /> },
];

// Ações Granulares para Autores
const ACOES_AUTOR = [
  { chave: 'autores_criar', nome: 'Criar' },
  { chave: 'autores_editar', nome: 'Editar' },
  { chave: 'autores_apagar', nome: 'Apagar' },
];

// Campos do Formulário de Autores
const CAMPOS_AUTOR = [
  { chave: 'autores_campo_nome', nome: 'Nome' },
  { chave: 'autores_campo_sobrenome', nome: 'Sobrenome' },
  { chave: 'autores_campo_nacionalidade', nome: 'Nacionalidade' },
  { chave: 'autores_campo_datanascimento', nome: 'Data de Nascimento' },
  { chave: 'autores_campo_biografia', nome: 'Biografia' },
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

  const togglePermissao = (userId: number, chave: string) => {
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
    MODULOS.forEach((f) => { todas[f.chave] = true; });
    ACOES_AUTOR.forEach((a) => { todas[a.chave] = true; });
    CAMPOS_AUTOR.forEach((c) => { todas[c.chave] = true; });
    
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
    const totalModulos = MODULOS.length;
    const totalAutor = ACOES_AUTOR.length + CAMPOS_AUTOR.length;
    const total = totalModulos + totalAutor;

    let ativas = 0;
    MODULOS.forEach(m => { if (permissoes[m.chave]) ativas++; });
    ACOES_AUTOR.forEach(a => { if (permissoes[a.chave]) ativas++; });
    CAMPOS_AUTOR.forEach(c => { if (permissoes[c.chave]) ativas++; });

    return { ativas, total };
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
                <p className="text-purple-100 text-sm">Controla acessos, ações e campos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6 flex items-start gap-3">
        <ShieldCheck className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-900">
          <strong>Como funciona:</strong> Os Administradores têm acesso total. Para os Bibliotecários, podes ativar/desativar o acesso ao módulo, as ações (Criar/Editar/Apagar) e até mesmo quais campos do formulário o utilizador pode ver e preencher.
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
          </div>
        ) : (
          <div className="space-y-6">
            {bibliotecarios.map((utilizador) => {
              const { ativas, total } = contPermissoesAtivas(utilizador.permissoes);

              return (
                <div key={utilizador.Id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  {/* Cabeçalho do Utilizador */}
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
                        {ativas} / {total} permissões
                      </span>
                      <button onClick={() => ativarTodas(utilizador.Id)} className="text-xs font-semibold text-green-600 hover:text-green-700 px-2 py-1 hover:bg-green-50 rounded transition-colors">Tudo ON</button>
                      <button onClick={() => desativarTodas(utilizador.Id)} className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors">Tudo OFF</button>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* SECÇÃO 1: MÓDULOS PRINCIPAIS */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ShieldCheck size={16} /> Acesso aos Módulos
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {MODULOS.map((mod) => {
                          const ativo = utilizador.permissoes[mod.chave] === true;
                          return (
                            <button
                              key={mod.chave}
                              onClick={() => togglePermissao(utilizador.Id, mod.chave)}
                              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                ativo ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-70'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ativo ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {mod.icone}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${ativo ? 'text-gray-800' : 'text-gray-500'}`}>{mod.nome}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECÇÃO 2: DETALHES DO MÓDULO DE AUTORES */}
                    <div className="border-t border-gray-100 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <UserPlus size={18} className="text-at-blue" />
                        <h4 className="text-sm font-bold text-at-blue uppercase tracking-wider">Detalhes do Módulo: Autores</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Ações */}
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 mb-3 flex items-center gap-2">
                            <Edit3 size={14} /> Ações Permitidas
                          </p>
                          <div className="flex flex-col gap-2">
                            {ACOES_AUTOR.map((acao) => {
                              const ativo = utilizador.permissoes[acao.chave] === true;
                              return (
                                <label key={acao.chave} className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${ativo ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                    {ativo && <CheckSquare size={14} />}
                                  </div>
                                  <span className={`text-sm ${ativo ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>{acao.nome} Autor</span>
                                  <input type="checkbox" className="hidden" checked={ativo} onChange={() => togglePermissao(utilizador.Id, acao.chave)} />
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Campos */}
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                          <p className="text-xs font-bold text-purple-800 mb-3 flex items-center gap-2">
                            <FileText size={14} /> Campos Editáveis no Formulário
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {CAMPOS_AUTOR.map((campo) => {
                              const ativo = utilizador.permissoes[campo.chave] === true;
                              return (
                                <label key={campo.chave} className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${ativo ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-300 group-hover:border-purple-400'}`}>
                                    {ativo && <CheckSquare size={14} />}
                                  </div>
                                  <span className={`text-sm ${ativo ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>{campo.nome}</span>
                                  <input type="checkbox" className="hidden" checked={ativo} onChange={() => togglePermissao(utilizador.Id, campo.chave)} />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => guardarPermissoes(utilizador)}
                      disabled={salvando === utilizador.Id}
                      className="bg-at-blue text-white px-6 py-2.5 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm flex items-center gap-2 disabled:bg-gray-400"
                    >
                      {salvando === utilizador.Id ? (
                        <><RefreshCw size={14} className="animate-spin" /> A guardar...</>
                      ) : (
                        <><Save size={14} /> Guardar Permissões</>
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