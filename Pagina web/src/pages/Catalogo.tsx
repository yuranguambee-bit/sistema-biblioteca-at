import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  BookOpen, Search, User, Building2, Calendar, 
  BookMarked, RefreshCw, Send, X, Clock, Book, Hash
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
  AreaConhecimento: string | null;
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
  const [filtroArea, setFiltroArea] = useState('');
  const [processando, setProcessando] = useState<number | null>(null);
  const [detalheAberto, setDetalheAberto] = useState<Obra | null>(null);
  const [imgError, setImgError] = useState(false);

  const carregarObras = async () => {
    try {
      const res = await apiFetch('/api/obras');
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setObras(lista);
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

  const areas = useMemo(() => {
    const set = new Set<string>();
    obras.forEach((o) => { if (o.AreaConhecimento) set.add(o.AreaConhecimento); });
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
    if (filtroArea) resultado = resultado.filter((o) => o.AreaConhecimento === filtroArea);
    return resultado;
  }, [obras, pesquisa, filtroAutor, filtroEditora, filtroArea]);

  const handleRequisitar = async (obra: Obra) => {
    const ok = await confirm({
      title: 'Requisitar Obra',
      message: `Queres requisitar "${obra.Titulo}"? Depois deves ir à biblioteca para levantar o livro.`,
      confirmText: 'Requisitar',
      cancelText: 'Cancelar',
      variant: 'info',
    });
    if (!ok) return;

    setProcessando(obra.Id);
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
      setProcessando(null);
    }
  };

  const handleReservar = async (obra: Obra) => {
    const ok = await confirm({
      title: 'Entrar na Fila de Espera',
      message: `A obra "${obra.Titulo}" está emprestada. Queres entrar na fila de espera para seres notificado quando for devolvida?`,
      confirmText: 'Reservar',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!ok) return;

    setProcessando(obra.Id);
    try {
      const response = await apiFetch('/api/portal/reservar', {
        method: 'POST',
        body: JSON.stringify({ ObraId: obra.Id }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Entraste na fila de espera!', 'success');
        setDetalheAberto(null);
      } else {
        showToast(data.error || 'Erro ao reservar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessando(null);
    }
  };

  const limparFiltros = () => {
    setPesquisa('');
    setFiltroAutor('');
    setFiltroEditora('');
    setFiltroArea('');
  };

  const abrirDetalhes = (obra: Obra) => {
    setImgError(false);
    setDetalheAberto(obra);
  };

  const temFiltros = pesquisa || filtroAutor || filtroEditora || filtroArea;

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
              Explora todas as obras e faz a tua requisição ou reserva.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total de Obras</p>
            <p className="text-3xl font-bold mt-1">{obras.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
            />
          </div>

          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm bg-white"
          >
            <option value="">Todas as Áreas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

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
          {obrasFiltradas.map((obra) => {
            const disponivel = obra.Status === 'DISPONIVEL';
            return (
              <div
                key={obra.Id}
                className={`group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden border flex flex-col ${
                  disponivel ? 'border-gray-100' : 'border-orange-200'
                }`}
              >
                <div className={`p-5 text-white relative overflow-hidden ${
                  disponivel ? 'bg-gradient-to-br from-at-blue to-at-blue-light' : 'bg-gradient-to-br from-orange-500 to-orange-600'
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                        <BookOpen size={18} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        disponivel ? 'bg-green-400 text-green-900' : 'bg-white/20 text-white'
                      }`}>
                        {disponivel ? 'DISPONÍVEL' : 'EMPRESTADO'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 min-h-[3rem]">
                      {obra.Titulo}
                    </h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-2">
                  {obra.AreaConhecimento && (
                    <div className="text-xs font-semibold text-at-blue bg-blue-50 px-2 py-1 rounded-md mb-1 flex items-center gap-1 w-fit">
                      <Book size={12} /> {obra.AreaConhecimento}
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <User size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{obra.Autor || <span className="text-gray-300 italic">Sem autor</span>}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{obra.Editora || <span className="text-gray-300 italic">Sem editora</span>}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{obra.Ano}</span>
                  </div>

                  <div className="mt-auto pt-3 flex gap-2">
                    <button
                      onClick={() => abrirDetalhes(obra)}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Ver detalhes
                    </button>
                    {disponivel ? (
                      <button
                        onClick={() => handleRequisitar(obra)}
                        disabled={processando === obra.Id}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        {processando === obra.Id ? (
                          <><RefreshCw size={12} className="animate-spin" /> A enviar...</>
                        ) : (
                          <><Send size={12} /> Requisitar</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReservar(obra)}
                        disabled={processando === obra.Id}
                        className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        {processando === obra.Id ? (
                          <><RefreshCw size={12} className="animate-spin" /> A enviar...</>
                        ) : (
                          <><Clock size={12} /> Reservar</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALHES TOTALMENTE REDESENHADO */}
      {detalheAberto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => setDetalheAberto(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full animate-scale-in overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lado Esquerdo - Capa do Livro */}
            <div className="md:w-2/5 bg-gradient-to-br from-at-blue to-blue-900 p-6 flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              
              {detalheAberto.ISBN && !imgError ? (
                <img 
                  src={`https://covers.openlibrary.org/b/isbn/${detalheAberto.ISBN}-L.jpg`} 
                  alt="Capa do livro" 
                  className="w-full max-w-[200px] rounded-lg shadow-2xl relative z-10 border-4 border-white/20 object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full max-w-[200px] aspect-[2/3] rounded-lg bg-white/10 border-4 border-white/20 shadow-2xl flex flex-col items-center justify-center relative z-10">
                  <BookOpen size={64} className="text-white/50 mb-2" />
                  <p className="text-white/60 text-xs font-semibold text-center px-4">Capa Indisponível</p>
                </div>
              )}
              
              <div className="mt-6 relative z-10 text-center">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  detalheAberto.Status === 'DISPONIVEL' ? 'bg-green-400 text-green-900' : 'bg-orange-500 text-white'
                }`}>
                  {detalheAberto.Status === 'DISPONIVEL' ? 'DISPONÍVEL' : 'EMPRESTADO'}
                </span>
              </div>
            </div>

            {/* Lado Direito - Detalhes */}
            <div className="md:w-3/5 p-6 md:p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 leading-tight mb-2">{detalheAberto.Titulo}</h3>
                  {detalheAberto.AreaConhecimento && (
                    <span className="inline-block bg-blue-50 text-at-blue text-xs font-bold px-2 py-1 rounded">
                      {detalheAberto.AreaConhecimento}
                    </span>
                  )}
                </div>
                <button onClick={() => setDetalheAberto(null)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-1.5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm flex-1">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Autor</p>
                    <p className="font-semibold text-gray-800">{detalheAberto.Autor || '—'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Editora</p>
                    <p className="font-semibold text-gray-800">{detalheAberto.Editora || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Ano & Edição</p>
                    <p className="font-semibold text-gray-800">{detalheAberto.Ano} {detalheAberto.NumeroEdicao ? `· ${detalheAberto.NumeroEdicao}ª Edição` : ''}</p>
                  </div>
                </div>

                {detalheAberto.ISBN && (
                  <div className="flex items-center gap-3 pb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Hash size={14} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold">ISBN</p>
                      <p className="font-mono text-xs text-gray-700">{detalheAberto.ISBN}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                {detalheAberto.Status === 'DISPONIVEL' ? (
                  <button
                    onClick={() => handleRequisitar(detalheAberto)}
                    disabled={processando === detalheAberto.Id}
                    className="w-full bg-green-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {processando === detalheAberto.Id ? (
                      <><RefreshCw size={18} className="animate-spin" /> A processar...</>
                    ) : (
                      <><BookMarked size={18} /> Requisitar esta Obra</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleReservar(detalheAberto)}
                    disabled={processando === detalheAberto.Id}
                    className="w-full bg-orange-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {processando === detalheAberto.Id ? (
                      <><RefreshCw size={18} className="animate-spin" /> A processar...</>
                    ) : (
                      <><Clock size={18} /> Entrar na Fila de Espera</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}