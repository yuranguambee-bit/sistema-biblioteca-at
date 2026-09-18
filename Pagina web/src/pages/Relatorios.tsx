import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

type TipoRelatorio = 'inventario' | 'emprestimos' | 'clientes';

export function Relatorios() {
  const [tipo, setTipo] = useState<TipoRelatorio>('inventario');
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const dataAtual = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  const tituloRelatorio = 
    tipo === 'inventario' ? 'Relatório de Inventário do Acervo' :
    tipo === 'emprestimos' ? 'Relatório de Empréstimos Ativos' : 'Relatório de Clientes Registados';

  useEffect(() => {
    setLoading(true);
    const endpoint = tipo === 'inventario' ? 'obras' : tipo === 'emprestimos' ? 'emprestimos' : 'clientes';
    apiFetch(`/api/${endpoint}`)
      .then((r) => r.json())
      .then((data) => { setDados(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e) => { console.error(e); setLoading(false); });
  }, [tipo]);

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-at-blue flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-at-blue">Relatórios</h2>
          <p className="text-gray-500 text-sm mt-1">Gere e imprima relatórios do sistema.</p>
        </div>
        <button onClick={() => window.print()}
          className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
          🖨️ Imprimir
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-2 mb-6 flex flex-wrap gap-2 print:hidden">
        <button onClick={() => setTipo('inventario')}
          className={`px-6 py-3 rounded-md font-semibold transition-colors ${tipo === 'inventario' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          📚 Inventário
        </button>
        <button onClick={() => setTipo('emprestimos')}
          className={`px-6 py-3 rounded-md font-semibold transition-colors ${tipo === 'emprestimos' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          📤 Empréstimos
        </button>
        <button onClick={() => setTipo('clientes')}
          className={`px-6 py-3 rounded-md font-semibold transition-colors ${tipo === 'clientes' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          👥 Clientes
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 print-shadow-none">
        <div className="text-center mb-8 border-b-2 border-at-blue pb-6">
          <h1 className="text-2xl font-bold text-at-blue">Autoridade Tributária de Moçambique</h1>
          <h2 className="text-lg font-semibold text-gray-700 mt-2">{tituloRelatorio}</h2>
          <p className="text-sm text-gray-500 mt-1">Emitido em: {dataAtual}</p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">A gerar...</div>
        ) : dados.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Nenhum registo.</div>
        ) : (
          <>
            {tipo === 'inventario' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead><tr className="bg-gray-100 border-b-2 border-at-blue">
                  <th className="p-3 font-bold">#</th><th className="p-3 font-bold">Título</th>
                  <th className="p-3 font-bold">Autor</th><th className="p-3 font-bold">Editora</th>
                  <th className="p-3 font-bold text-center">Ano</th><th className="p-3 font-bold">Status</th>
                </tr></thead>
                <tbody>
                  {dados.map((o, i) => (
                    <tr key={o.Id} className="border-b border-gray-200">
                      <td className="p-3">{i + 1}</td><td className="p-3 font-medium">{o.Titulo}</td>
                      <td className="p-3">{o.Autor}</td><td className="p-3">{o.Editora || '—'}</td>
                      <td className="p-3 text-center">{o.Ano}</td><td className="p-3">{o.Status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tipo === 'emprestimos' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead><tr className="bg-gray-100 border-b-2 border-at-blue">
                  <th className="p-3 font-bold">#</th><th className="p-3 font-bold">Obra</th>
                  <th className="p-3 font-bold">Cliente</th><th className="p-3 font-bold">Data</th>
                </tr></thead>
                <tbody>
                  {dados.map((e, i) => (
                    <tr key={e.Id} className="border-b border-gray-200">
                      <td className="p-3">{i + 1}</td><td className="p-3">{e.Obra}</td>
                      <td className="p-3">{e.Cliente}</td><td className="p-3">{e.DataEmprestimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tipo === 'clientes' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead><tr className="bg-gray-100 border-b-2 border-at-blue">
                  <th className="p-3 font-bold">#</th><th className="p-3 font-bold">Nome</th>
                  <th className="p-3 font-bold">Email</th><th className="p-3 font-bold">Telefone</th>
                </tr></thead>
                <tbody>
                  {dados.map((c, i) => (
                    <tr key={c.Id} className="border-b border-gray-200">
                      <td className="p-3">{i + 1}</td><td className="p-3 font-medium">{c.Nome}</td>
                      <td className="p-3">{c.Email || '—'}</td><td className="p-3">{c.Telefone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-10 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>Total: <strong>{dados.length}</strong> registo(s)</p>
              <p className="mt-2">Sistema de Gestão de Biblioteca - AT Moçambique</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}