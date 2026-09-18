import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

interface Emprestimo {
  Id: number;
  Obra: string;
  Cliente: string;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DataDevolucao: string | null;
  Status: string;
}

export function HistoricoEmprestimos() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'TODOS' | 'ATIVO' | 'DEVOLVIDO'>('TODOS');

  useEffect(() => {
    apiFetch('/api/emprestimos/historico')
      .then((r) => r.json())
      .then((data) => { setEmprestimos(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e) => { console.error(e); setLoading(false); });
  }, []);

  const emprestimosFiltrados = emprestimos.filter(e => filtro === 'TODOS' || e.Status === filtro);

  const totalAtivos = emprestimos.filter(e => e.Status === 'ATIVO').length;
  const totalDevolvidos = emprestimos.filter(e => e.Status === 'DEVOLVIDO').length;

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-at-blue">
        <h2 className="text-2xl font-bold text-at-blue">Histórico de Empréstimos</h2>
        <p className="text-gray-500 text-sm mt-1">Registo completo de todos os empréstimos realizados.</p>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center border-t-4 border-at-blue">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Total</p>
          <p className="text-4xl font-bold text-at-blue">{emprestimos.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 text-center border-t-4 border-red-500">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Em Curso</p>
          <p className="text-4xl font-bold text-red-600">{totalAtivos}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 text-center border-t-4 border-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Devolvidos</p>
          <p className="text-4xl font-bold text-green-600">{totalDevolvidos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-2">
        <button onClick={() => setFiltro('TODOS')}
          className={`px-5 py-2 rounded-md font-semibold text-sm transition-colors ${filtro === 'TODOS' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Todos ({emprestimos.length})
        </button>
        <button onClick={() => setFiltro('ATIVO')}
          className={`px-5 py-2 rounded-md font-semibold text-sm transition-colors ${filtro === 'ATIVO' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Em Curso ({totalAtivos})
        </button>
        <button onClick={() => setFiltro('DEVOLVIDO')}
          className={`px-5 py-2 rounded-md font-semibold text-sm transition-colors ${filtro === 'DEVOLVIDO' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Devolvidos ({totalDevolvidos})
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">A carregar histórico...</div>
          ) : emprestimosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Nenhum registo encontrado.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-at-blue text-white text-sm">
                  <th className="p-4 font-semibold">Obra</th>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Data Empréstimo</th>
                  <th className="p-4 font-semibold">Devolução Prevista</th>
                  <th className="p-4 font-semibold">Devolvido em</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {emprestimosFiltrados.map((emp) => (
                  <tr key={emp.Id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{emp.Obra}</td>
                    <td className="p-4">{emp.Cliente}</td>
                    <td className="p-4">{emp.DataEmprestimo}</td>
                    <td className="p-4">{emp.DataPrevistaDevolucao || '—'}</td>
                    <td className="p-4">{emp.DataDevolucao || <span className="text-gray-400 italic">Pendente</span>}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        emp.Status === 'ATIVO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {emp.Status}
                      </span>
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