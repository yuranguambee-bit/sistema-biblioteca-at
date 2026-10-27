import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Autocomplete } from '../components/Autocomplete';
import { 
  BookOpen, User, Building2, Calendar, Layers, Lock, 
  RefreshCw, Hash, Globe, Search, Eye, Barcode
} from 'lucide-react';

interface Autor { Id: number; Nome: string; Nacionalidade?: string; }
interface Editora { Id: number; Nome: string; Contacto?: string; }
interface Obra { Id: number; Titulo: string; Autor: string; Editora: string; Ano: number; Status: string; }

export function CadastrarObra() {
  const { showToast } = useToast();
  const { temPermissao } = useAuth();
  const navigate = useNavigate();

  const [isbn, setIsbn] = useState('');
  const [loadingIsbn, setLoadingIsbn] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [ano, setAno] = useState('');
  const [numeroEdicao, setNumeroEdicao] = useState('');
  const [nacionalidadeLivro, setNacionalidadeLivro] = useState('');
  const [autorId, setAutorId] = useState('');
  const [editoraId, setEditoraId] = useState('');
  const [exemplares, setExemplares] = useState(1);
  const [loading, setLoading] = useState(false);

  const [obras, setObras] = useState<Obra[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  const [autores, setAutores] = useState<Autor[]>([]);
  const [editoras, setEditoras] = useState<Editora[]>([]);

  const podeCriar = temPermissao('obras_criar');

  const campoBloqueado = (chaveCampo: string) => {
    return !temPermissao(chaveCampo) || !podeCriar;
  };

  const carregarObras = async () => {
    try {
      const res = await apiFetch('/api/obras');
      const data = await res.json();
      setObras(Array.isArray(data) ? data : []);
      setLoadingObras(false);
    } catch (error) { console.error(error); setLoadingObras(false); }
  };

  useEffect(() => {
    carregarObras();

    apiFetch('/api/autores').then((r) => r.json()).then((data) => {
      const lista = Array.isArray(data) ? data : [];
      setAutores(lista);
      if (lista.length > 0 && !autorId) setAutorId(lista[0].Id.toString());
    }).catch((e) => console.error(e));

    apiFetch('/api/editoras').then((r) => r.json()).then((data) => {
      const lista = Array.isArray(data) ? data : [];
      setEditoras(lista);
      if (lista.length > 0 && !editoraId) setEditoraId(lista[0].Id.toString());
    }).catch((e) => console.error(e));
  }, []);

  const obrasFiltradas = useMemo(() => {
    if (!pesquisa.trim()) return obras;
    const p = pesquisa.toLowerCase();
    return obras.filter((o) =>
      o.Titulo.toLowerCase().includes(p) ||
      (o.Autor && o.Autor.toLowerCase().includes(p)) ||
      (o.Editora && o.Editora.toLowerCase().includes(p))
    );
  }, [obras, pesquisa]);

  const opcoesAutores = autores.map((a) => ({ id: a.Id, label: a.Nome, sublabel: a.Nacionalidade || undefined }));
  const opcoesEditoras = editoras.map((e) => ({ id: e.Id, label: e.Nome, sublabel: e.Contacto || undefined }));

  // ============ INTEGRAÇÃO GOOGLE BOOKS (Via Backend) ============
  const handleBuscarISBN = async () => {
    if (!isbn.trim()) {
      showToast('Digita um ISBN para pesquisar.', 'error');
      return;
    }

    setLoadingIsbn(true);
    try {
      const response = await apiFetch(`/api/obras/buscar-isbn/${isbn}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao procurar o ISBN.');
      }

      const data = await response.json();
      
      // 1. Preencher Título
      if (data.titulo) setTitulo(data.titulo);
      
      // 2. Preencher Ano
      if (data.ano) setAno(data.ano);

      // 3. Tentar encontrar o Autor na lista
      if (data.autor) {
        const autorNome = data.autor;
        const autorEncontrado = autores.find(a => 
          a.Nome.toLowerCase().includes(autorNome.toLowerCase()) || 
          autorNome.toLowerCase().includes(a.Nome.toLowerCase())
        );
        
        if (autorEncontrado) {
          setAutorId(autorEncontrado.Id.toString());
        } else {
          showToast(`Autor "${autorNome}" não está registado. Cadastra-o primeiro.`, 'warning');
        }
      }

      // 4. Tentar encontrar a Editora na lista
      if (data.editora) {
        const editoraNome = data.editora;
        const editoraEncontrada = editoras.find(e => 
          e.Nome.toLowerCase().includes(editoraNome.toLowerCase()) ||
          editoraNome.toLowerCase().includes(e.Nome.toLowerCase())
        );

        if (editoraEncontrada) {
          setEditoraId(editoraEncontrada.Id.toString());
        } else {
          showToast(`Editora "${editoraNome}" não está registada. Cadastra-a primeiro.`, 'warning');
        }
      }

      showToast('Dados preenchidos automaticamente!', 'success');

    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao ligar ao Google Books. Tenta novamente.', 'error');
    } finally {
      setLoadingIsbn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!podeCriar) return showToast('Não tens permissão para cadastrar obras.', 'error');
    if (!autorId) return showToast('Seleciona um autor para a obra.', 'error');
    if (!editoraId) return showToast('Seleciona uma editora para a obra.', 'error');

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
              ISBN: isbn.trim() || null,
              NumeroEdicao: numeroEdicao.trim() || null,
              NacionalidadeLivro: nacionalidadeLivro.trim() || null,
              AutorId: Number(autorId),
              EditoraId: Number(editoraId),
            }),
          })
        );
      }

      const respostas = await Promise.all(promessas);
      const todasOk = respostas.every((r) => r.ok);

      if (todasOk) {
        showToast(exemplares > 1 ? `${exemplares} exemplares cadastrados!` : 'Obra cadastrada!', 'success');
        setTitulo('');
        setAno('');
        setIsbn('');
        setNumeroEdicao('');
        setNacionalidadeLivro('');
        setExemplares(1);
        carregarObras(); 
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
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue mb-6">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-at-blue">Cadastrar Nova Obra</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pesquisa pelo ISBN para preencher automaticamente</p>
            </div>
          </div>
          {!podeCriar && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Lock size={16} /> Modo de Leitura
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CAMPO ISBN */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <label className="text-sm font-bold text-blue-900 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Barcode size={16}/> Pesquisa Automática por ISBN</span>
              {!temPermissao('obras_campo_isbn') && <Lock size={12} className="text-red-400" />}
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={isbn} 
                  onChange={(e) => setIsbn(e.target.value)} 
                  disabled={campoBloqueado('obras_campo_isbn')} 
                  className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_isbn') ? disabledClass : enabledClass}`} 
                  placeholder="Ex: 978-989-20-1234-5" 
                />
              </div>
              <button 
                type="button" 
                onClick={handleBuscarISBN}
                disabled={loadingIsbn || !isbn.trim() || campoBloqueado('obras_campo_isbn')}
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loadingIsbn ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                {loadingIsbn ? 'A procurar...' : 'Procurar'}
              </button>
            </div>
            <p className="text-xs text-blue-700 mt-2">Dica: O sistema procura no Google Books e preenche o Título, Ano, Autor e Editora.</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Título da Obra</span>
              {!temPermissao('obras_campo_titulo') && <Lock size={12} className="text-red-400" />}
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={campoBloqueado('obras_campo_titulo')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_titulo') ? disabledClass : enabledClass}`} placeholder="Ex: Manual de Direito Tributário" />
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
                <input type="number" required min={1000} max={2100} value={ano} onChange={(e) => setAno(e.target.value)} disabled={campoBloqueado('obras_campo_ano')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_ano') ? disabledClass : enabledClass}`} placeholder="Ex: 2024" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Número de Edição</span>
                {!temPermissao('obras_campo_numeroedicao') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={numeroEdicao} onChange={(e) => setNumeroEdicao(e.target.value)} disabled={campoBloqueado('obras_campo_numeroedicao')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_numeroedicao') ? disabledClass : enabledClass}`} placeholder="Ex: 1ª Edição" />
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
                <input type="text" value={nacionalidadeLivro} onChange={(e) => setNacionalidadeLivro(e.target.value)} disabled={campoBloqueado('obras_campo_nacionalidadelivro')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('obras_campo_nacionalidadelivro') ? disabledClass : enabledClass}`} placeholder="Ex: Moçambicana" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Nº de Exemplares</span>
                {!temPermissao('obras_campo_exemplares') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setExemplares(Math.max(1, exemplares - 1))} disabled={campoBloqueado('obras_campo_exemplares')} className="w-11 h-11 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors disabled:opacity-50">−</button>
                <div className="relative flex-1">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="number" min={1} max={50} value={exemplares} onChange={(e) => setExemplares(Math.max(1, Number(e.target.value) || 1))} disabled={campoBloqueado('obras_campo_exemplares')} className={`w-full pl-10 p-3 border rounded-md transition-colors text-center font-semibold ${campoBloqueado('obras_campo_exemplares') ? disabledClass : enabledClass}`} />
                </div>
                <button type="button" onClick={() => setExemplares(Math.min(50, exemplares + 1))} disabled={campoBloqueado('obras_campo_exemplares')} className="w-11 h-11 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors disabled:opacity-50">+</button>
              </div>
            </div>
          </div>

          <Autocomplete label="Autor" options={opcoesAutores} value={autorId} onChange={setAutorId} placeholder="Escreve para pesquisar..." icon={<User size={18} />} disabled={campoBloqueado('obras_campo_autor')} required />
          <Autocomplete label="Editora" options={opcoesEditoras} value={editoraId} onChange={setEditoraId} placeholder="Escreve para pesquisar..." icon={<Building2 size={18} />} disabled={campoBloqueado('obras_campo_editora')} required />

          {autores.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md text-sm text-yellow-800">⚠️ <strong>Não existem autores registados.</strong> Vai a "Cadastrar Autor" primeiro.</div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading || autores.length === 0 || !podeCriar} className="bg-at-blue text-white px-8 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <BookOpen size={18} />}
              {loading ? 'A guardar...' : exemplares > 1 ? `Guardar ${exemplares} Exemplares` : 'Guardar Obra'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center"><BookOpen className="text-at-blue" size={22} /></div>
              <div>
                <h3 className="text-lg font-bold text-at-blue">Obras Registadas</h3>
                <p className="text-xs text-gray-400">{obras.length} obra(s) no acervo</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar por título, autor ou editora..." className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingObras ? (
            <div className="p-8 text-center text-gray-500">A carregar obras...</div>
          ) : obrasFiltradas.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">{pesquisa ? 'Nenhuma obra corresponde à pesquisa.' : 'Ainda não há obras cadastradas.'}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Título</th>
                  <th className="px-6 py-4 font-bold">Autor</th>
                  <th className="px-6 py-4 font-bold">Editora</th>
                  <th className="px-6 py-4 font-bold text-center">Ano</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {obrasFiltradas.map((obra) => (
                  <tr key={obra.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{obra.Titulo}</td>
                    <td className="px-6 py-4 text-gray-600">{obra.Autor}</td>
                    <td className="px-6 py-4 text-gray-600">{obra.Editora || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{obra.Ano}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${obra.Status === 'DISPONIVEL' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                        {obra.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => navigate(`/obras/${obra.Id}`)} className="inline-flex items-center gap-1.5 bg-at-blue text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-at-blue-light transition-colors">
                        <Eye size={14} /> Detalhes
                      </button>
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