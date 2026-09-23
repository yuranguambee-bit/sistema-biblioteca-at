import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { 
  Search, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, History, CheckCircle, 
  Clock, X
} from 'lucide-react';

interface Emprestimo {
  Id: number;
  Obra: string;
  Cliente: string;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DataDevolucao: string | null;
  Status: string;
}

const ITENS_POR_PAGINA = 10;

function parseData(data: string): Date {
  const [dia, mes, ano] = data.split('/').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function HistoricoEmprestimos() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [loading, setLoading] = useState(true);

  const [pesquisa, setPesquisa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVO' | 'DEVOLVIDO'>('TODOS');
  const [filtroData, setFiltroData] = useState<'TODOS' | 'MES' | 'TRIMESTRE' | 'ANO'>('TODOS');

  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    apiFetch('/api/emprestimos/historico')
      .then((r) => r.json())
      .then((data) => { 
        setEmprestimos(Array.isArray(data) ? data : []); 
        setLoading(false); 
      })
      .catch((e) => { console.error(e); setLoading(false); });
  }, []);

  useEffect(() => {
    setPaginaAtual(1);
  }, [pesquisa, filtroStatus, filtroData]);

  const emprestimosFiltrados = useMemo(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioTrimestre = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate());
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);

    return emprestimos.filter((emp) => {
      const p = pesquisa.toLowerCase();
      const correspondePesquisa =
        emp.Obra.toLowerCase().includes(p) ||
        emp.Cliente.toLowerCase().includes(p);

      const correspondeStatus = filtroStatus === 'TODOS' || emp.Status === filtroStatus;

      let correspondeData = true;
      if (filtroData !== 'TODOS') {
        const dataEmp = parseData(emp.DataEmprestimo);
        if (filtroData === 'MES') correspondeData = dataEmp >= inicioMes;
        else if (filtroData === 'TRIMESTRE') correspondeData = dataEmp >= inicioTrimestre;
        else if (filtroData === 'ANO') correspondeData = dataEmp >= inicioAno;
      }

      return correspondePesquisa && correspondeStatus && correspondeData;
    });
  }, [emprestimos, pesquisa, filtroStatus, filtroData]);

  const totalPaginas = Math.max(1, Math.ceil(emprestimosFiltrados.length / ITENS_POR_PAGINA));
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const emprestimosPaginados = emprestimosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  const irParaPagina = (pagina: number) => {
    if (pagina < 1 || pagina > totalPaginas) return;
    setPaginaAtual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limparFiltros = () => {
    setPesquisa('');
    setFiltroStatus('TODOS');
    setFiltroData('TODOS');
  };

  const temFiltrosAtivos = pesquisa !== '' || filtroStatus !== 'TODOS' || filtroData !== 'TODOS';

  const totalAtivos = emprestimos.filter(e => e.Status === 'ATIVO').length;
  const totalDevolvidos = emprestimos.filter(e => e.Status === 'DEVOLVIDO').length;

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <History size={22} />
              </div>
              <h2 className="text-2xl font-bold">Histórico de Empréstimos</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Registo completo de todos os empréstimos realizados.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold mt-1">{emprestimos.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <History className="text-at-blue" size={20} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Registos</p>
            </div>
            <p className="text-3xl font-bold text-at-blue">{emprestimos.length}</p>
            <p className="text-xs text-gray-400 mt-1">desde o início do sistema</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Clock className="text-red-600" size={20} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Em Curso</p>
            </div>
            <p className="text-3xl font-bold text-red-600">{totalAtivos}</p>
            <p className="text-xs text-gray-400 mt-1">empréstimos ainda não devolvidos</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Devolvidos</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{totalDevolvidos}</p>
            <p className="text-xs text-gray-400 mt-1">já entregues aos leitores</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Pesquisar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Obra ou cliente..."
                className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📊 Estado
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
            >
              <option value="TODOS">Todos ({emprestimos.length})</option>
              <option value="ATIVO">Em Curso ({totalAtivos})</option>
              <option value="DEVOLVIDO">Devolvidos ({totalDevolvidos})</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Período
            </label>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
            >
              <option value="TODOS">Todo o Histórico</option>
              <option value="MES">Este Mês</option>
              <option value="TRIMESTRE">Últimos 3 Meses</option>
              <option value="ANO">Este Ano</option>
            </select>
          </div>
        </div>

        {temFiltrosAtivos && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <strong>{emprestimosFiltrados.length}</strong> resultado(s) encontrado(s)
              {emprestimosFiltrados.length !== emprestimos.length && (
                <span className="text-gray-400"> de {emprestimos.length}</span>
              )}
            </p>
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              <X size={14} /> Limpar Filtros
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">A carregar histórico...</div>
          ) : emprestimosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <History size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {temFiltrosAtivos ? 'Nenhum registo corresponde aos filtros.' : 'Nenhum registo encontrado.'}
              </p>
              {temFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="mt-4 text-at-blue font-semibold hover:underline text-sm"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Obra</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Empréstimo</th>
                  <th className="px-6 py-4 font-bold">Devolução Prevista</th>
                  <th className="px-6 py-4 font-bold">Devolvido em</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {emprestimosPaginados.map((emp) => (
                  <tr key={emp.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{emp.Obra}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.Cliente}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.DataEmprestimo}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.DataPrevistaDevolucao}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {emp.DataDevolucao || <span className="text-gray-300 italic">Pendente</span>}
                    </td>
                    <td className="px-6 py-4">
                      {emp.Status === 'DEVOLVIDO' ? (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-200">
                          <CheckCircle size={12} /> Devolvido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">
                          <Clock size={12} /> Em Curso
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && emprestimosFiltrados.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              A mostrar <strong>{inicio + 1}</strong> a{' '}
              <strong>{Math.min(inicio + ITENS_POR_PAGINA, emprestimosFiltrados.length)}</strong> de{' '}
              <strong>{emprestimosFiltrados.length}</strong> registo(s)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => irParaPagina(1)}
                disabled={paginaAtual === 1}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Primeira página"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => irParaPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="px-4 py-2 bg-at-blue text-white rounded-md text-sm font-semibold">
                {paginaAtual} / {totalPaginas}
              </span>
              <button
                onClick={() => irParaPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Próxima <ChevronRight size={14} />
              </button>
              <button
                onClick={() => irParaPagina(totalPaginas)}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Última página"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}