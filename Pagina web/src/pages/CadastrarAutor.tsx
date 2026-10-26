import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Users, Search, Edit3, Trash2, Save, X, 
  Calendar, Globe, BookOpen, FileText, UserPlus, Lock, RefreshCw, Layers
} from 'lucide-react';

interface Autor {
  Id: number;
  Nome: string;
  Sobrenome: string | null;
  Nacionalidade: string | null;
  DataNascimento: string | null;
  Biografia: string | null;
  Sexo: string | null;
  TiposLivros: string | null;
  TotalObras: number;
}

export function CadastrarAutor() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user, temPermissao } = useAuth();

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [nacionalidade, setNacionalidade] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [biografia, setBiografia] = useState('');
  const [sexo, setSexo] = useState('');
  const [tiposLivros, setTiposLivros] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [autores, setAutores] = useState<Autor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  const podeCriar = temPermissao('autores_criar');
  const podeEditar = temPermissao('autores_editar');
  const podeApagar = temPermissao('autores_apagar');

  const isEditing = !!editandoId;
  const podeSubmeter = isEditing ? podeEditar : podeCriar;

  const campoBloqueado = (chaveCampo: string) => {
    return !temPermissao(chaveCampo) || !podeSubmeter;
  };

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
    setSexo('');
    setTiposLivros('');
    setEditandoId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!podeSubmeter) {
      showToast('Não tens permissão para guardar este autor.', 'error');
      return;
    }

    if (!nome.trim()) {
      showToast('Preenche o nome do autor.', 'error');
      return;
    }

    setSalvando(true);

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
      Sexo: sexo.trim() || null,
      TiposLivros: tiposLivros.trim() || null,
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
    if (!podeEditar) return showToast('Não tens permissão para editar autores.', 'error');
    
    setNome(autor.Nome);
    setSobrenome(autor.Sobrenome || '');
    setNacionalidade(autor.Nacionalidade || '');
    if (autor.DataNascimento) {
      const [dia, mes, ano] = autor.DataNascimento.split('/');
      setDataNascimento(`${ano}-${mes}-${dia}`);
    } else {
      setDataNascimento('');
    }
    setBiografia(autor.Biografia || '');
    setSexo(autor.Sexo || '');
    setTiposLivros(autor.TiposLivros || '');
    setEditandoId(autor.Id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (autor: Autor) => {
    if (!podeApagar) return showToast('Não tens permissão para apagar autores.', 'error');

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

  const disabledClass = "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200";
  const enabledClass = "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-at-blue";

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue mb-6">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg">
              {editandoId ? <Edit3 size={24} /> : <UserPlus size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-at-blue">
                {editandoId ? 'Editar Autor' : 'Cadastrar Novo Autor'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {editandoId ? 'Altera os dados e guarda as mudanças' : 'Preenche os dados do autor abaixo'}
              </p>
            </div>
          </div>
          {!podeSubmeter && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Lock size={16} /> Modo de Leitura
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Nome</span>
                {!temPermissao('autores_campo_nome') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} disabled={campoBloqueado('autores_campo_nome')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('autores_campo_nome') ? disabledClass : enabledClass}`} placeholder="Ex: Yuran Maurício" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Sobrenome</span>
                {!temPermissao('autores_campo_sobrenome') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} disabled={campoBloqueado('autores_campo_sobrenome')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('autores_campo_sobrenome') ? disabledClass : enabledClass}`} placeholder="Ex: Guambe" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Nacionalidade</span>
                {!temPermissao('autores_campo_nacionalidade') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} disabled={campoBloqueado('autores_campo_nacionalidade')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('autores_campo_nacionalidade') ? disabledClass : enabledClass}`} placeholder="Ex: Moçambicana" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Data de Nascimento</span>
                {!temPermissao('autores_campo_datanascimento') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} disabled={campoBloqueado('autores_campo_datanascimento')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('autores_campo_datanascimento') ? disabledClass : enabledClass}`} />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Sexo</span>
                {!temPermissao('autores_campo_sexo') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select value={sexo} onChange={(e) => setSexo(e.target.value)} disabled={campoBloqueado('autores_campo_sexo')} className={`w-full pl-10 p-3 border rounded-md transition-colors appearance-none ${campoBloqueado('autores_campo_sexo') ? disabledClass : enabledClass}`}>
                  <option value="">Selecionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Tipos de Livros</span>
              {!temPermissao('autores_campo_tiposlivros') && <Lock size={12} className="text-red-400" />}
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" value={tiposLivros} onChange={(e) => setTiposLivros(e.target.value)} disabled={campoBloqueado('autores_campo_tiposlivros')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('autores_campo_tiposlivros') ? disabledClass : enabledClass}`} placeholder="Ex: Ficção, Romance, Direito..." />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Biografia <span className="text-gray-400 font-normal">(opcional)</span></span>
              {!temPermissao('autores_campo_biografia') && <Lock size={12} className="text-red-400" />}
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-4 text-gray-400" size={18} />
              <textarea value={biografia} onChange={(e) => setBiografia(e.target.value)} disabled={campoBloqueado('autores_campo_biografia')} rows={4} className={`w-full pl-10 p-3 border rounded-md transition-colors resize-none ${campoBloqueado('autores_campo_biografia') ? disabledClass : enabledClass}`} placeholder="Breve descrição da vida e obra do autor..." />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={salvando || !podeSubmeter} className="bg-at-blue text-white px-8 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
              {salvando ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {salvando ? 'A guardar...' : editandoId ? 'Guardar Alterações' : 'Guardar Autor'}
            </button>

            {editandoId ? (
              <button type="button" onClick={limparFormulario} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"><X size={18} /> Cancelar Edição</button>
            ) : (
              <button type="button" onClick={limparFormulario} disabled={!podeCriar} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Limpar</button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center"><Users className="text-purple-600" size={22} /></div>
              <div>
                <h3 className="text-lg font-bold text-at-blue">Lista de Autores</h3>
                <p className="text-xs text-gray-400">{autores.length} autor{autores.length !== 1 ? 'es' : ''} cadastrado{autores.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar por nome, sobrenome ou nacionalidade..." className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">A carregar autores...</div>
          ) : autoresFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">{pesquisa ? 'Nenhum autor corresponde à pesquisa.' : 'Ainda não há autores cadastrados.'}</p>
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
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{iniciais}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{nomeCompleto}</p>
                            {autor.Biografia && <p className="text-xs text-gray-400 truncate max-w-xs">{autor.Biografia.substring(0, 50)}...</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{autor.Nacionalidade || <span className="text-gray-300 italic">—</span>}</td>
                      <td className="px-6 py-4 text-gray-600">{autor.DataNascimento || <span className="text-gray-300 italic">—</span>}</td>
                      <td className="px-6 py-4 text-center">
                        {autor.TotalObras > 0 ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200"><BookOpen size={12} />{autor.TotalObras}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditar(autor)} disabled={!podeEditar} className="bg-at-blue text-white p-2 rounded-md hover:bg-at-blue-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Editar"><Edit3 size={14} /></button>
                          {(user?.role === 'Admin' || podeApagar) && (
                            <button onClick={() => handleEliminar(autor)} disabled={!podeApagar} className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Eliminar"><Trash2 size={14} /></button>
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