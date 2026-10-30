import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  BookOpen, Heart, User, Building2, Calendar, 
  RefreshCw, Send, Clock, Trash2
} from 'lucide-react';

interface Obra {
  Id: number;
  Titulo: string;
  Autor: string | null;
  Editora: string | null;
  Ano: number;
  Status: string;
}

export function MeusFavoritos() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [favoritos, setFavoritos] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<number | null>(null);

  const carregarFavoritos = async () => {
    try {
      const res = await apiFetch('/api/portal/favoritos');
      const data = await res.json();
      setFavoritos(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregarFavoritos(); }, []);

  const handleRemover = async (id: number, titulo: string) => {
    const ok = await confirm({
      title: 'Remover dos Favoritos',
      message: `Queres remover "${titulo}" da tua lista de desejos?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/portal/favoritos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Removido dos favoritos.', 'success');
        carregarFavoritos();
      }
    } catch (error) {
      showToast('Erro ao remover.', 'error');
    }
  };

  const handleRequisitar = async (obra: Obra) => {
    const ok = await confirm({
      title: 'Requisitar Obra',
      message: `Queres requisitar "${obra.Titulo}"?`,
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
        showToast(data.message || 'Requisição efetuada!', 'success');
      } else {
        showToast(data.error || 'Erro ao requisitar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessando(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-red-500 to-red-600 rounded-3xl shadow-2xl p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <Heart size={24} className="fill-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">A Minha Lista de Desejos</h1>
                <p className="text-pink-100 text-sm mt-0.5">Livros que queres ler no futuro</p>
              </div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/30 text-center">
            <p className="text-xs text-pink-100 font-medium uppercase tracking-wider">Livros</p>
            <p className="text-3xl font-bold mt-1">{favoritos.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-red-500" />
          A carregar a tua lista...
        </div>
      ) : favoritos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Heart size={56} className="mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">A tua lista está vazia</h3>
          <p className="text-gray-500 text-sm mb-6">
            Explora o catálogo e clica no coração ❤️ para guardares os livros que queres ler.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
          >
            <BookOpen size={16} /> Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoritos.map((obra) => {
            const disponivel = obra.Status === 'DISPONIVEL';
            return (
              <div key={obra.Id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group relative">
                <button 
                  onClick={() => handleRemover(obra.Id, obra.Titulo)}
                  className="absolute top-3 right-3 bg-white text-gray-400 hover:text-red-500 p-2 rounded-full shadow-md z-10 transition-colors"
                  title="Remover dos favoritos"
                >
                  <Trash2 size={16} />
                </button>
                
                <div className={`p-5 text-white relative overflow-hidden ${disponivel ? 'bg-gradient-to-br from-at-blue to-at-blue-light' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}>
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                    <BookOpen size={18} />
                  </div>
                  <h3 className="font-bold text-lg leading-tight line-clamp-2 pr-6">{obra.Titulo}</h3>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{obra.Autor || 'Sem autor'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{obra.Editora || 'Sem editora'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{obra.Ano}</span>
                  </div>

                  <div className="mt-auto pt-4">
                    {disponivel ? (
                      <button
                        onClick={() => handleRequisitar(obra)}
                        disabled={processando === obra.Id}
                        className="w-full bg-green-600 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
                      >
                        {processando === obra.Id ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        {processando === obra.Id ? 'A processar...' : 'Requisitar'}
                      </button>
                    ) : (
                      <div className="w-full bg-orange-50 text-orange-700 px-3 py-2 rounded-md text-xs font-bold ring-1 ring-orange-200 flex items-center justify-center gap-2">
                        <Clock size={14} /> Emprestado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}