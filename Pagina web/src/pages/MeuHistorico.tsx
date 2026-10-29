import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { 
  History, BookOpen, User, Calendar, CheckCircle, 
  ArrowLeft, RefreshCw, Search, Filter
} from 'lucide-react';

interface EmprestimoHistorico {
  Id: number;
  Obra: string;
  Autor: string | null;
  DataEmprestimo: string;
  DataDevolucao: string | null;
}

export function MeuHistorico() {
  const [historico, setHistorico] = useState<EmprestimoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroAno, setFiltroAno] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/portal/meu-historico');
      const data = await res.json();
      setHistorico(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const anos = useMemo(() => {
    const set = new Set<string>();
    historico.forEach((h) => {
      if (h.DataEmprestimo) {
        const match = h.DataEmprestimo.match(/\/(\d{4})$/);
        if (match) set.add(match[1]);
      }
    });
    return Array.from(set).sort().reverse();
  }, [historico]);

  const historicoFiltrado = useMemo(() => {
    let resultado = historico;
    if (pesquisa.trim()) {
      const p = pesquisa.toLowerCase();
      resultado = resultado.filter((h) =>
        h.Obra.toLowerCase().includes(p) ||
        (h.Autor && h.Autor.toLowerCase().includes(p))
      );
    }
    if (filtroAno) {
      resultado = resultado.filter((h) => h.DataEmprestimo.endsWith(filtroAno));
    }
    return resultado;
  }, [historico, pesquisa, filtroAno]);

  return (
    <main className="max-w-5xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Voltar ao início
      </Link>

      {/* CABEÇALHO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl shadow-2xl p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <History size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Meu Histórico</h1>
                <p className="text-blue-100 text-sm mt-0.5">Todas as obras que já requisitaste</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20 text-center">
            <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold mt-1">{historico.length}</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      {historico.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Pesquisar por título ou autor..."
                className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm bg-white"
              >
                <option value="">Todos os anos</option>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-at-blue" />
          A carregar histórico...
        </div>
      ) : historico.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <History size={56} className="mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Sem histórico ainda</h3>
          <p className="text-gray-500 text-sm mb-6">
            Ainda não requisitaste nenhuma obra.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
          >
            <BookOpen size={16} /> Explorar Catálogo
          </Link>
        </div>
      ) : historicoFiltrado.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Search size={56} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-semibold">Nenhum resultado com esses filtros.</p>
          <button
            onClick={() => { setPesquisa(''); setFiltroAno(''); }}
            className="mt-4 text-at-blue font-semibold hover:underline text-sm"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Versão tabela para desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Obra</th>
                  <th className="px-6 py-4 font-bold">Autor</th>
                  <th className="px-6 py-4 font-bold">Empréstimo</th>
                  <th className="px-6 py-4 font-bold">Devolvido em</th>
                  <th className="px-6 py-4 font-bold text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {historicoFiltrado.map((h) => (
                  <tr key={h.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white flex-shrink-0">
                          <BookOpen size={16} />
                        </div>
                        <span className="font-semibold text-gray-800">{h.Obra}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{h.Autor || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400" /> {h.DataEmprestimo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {h.DataDevolucao || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-200">
                        <CheckCircle size={12} /> Devolvido
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão cartões para mobile */}
          <div className="md:hidden divide-y divide-gray-50">
            {historicoFiltrado.map((h) => (
              <div key={h.Id} className="p-4 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{h.Obra}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <User size={10} /> {h.Autor || 'Autor desconhecido'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Calendar size={11} /> {h.DataEmprestimo}
                  </span>
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={11} /> Devolvido
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESUMO */}
      {historico.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-at-blue rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-at-blue flex items-center justify-center text-white flex-shrink-0">
            <History size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-at-blue">Resumo</h3>
            <p className="text-sm text-gray-700 mt-1">
              Já requisitaste <strong>{historico.length}</strong> obra{historico.length !== 1 ? 's' : ''} da biblioteca da AT.
              {historicoFiltrado.length !== historico.length && (
                <span className="text-gray-500"> A mostrar <strong>{historicoFiltrado.length}</strong> com os filtros atuais.</span>
              )}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}