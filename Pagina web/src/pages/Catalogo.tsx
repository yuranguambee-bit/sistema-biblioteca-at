import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  BookOpen, Search, User, Building2, Calendar, 
  BookMarked, RefreshCw, Send, X
} from 'lucide-react';

interface Obra {
  Id: number;
  Titulo: string;
  Autor: string | null;
  Editora: string | null;
  Ano: number;
  NumeroEdicao: string | null;
  NacionalidadeLivro: string | null;
  ISBN: string | null;
  Status: string;
}

export function Catalogo() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroAutor, setFiltroAutor] = useState('');
  const [filtroEditora, setFiltroEditora] = useState('');
  const [requisitando, setRequisitando] = useState<number | null>(null);
  const [detalheAberto, setDetalheAberto] = useState<Obra | null>(null);

  const carregarObras = async () => {
    try {
      const res = await apiFetch('/api/obras');
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setObras(lista.filter((o: Obra) => o.Status === 'DISPONIVEL'));
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => { carregarObras(); }, []);

  const autores = useMemo(() => {
    const set = new Set<string>();
    obras.forEach((o) => { if (o.Autor) set.add(o.Autor); });
    return Array.from(set).sort();
  }, [obras]);

  const editoras = useMemo(() => {
    const set = new Set<string>();
    obras.forEach((o) => { if (o.Editora) set.add(o.Editora); });
    return Array.from(set).sort();
  }, [obras]);

  const obrasFiltradas = useMemo(() => {
    let resultado = obras;
    if (pesquisa.trim()) {
      const p = pesquisa.toLowerCase();
      resultado = resultado.filter((o) =>
        o.Titulo.toLowerCase().includes(p) ||
        (o.Autor && o.Autor.toLowerCase().includes(p)) ||
        (o.Editora && o.Editora.toLowerCase().includes(p)) ||
        (o.ISBN && o.ISBN.toLowerCase().includes(p))
      );
    }
    if (filtroAutor) resultado = resultado.filter((o) => o.Autor === filtroAutor);
    if (filtroEditora) resultado = resultado.filter((o) => o.Editora === filtroEditora);
    return resultado;
  }, [obras, pesquisa, filtroAutor, filtroEditora]);

  const handleRequisitar = async (obra: Obra) => {
    const ok = await confirm({
      title: 'Requisitar Obra',
      message: `Queres requisitar "${obra.Titulo}"? Depois deves ir à biblioteca para levantar o livro.`,
      confirmText: 'Requisitar',
      cancelText: 'Cancelar',
      variant: 'info',
    });
    if (!ok) return;

    setRequisitando(obra.Id);
    try {
      const response = await apiFetch('/api/portal/requisitar', {
        method: 'POST',
        body: JSON.stringify({ ObraId: obra.Id }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Requisição efetuada! Dirige-te à biblioteca.', 'success');
        setDetalheAberto(null);
      } else {
        showToast(data.error || 'Erro ao requisitar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setRequisitando(null);
    }
  };

  const limparFiltros = () => {
    setPesquisa('');
    setFiltroAutor('');
    setFiltroEditora('');
  };

  const temFiltros = pesquisa || filtroAutor || filtroEditora;

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <BookOpen size={22} />
              </div>
              <h2 className="text-2xl font-bold">Catálogo de Obras</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Explora as obras disponíveis e faz a tua requisição.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Disponíveis</p>
            <p className="text-3xl font-bold mt-1">{obras.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por título, autor, editora ou ISBN..."
              className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
            />
          </div>

          <select
            value={filtroAutor}
            onChange={(e) => setFiltroAutor(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm bg-white"
          >
            <option value="">Todos os autores</option>
            {autores.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={filtroEditora}
            onChange={(e) => setFiltroEditora(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm bg-white"
          >
            <option value="">Todas as editoras</option>
            {editoras.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {temFiltros && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {obrasFiltradas.length} resultado{obrasFiltradas.length !== 1 ? 's' : ''} encontrado{obrasFiltradas.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={limparFiltros}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X size={12} /> Limpar filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-at-blue" />
          A carregar catálogo...
        </div>
      ) : obrasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <BookOpen size={56} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-semibold">
            {temFiltros ? 'Nenhuma obra corresponde aos filtros.' : 'Nenhuma obra disponível de momento.'}
          </p>
          {temFiltros && (
            <button
              onClick={limparFiltros}
              className="mt-4 text-at-blue font-semibold hover:underline text-sm"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obrasFiltradas.map((obra) => (
            <div
              key={obra.Id}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-gray-100 flex flex-col"
            >
              <div className="bg-gradient-to-br from-at-blue to-at-blue-light p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3">
                    <BookOpen size={18} />
                  </div>
                  <h3 className="font-bold text-lg leading-tight line-clamp-2 min-h-[3rem]">
                    {obra.Titulo}
                  </h3>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{obra.Autor || <span className="text-gray-300 italic">Sem autor</span>}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{obra.Editora || <span className="text-gray-300 italic">Sem editora</span>}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{obra.Ano}</span>
                  {obra.NumeroEdicao && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">
                      {obra.NumeroEdicao}
                    </span>
                  )}
                </div>

                {obra.ISBN && (
                  <p className="text-xs text-gray-400 font-mono mt-1">ISBN: {obra.ISBN}</p>
                )}

                <div className="mt-auto pt-3 flex gap-2">
                  <button
                    onClick={() => setDetalheAberto(obra)}
                    className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Ver detalhes
                  </button>
                  <button
                    onClick={() => handleRequisitar(obra)}
                    disabled={requisitando === obra.Id}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {requisitando === obra.Id ? (
                      <><RefreshCw size={12} className="animate-spin" /> A enviar...</>
                    ) : (
                      <><Send size={12} /> Requisitar</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalheAberto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => setDetalheAberto(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-at-blue line-clamp-2">{detalheAberto.Titulo}</h3>
                  <p className="text-xs text-gray-500">Detalhes da obra</p>
                </div>
              </div>
              <button onClick={() => setDetalheAberto(null)} className="text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Autor</span>
                <span className="font-semibold text-gray-800">{detalheAberto.Autor || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Editora</span>
                <span className="font-semibold text-gray-800">{detalheAberto.Editora || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Ano</span>
                <span className="font-semibold text-gray-800">{detalheAberto.Ano}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Nº de Edição</span>
                <span className="font-semibold text-gray-800">{detalheAberto.NumeroEdicao || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Nacionalidade do Livro</span>
                <span className="font-semibold text-gray-800">{detalheAberto.NacionalidadeLivro || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ISBN</span>
                <span className="font-mono text-xs text-gray-700">{detalheAberto.ISBN || '—'}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setDetalheAberto(null)}
                className="flex-1 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-md font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Fechar
              </button>
              <button
                onClick={() => handleRequisitar(detalheAberto)}
                disabled={requisitando === detalheAberto.Id}
                className="flex-1 bg-green-600 text-white px-5 py-2.5 rounded-md font-semibold hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {requisitando === detalheAberto.Id ? (
                  <><RefreshCw size={14} className="animate-spin" /> A enviar...</>
                ) : (
                  <><BookMarked size={14} /> Requisitar Obra</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}