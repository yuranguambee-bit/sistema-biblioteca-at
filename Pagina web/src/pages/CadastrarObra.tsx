import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Autocomplete } from '../components/Autocomplete';
import { BookOpen, User, Building2, Calendar, Layers, Lock, RefreshCw, Hash, Globe } from 'lucide-react';

interface Autor { Id: number; Nome: string; Nacionalidade?: string; }
interface Editora { Id: number; Nome: string; Contacto?: string; }

export function CadastrarObra() {
  const { showToast } = useToast();
  const { temPermissao } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [ano, setAno] = useState('');
  const [numeroEdicao, setNumeroEdicao] = useState('');
  const [nacionalidadeLivro, setNacionalidadeLivro] = useState('');
  const [autorId, setAutorId] = useState('');
  const [editoraId, setEditoraId] = useState('');
  const [autores, setAutores] = useState<Autor[]>([]);
  const [editoras, setEditoras] = useState<Editora[]>([]);
  const [exemplares, setExemplares] = useState(1);
  const [loading, setLoading] = useState(false);

  const podeCriar = temPermissao('obras_criar');

  const campoBloqueado = (chaveCampo: string) => {
    return !temPermissao(chaveCampo) || !podeCriar;
  };

  useEffect(() => {
    apiFetch('/api/autores')
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setAutores(lista);
        if (lista.length > 0) setAutorId(lista[0].Id.toString());
      })
      .catch((e) => console.error(e));

    apiFetch('/api/editoras')
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setEditoras(lista);
        if (lista.length > 0) setEditoraId(lista[0].Id.toString());
      })
      .catch((e) => console.error(e));
  }, []);

  const opcoesAutores = autores.map((a) => ({ id: a.Id, label: a.Nome, sublabel: a.Nacionalidade || undefined }));
  const opcoesEditoras = editoras.map((e) => ({ id: e.Id, label: e.Nome, sublabel: e.Contacto || undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!podeCriar) return showToast('Não tens permissão para cadastrar obras.', 'error');
    if (!autorId) return showToast('Seleciona um autor para a obra.', 'error');

    setLoading(true);
    try {
      const promessas = [];
      for (let i = 0; i < exemplares; i++) {
        promessas.push(
          apiFetch('/api/obras', {
            method: 'POST',
            body: JSON.stringify({
              Titulo: titulo,
              Ano: Number(ano),
              NumeroEdicao: numeroEdicao.trim() || null,
              NacionalidadeLivro: nacionalidadeLivro.trim() || null,
              AutorId: Number(autorId),
              EditoraId: editoraId ? Number(editoraId) : null,
            }),
          })
        );
      }

      const respostas = await Promise.all(promessas);
      const todasOk = respostas.every((r) => r.ok);

      if (todasOk) {
        showToast(exemplares > 1 ? `${exemplares} exemplares cadastrados com sucesso!` : 'Obra cadastrada com sucesso!', 'success');
        setTimeout(() => navigate('/acervo'), 1500);
      } else {
        showToast('Erro ao cadastrar. Verifica os dados.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disabledClass = "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200";
  const enabledClass = "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-at-blue";

  return (
    <main className="max-w-3xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-at-blue">Cadastrar Nova Obra</h2>
              <p className="text-xs text-gray-500 mt-0.5">Preenche os dados da obra abaixo</p>
            </div>
          </div>
          {!podeCriar && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Lock size={16} /> Modo de Leitura
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Título da Obra</span>
              {!temPermissao('obras_campo_titulo') && <Lock size={12} className="text-red-400" />}
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
                disabled={campoBloqueado('obras_campo_titulo')}
                className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_titulo') ? disabledClass : enabledClass}`}
                placeholder="Ex: Manual de Direito Tributário Moçambicano"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Ano de Publicação</span>
                {!temPermissao('obras_campo_ano') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number" required min={1000} max={2100} value={ano} onChange={(e) => setAno(e.target.value)}
                  disabled={campoBloqueado('obras_campo_ano')}
                  className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_ano') ? disabledClass : enabledClass}`}
                  placeholder="Ex: 2024"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Número de Edição</span>
                {!temPermissao('obras_campo_numeroedicao') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text" value={numeroEdicao} onChange={(e) => setNumeroEdicao(e.target.value)}
                  disabled={campoBloqueado('obras_campo_numeroedicao')}
                  className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_numeroedicao') ? disabledClass : enabledClass}`}
                  placeholder="Ex: 1ª Edição"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Nacionalidade do Livro</span>
                {!temPermissao('obras_campo_nacionalidadelivro') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text" value={nacionalidadeLivro} onChange={(e) => setNacionalidadeLivro(e.target.value)}
                  disabled={campoBloqueado('obras_campo_nacionalidadelivro')}
                  className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_nacionalidadelivro') ? disabledClass : enabledClass}`}
                  placeholder="Ex: Moçambicana"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Nº de Exemplares</span>
                {!temPermissao('obras_campo_exemplares') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setExemplares(Math.max(1, exemplares - 1))} disabled={campoBloqueado('obras_campo_exemplares')} className="w-11 h-11 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                <div className="relative flex-1">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="number" min={1} max={50} value={exemplares} onChange={(e) => setExemplares(Math.max(1, Number(e.target.value) || 1))} disabled={campoBloqueado('obras_campo_exemplares')} className={`w-full pl-10 p-3 border rounded-md transition-colors text-center font-semibold ${campoBloqueado('obras_campo_exemplares') ? disabledClass : enabledClass}`} />
                </div>
                <button type="button" onClick={() => setExemplares(Math.min(50, exemplares + 1))} disabled={campoBloqueado('obras_campo_exemplares')} className="w-11 h-11 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">+</button>
              </div>
            </div>
          </div>

          <Autocomplete label="Autor" options={opcoesAutores} value={autorId} onChange={setAutorId} placeholder="Escreve para pesquisar..." icon={<User size={18} />} disabled={campoBloqueado('obras_campo_autor')} />
          <Autocomplete label="Editora" options={opcoesEditoras} value={editoraId} onChange={setEditoraId} placeholder="Escreve para pesquisar..." icon={<Building2 size={18} />} disabled={campoBloqueado('obras_campo_editora')} />

          {autores.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md text-sm text-yellow-800">⚠️ <strong>Não existem autores registados.</strong> Vai a "Cadastrar Autor" primeiro.</div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading || autores.length === 0 || !podeCriar} className="bg-at-blue text-white px-8 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <BookOpen size={18} />}
              {loading ? 'A guardar...' : exemplares > 1 ? `Guardar ${exemplares} Exemplares` : 'Guardar Obra'}
            </button>
            <button type="button" onClick={() => navigate('/')} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors">Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}