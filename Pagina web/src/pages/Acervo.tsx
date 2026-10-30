import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Obra } from '../types';
import { apiFetch } from '../services/api';
import { exportarParaCSV } from '../utils/exportar';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Eye, Edit, X, Save, RefreshCw, BookOpen, 
  User, Building2, Calendar, Hash, Barcode, MapPin, Tags 
} from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';

interface Autor { Id: number; Nome: string; }
interface Editora { Id: number; Nome: string; }

const ITENS_POR_PAGINA = 10;

export function Acervo() {
  const { showToast } = useToast();
  const { temPermissao } = useAuth();
  const navigate = useNavigate();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [autores, setAutores] = useState<Autor[]>([]);
  const [editoras, setEditoras] = useState<Editora[]>([]);
  const [loading, setLoading] = useState(true);

  const [pesquisa, setPesquisa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'DISPONIVEL' | 'EMPRESTADO'>('TODOS');
  const [filtroAutor, setFiltroAutor] = useState('TODOS');
  const [filtroEditora, setFiltroEditora] = useState('TODOS');
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Estados do Modal de Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const podeEditar = temPermissao('obras_editar');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [dObras, dAutores, dEditoras] = await Promise.all([
        apiFetch('/api/obras').then((r) => r.json()),
        apiFetch('/api/autores').then((r) => r.json()),
        apiFetch('/api/editoras').then((r) => r.json()),
      ]);
      setObras(Array.isArray(dObras) ? dObras : []);
      setAutores(Array.isArray(dAutores) ? dAutores : []);
      setEditoras(Array.isArray(dEditoras) ? dEditoras : []);
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPaginaAtual(1); }, [pesquisa, filtroStatus, filtroAutor, filtroEditora]);

  const obrasFiltradas = useMemo(() => {
    return obras.filter((obra) => {
      const correspondePesquisa =
        obra.Titulo.toLowerCase().includes(pesquisa.toLowerCase()) ||
        obra.Autor.toLowerCase().includes(pesquisa.toLowerCase()) ||
        (obra.Editora && obra.Editora.toLowerCase().includes(pesquisa.toLowerCase()));
      const correspondeStatus = filtroStatus === 'TODOS' || obra.Status === filtroStatus;
      const correspondeAutor = filtroAutor === 'TODOS' || obra.Autor === filtroAutor;
      const correspondeEditora = filtroEditora === 'TODOS' || obra.Editora === filtroEditora;
      return correspondePesquisa && correspondeStatus && correspondeAutor && correspondeEditora;
    });
  }, [obras, pesquisa, filtroStatus, filtroAutor, filtroEditora]);

  const totalPaginas = Math.max(1, Math.ceil(obrasFiltradas.length / ITENS_POR_PAGINA));
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const obrasPaginadas = obrasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);

  const irParaPagina = (pagina: number) => {
    if (pagina < 1 || pagina > totalPaginas) return;
    setPaginaAtual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limparFiltros = () => {
    setPesquisa('');
    setFiltroStatus('TODOS');
    setFiltroAutor('TODOS');
    setFiltroEditora('TODOS');
  };

  const handleExportarCSV = () => {
    exportarParaCSV(
      obrasFiltradas,
      [
        { chave: 'Id', titulo: 'ID' },
        { chave: 'Titulo', titulo: 'Título' },
        { chave: 'Autor', titulo: 'Autor' },
        { chave: 'Editora', titulo: 'Editora' },
        { chave: 'Ano', titulo: 'Ano' },
        { chave: 'Status', titulo: 'Status' },
      ],
      'acervo_biblioteca'
    );
    showToast('Ficheiro CSV exportado com sucesso!', 'success');
  };

  // ============ FUNÇÕES DE EDIÇÃO ============
  const handleAbrirEdicao = (obra: Obra) => {
    // Preenche o formulário com os dados atuais da obra
    setEditForm({
      Id: obra.Id,
      Titulo: obra.Titulo,
      Ano: obra.Ano,
      ISBN: (obra as any).ISBN || '',
      NumeroEdicao: (obra as any).NumeroEdicao || '',
      NacionalidadeLivro: (obra as any).NacionalidadeLivro || '',
      Codigo: (obra as any).Codigo || '',
      AreaConhecimento: (obra as any).AreaConhecimento || '',
      Localizacao: (obra as any).Localizacao || '',
      AutorId: (obra as any).AutorId || '',
      EditoraId: (obra as any).EditoraId || '',
    });
    setModalAberto(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.EditoraId) return showToast('A editora é obrigatória.', 'error');

    setSalvando(true);
    try {
      const res = await apiFetch(`/api/obras/${editForm.Id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Obra atualizada com sucesso!', 'success');
        setModalAberto(false);
        carregarDados(); // Recarrega a lista para mostrar as alterações
      } else {
        showToast(data.error || 'Erro ao atualizar obra.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-at-blue">Acervo da Biblioteca</h2>
          <p className="text-gray-500 text-sm mt-1">Consulte, edite, pesquise e exporte o inventário.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-at-blue text-white px-4 py-2 rounded-md">
            <span className="text-sm font-semibold">{obrasFiltradas.length} obra(s)</span>
          </div>
          <button onClick={handleExportarCSV}
            className="bg-green-600 text-white px-5 py-2.5 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
            📊 Exportar Excel
          </button>
          <button onClick={() => window.print()}
            className="bg-at-blue text-white px-5 py-2.5 rounded-md font-semibold hover:bg-at-blue-light transition-colors flex items-center gap-2 text-sm">
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Pesquisar</label>
            <input type="text" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Título, Autor ou Editora..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Autor</label>
            <select value={filtroAutor} onChange={(e) => setFiltroAutor(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
              <option value="TODOS">Todos os Autores</option>
              {autores.map((a) => <option key={a.Id} value={a.Nome}>{a.Nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Editora</label>
            <select value={filtroEditora} onChange={(e) => setFiltroEditora(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
              <option value="TODOS">Todas as Editoras</option>
              {editoras.map((ed) => <option key={ed.Id} value={ed.Nome}>{ed.Nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
              <option value="TODOS">Todos</option>
              <option value="DISPONIVEL">Disponíveis</option>
              <option value="EMPRESTADO">Emprestados</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-end">
            <button onClick={limparFiltros}
              className="bg-gray-200 text-gray-700 px-5 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors text-sm">
              🔄 Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : obrasFiltradas.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 font-semibold">Nenhuma obra corresponde aos filtros.</p>
              <button onClick={limparFiltros}
                className="mt-4 text-at-blue font-semibold hover:underline text-sm">
                Limpar filtros e ver tudo
              </button>
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
                {obrasPaginadas.map((obra) => (
                  <tr key={obra.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{obra.Titulo}</td>
                    <td className="px-6 py-4 text-gray-600">{obra.Autor}</td>
                    <td className="px-6 py-4 text-gray-600">{obra.Editora || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{obra.Ano}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        obra.Status === 'DISPONIVEL' 
                          ? 'bg-green-50 text-green-700 ring-1 ring-green-200' 
                          : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          obra.Status === 'DISPONIVEL' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        {obra.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => navigate(`/obras/${obra.Id}`)}
                          className="inline-flex items-center gap-1.5 bg-at-blue text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-at-blue-light transition-colors"
                          title="Ver detalhes e histórico"
                        >
                          <Eye size={14} /> Ver Detalhes
                        </button>
                        
                        {podeEditar && (
                          <button 
                            onClick={() => handleAbrirEdicao(obra)}
                            className="inline-flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-yellow-600 transition-colors"
                            title="Editar dados da obra"
                          >
                            <Edit size={14} /> Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && obrasFiltradas.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              A mostrar <strong>{inicio + 1}</strong> a <strong>{Math.min(inicio + ITENS_POR_PAGINA, obrasFiltradas.length)}</strong> de <strong>{obrasFiltradas.length}</strong> obra(s)
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => irParaPagina(1)} disabled={paginaAtual === 1}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ««
              </button>
              <button onClick={() => irParaPagina(paginaAtual - 1)} disabled={paginaAtual === 1}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ‹ Anterior
              </button>
              <span className="px-4 py-2 bg-at-blue text-white rounded-md text-sm font-semibold">
                {paginaAtual} / {totalPaginas}
              </span>
              <button onClick={() => irParaPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Próxima ›
              </button>
              <button onClick={() => irParaPagina(totalPaginas)} disabled={paginaAtual === totalPaginas}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE OBRA */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-8 animate-scale-in flex flex-col">
            
            {/* Cabeçalho do Modal */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Edit className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Editar Obra</h3>
                  <p className="text-xs text-gray-500">Altera os dados do livro no inventário</p>
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Modal (Formulário) */}
            <form onSubmit={handleSalvarEdicao} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Título */}
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-gray-400" /> Título da Obra
                  </label>
                  <input type="text" required value={editForm.Titulo} onChange={(e) => setEditForm({...editForm, Titulo: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" />
                </div>

                {/* Ano e Edição */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" /> Ano de Publicação
                  </label>
                  <input type="number" required value={editForm.Ano} onChange={(e) => setEditForm({...editForm, Ano: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Hash size={14} className="text-gray-400" /> Nº de Edição
                  </label>
                  <input type="text" value={editForm.NumeroEdicao} onChange={(e) => setEditForm({...editForm, NumeroEdicao: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" placeholder="Ex: 1ª" />
                </div>

                {/* Autor e Editora */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <User size={14} className="text-gray-400" /> Autor
                  </label>
                  <select required value={editForm.AutorId} onChange={(e) => setEditForm({...editForm, AutorId: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm bg-white">
                    <option value="">Seleciona o Autor</option>
                    {autores.map(a => <option key={a.Id} value={a.Id}>{a.Nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={14} className="text-gray-400" /> Editora
                  </label>
                  <select required value={editForm.EditoraId} onChange={(e) => setEditForm({...editForm, EditoraId: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm bg-white">
                    <option value="">Seleciona a Editora</option>
                    {editoras.map(ed => <option key={ed.Id} value={ed.Id}>{ed.Nome}</option>)}
                  </select>
                </div>

                {/* Código e Localização */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Barcode size={14} className="text-gray-400" /> Código Físico
                  </label>
                  <input type="text" value={editForm.Codigo} onChange={(e) => setEditForm({...editForm, Codigo: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" placeholder="Ex: 1925" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400" /> Localização
                  </label>
                  <input type="text" value={editForm.Localizacao} onChange={(e) => setEditForm({...editForm, Localizacao: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" placeholder="Ex: E1C1F1" />
                </div>

                {/* Área de Conhecimento e ISBN */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Tags size={14} className="text-gray-400" /> Área de Conhecimento
                  </label>
                  <input type="text" value={editForm.AreaConhecimento} onChange={(e) => setEditForm({...editForm, AreaConhecimento: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" placeholder="Ex: Direito" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Hash size={14} className="text-gray-400" /> ISBN
                  </label>
                  <input type="text" value={editForm.ISBN} onChange={(e) => setEditForm({...editForm, ISBN: e.target.value})} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-at-blue text-sm" placeholder="Ex: 978-989..." />
                </div>

              </div>

              {/* Botões de Ação */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setModalAberto(false)} className="px-5 py-2.5 rounded-md text-gray-600 font-semibold hover:bg-gray-100 transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="px-6 py-2.5 rounded-md bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition-colors shadow-md disabled:bg-gray-400 flex items-center gap-2 text-sm">
                  {salvando ? <><RefreshCw size={16} className="animate-spin"/> A guardar...</> : <><Save size={16} /> Guardar Alterações</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}