import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Users, Search, Plus, Edit3, Trash2, Save, X, 
  Calendar, Globe, BookOpen, Award, FileText, UserPlus
} from 'lucide-react';

interface Autor {
  Id: number;
  Nome: string;
  Sobrenome: string | null;
  Nacionalidade: string | null;
  DataNascimento: string | null;
  Biografia: string | null;
  TotalObras: number;
}

export function CadastrarAutor() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user } = useAuth();

  // Formulário
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [nacionalidade, setNacionalidade] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [biografia, setBiografia] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Lista
  const [autores, setAutores] = useState<Autor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  const carregarAutores = async () => {
    try {
      const res = await apiFetch('/api/autores');
      const data = await res.json();
      setAutores(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  useEffect(() => { carregarAutores(); }, []);

  const autoresFiltrados = useMemo(() => {
    if (!pesquisa.trim()) return autores;
    const p = pesquisa.toLowerCase();
    return autores.filter((a) =>
      a.Nome.toLowerCase().includes(p) ||
      (a.Sobrenome && a.Sobrenome.toLowerCase().includes(p)) ||
      (a.Nacionalidade && a.Nacionalidade.toLowerCase().includes(p))
    );
  }, [autores, pesquisa]);

  const limparFormulario = () => {
    setNome('');
    setSobrenome('');
    setNacionalidade('');
    setDataNascimento('');
    setBiografia('');
    setEditandoId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      showToast('Preenche o nome do autor.', 'error');
      return;
    }

    setSalvando(true);

    // Converte data "DD/MM/AAAA" (se vier do backend) para "AAAA-MM-DD"
    let dataParaEnviar = dataNascimento || null;
    if (dataParaEnviar && dataParaEnviar.includes('/')) {
      const [dia, mes, ano] = dataParaEnviar.split('/');
      dataParaEnviar = `${ano}-${mes}-${dia}`;
    }

    const payload = {
      Nome: nome.trim(),
      Sobrenome: sobrenome.trim() || null,
      Nacionalidade: nacionalidade.trim() || null,
      DataNascimento: dataParaEnviar,
      Biografia: biografia.trim() || null,
    };

    try {
      const url = editandoId ? `/api/autores/${editandoId}` : '/api/autores';
      const method = editandoId ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast(
          editandoId ? 'Autor atualizado com sucesso!' : 'Autor cadastrado com sucesso!',
          'success'
        );
        limparFormulario();
        carregarAutores();
      } else {
        const data = await response.json();
        showToast(data.error || 'Erro ao guardar autor.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (autor: Autor) => {
    setNome(autor.Nome);
    setSobrenome(autor.Sobrenome || '');
    setNacionalidade(autor.Nacionalidade || '');
    // Converte "DD/MM/AAAA" para "AAAA-MM-DD" para o input date
    if (autor.DataNascimento) {
      const [dia, mes, ano] = autor.DataNascimento.split('/');
      setDataNascimento(`${ano}-${mes}-${dia}`);
    } else {
      setDataNascimento('');
    }
    setBiografia(autor.Biografia || '');
    setEditandoId(autor.Id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (autor: Autor) => {
    const nomeCompleto = `${autor.Nome} ${autor.Sobrenome || ''}`.trim();

    const ok = await confirm({
      title: 'Eliminar Autor',
      message: `Tens a certeza que queres eliminar "${nomeCompleto}"? Esta ação não pode ser revertida.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/autores/${autor.Id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        showToast('Autor removido com sucesso.', 'success');
        carregarAutores();
      } else {
        showToast(data.error || 'Erro ao eliminar autor.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 mt-6">
      {/* ============ FORMULÁRIO ============ */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue mb-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg">
            {editandoId ? <Edit3 size={24} /> : <UserPlus size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-at-blue">
              {editandoId ? 'Editar Autor' : 'Cadastrar Novo Autor'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {editandoId
                ? 'Altera os dados e guarda as mudanças'
                : 'Preenche os dados do autor abaixo'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: Yuran Maurício"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sobrenome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={sobrenome}
                  onChange={(e) => setSobrenome(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: Guambe"
                />
              </div>
            </div>
          </div>

          {/* Nacionalidade e Data de Nascimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nacionalidade
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={nacionalidade}
                  onChange={(e) => setNacionalidade(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: Moçambicana"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data de Nascimento
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                />
              </div>
            </div>
          </div>

          {/* Biografia */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Biografia <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-4 text-gray-400" size={18} />
              <textarea
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
                rows={4}
                className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue resize-none"
                placeholder="Breve descrição da vida e obra do autor..."
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={salvando}
              className="bg-at-blue text-white px-8 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              {salvando ? 'A guardar...' : editandoId ? 'Guardar Alterações' : 'Guardar Autor'}
            </button>

            {editandoId ? (
              <button
                type="button"
                onClick={limparFormulario}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <X size={18} />
                Cancelar Edição
              </button>
            ) : (
              <button
                type="button"
                onClick={limparFormulario}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ============ LISTA DE AUTORES ============ */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Cabeçalho com pesquisa */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                <Users className="text-purple-600" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-at-blue">Lista de Autores</h3>
                <p className="text-xs text-gray-400">
                  {autores.length} autor{autores.length !== 1 ? 'es' : ''} cadastrado{autores.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Pesquisa */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por nome, sobrenome ou nacionalidade..."
              className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
            />
          </div>

          {pesquisa && (
            <p className="text-xs text-gray-500 mt-2">
              {autoresFiltrados.length} resultado{autoresFiltrados.length !== 1 ? 's' : ''} encontrado{autoresFiltrados.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">A carregar autores...</div>
          ) : autoresFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {pesquisa ? 'Nenhum autor corresponde à pesquisa.' : 'Ainda não há autores cadastrados.'}
              </p>
              {pesquisa && (
                <button
                  onClick={() => setPesquisa('')}
                  className="mt-4 text-at-blue font-semibold hover:underline text-sm"
                >
                  Limpar pesquisa
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Autor</th>
                  <th className="px-6 py-4 font-bold">Nacionalidade</th>
                  <th className="px-6 py-4 font-bold">Data Nasc.</th>
                  <th className="px-6 py-4 font-bold text-center">Obras</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {autoresFiltrados.map((autor) => {
                  const nomeCompleto = `${autor.Nome} ${autor.Sobrenome || ''}`.trim();
                  const iniciais = nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <tr key={autor.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {iniciais}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{nomeCompleto}</p>
                            {autor.Biografia && (
                              <p className="text-xs text-gray-400 truncate max-w-xs">
                                {autor.Biografia.substring(0, 50)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {autor.Nacionalidade || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {autor.DataNascimento || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {autor.TotalObras > 0 ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">
                            <BookOpen size={12} />
                            {autor.TotalObras}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditar(autor)}
                            className="bg-at-blue text-white p-2 rounded-md hover:bg-at-blue-light transition-colors"
                            title="Editar autor"
                          >
                            <Edit3 size={14} />
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => handleEliminar(autor)}
                              className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors"
                              title="Eliminar autor"
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
    </main>
  );
}