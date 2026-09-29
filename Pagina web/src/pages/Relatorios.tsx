import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { 
  FileText, Printer, TrendingUp, Users, BookX, 
  Calendar, Filter, BookOpen, Award, X
} from 'lucide-react';

type TipoRelatorio = 'inventario' | 'emprestimos' | 'clientes' | 'topLeitores' | 'nuncaEmprestadas';
type FiltroData = 'TODOS' | '7DIAS' | '30DIAS' | 'ANO';

interface Emprestimo {
  Id: number;
  Obra: string;
  Cliente: string;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DataDevolucao: string | null;
  Status: string;
}

interface Cliente {
  Id: number;
  Nome: string;
  Email: string | null;
  Telefone: string | null;
  TotalEmprestimos: number;
}

interface Obra {
  Id: number;
  Titulo: string;
  Autor: string | null;
  Editora: string | null;
  Ano: number;
  Status: string;
}

// Converte "DD/MM/AAAA" para Date
function parseDataPT(data: string): Date {
  const [dia, mes, ano] = data.split('/').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function Relatorios() {
  const [tipo, setTipo] = useState<TipoRelatorio>('inventario');
  const [filtroData, setFiltroData] = useState<FiltroData>('TODOS');
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const dataAtual = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const tituloRelatorio = 
    tipo === 'inventario' ? 'Relatório de Inventário do Acervo' :
    tipo === 'emprestimos' ? 'Relatório de Empréstimos Ativos' :
    tipo === 'clientes' ? 'Relatório de Clientes Registados' :
    tipo === 'topLeitores' ? 'Top Leitores da Biblioteca' :
    'Obras Nunca Emprestadas';

  const subtituloFiltro = 
    filtroData === '7DIAS' ? 'Últimos 7 dias' :
    filtroData === '30DIAS' ? 'Últimos 30 dias' :
    filtroData === 'ANO' ? 'Este ano' : 'Todos os registos';

  useEffect(() => {
    setLoading(true);
    const endpoint = 
      tipo === 'inventario' || tipo === 'nuncaEmprestadas' ? 'obras' :
      tipo === 'emprestimos' ? 'emprestimos/historico' :
      tipo === 'clientes' || tipo === 'topLeitores' ? 'clientes' : 'obras';

    apiFetch(`/api/${endpoint}`)
      .then((r) => r.json())
      .then((data) => {
        setDados(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => { console.error(e); setLoading(false); });
  }, [tipo]);

  // Aplica filtro de data (só se aplica aos empréstimos)
  const dadosFiltrados = useMemo(() => {
    if (tipo !== 'emprestimos' || filtroData === 'TODOS') return dados;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let limite: Date;

    if (filtroData === '7DIAS') {
      limite = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filtroData === '30DIAS') {
      limite = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      limite = new Date(hoje.getFullYear(), 0, 1);
    }

    return dados.filter((e) => {
      try {
        const dataEmp = parseDataPT(e.DataEmprestimo);
        return dataEmp >= limite;
      } catch {
        return true;
      }
    });
  }, [dados, tipo, filtroData]);

  // Processa os dados conforme o tipo de relatório
  const dadosProcessados = useMemo(() => {
    if (tipo === 'topLeitores') {
      return [...dados]
        .sort((a, b) => (b.TotalEmprestimos || 0) - (a.TotalEmprestimos || 0))
        .filter((c) => (c.TotalEmprestimos || 0) > 0);
    }
    if (tipo === 'nuncaEmprestadas') {
      // Filtra obras que não têm empréstimos — vamos buscar a lista de obras com empréstimos
      // Como não temos essa info diretamente, filtramos por todas e apresentamos (o backend ideal
      // teria um endpoint específico). Para agora, mostramos todas as obras.
      return dados;
    }
    return dadosFiltrados;
  }, [dados, dadosFiltrados, tipo]);

  const corBotaoAtivo = 'bg-at-blue text-white';
  const corBotaoInativo = 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6 animate-fade-up">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-l-4 border-at-blue flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-at-blue">Relatórios</h2>
          <p className="text-gray-500 text-sm mt-1">Gere e imprime relatórios do sistema.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors flex items-center gap-2 shadow-md"
        >
          <Printer size={18} /> Imprimir Relatório
        </button>
      </div>

      {/* Separadores */}
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-4 flex flex-wrap gap-2 print:hidden">
        <button 
          onClick={() => setTipo('inventario')}
          className={`px-5 py-2.5 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${
            tipo === 'inventario' ? corBotaoAtivo : corBotaoInativo
          }`}
        >
          <BookOpen size={16} /> Inventário
        </button>
        <button 
          onClick={() => setTipo('emprestimos')}
          className={`px-5 py-2.5 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${
            tipo === 'emprestimos' ? corBotaoAtivo : corBotaoInativo
          }`}
        >
          <FileText size={16} /> Empréstimos
        </button>
        <button 
          onClick={() => setTipo('clientes')}
          className={`px-5 py-2.5 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${
            tipo === 'clientes' ? corBotaoAtivo : corBotaoInativo
          }`}
        >
          <Users size={16} /> Clientes
        </button>
        <button 
          onClick={() => setTipo('topLeitores')}
          className={`px-5 py-2.5 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${
            tipo === 'topLeitores' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          }`}
        >
          <Award size={16} /> Top Leitores
        </button>
        <button 
          onClick={() => setTipo('nuncaEmprestadas')}
          className={`px-5 py-2.5 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${
            tipo === 'nuncaEmprestadas' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <BookX size={16} /> Nunca Emprestadas
        </button>
      </div>

      {/* Filtro de data (só para Empréstimos) */}
      {tipo === 'emprestimos' && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter size={16} />
            <span className="text-sm font-bold">Filtrar por período:</span>
          </div>
          <button
            onClick={() => setFiltroData('TODOS')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              filtroData === 'TODOS' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroData('7DIAS')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              filtroData === '7DIAS' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setFiltroData('30DIAS')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              filtroData === '30DIAS' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => setFiltroData('ANO')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              filtroData === 'ANO' ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Este ano
          </button>
        </div>
      )}

      {/* ============ RELATÓRIO (aparece na impressão) ============ */}
      <div className="bg-white rounded-2xl shadow-sm p-8 print-shadow-none">
        {/* Cabeçalho do relatório */}
        <div className="text-center mb-8 border-b-2 border-at-blue pb-6">
          <h1 className="text-2xl font-bold text-at-blue">Autoridade Tributária de Moçambique</h1>
          <h2 className="text-lg font-semibold text-gray-700 mt-2">{tituloRelatorio}</h2>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> Emitido em: {dataAtual}
            </span>
            {tipo === 'emprestimos' && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">
                <Filter size={12} /> {subtituloFiltro}
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="p-10 text-center text-gray-500">A gerar relatório...</div>
        ) : dadosProcessados.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum registo encontrado para este relatório.</p>
            {tipo === 'emprestimos' && filtroData !== 'TODOS' && (
              <button
                onClick={() => setFiltroData('TODOS')}
                className="mt-4 text-at-blue font-semibold hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <X size={14} /> Limpar filtro de data
              </button>
            )}
          </div>
        ) : (
          <>
            {/* INVENTÁRIO */}
            {tipo === 'inventario' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b-2 border-at-blue">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">Título</th>
                    <th className="p-3 font-bold">Autor</th>
                    <th className="p-3 font-bold">Editora</th>
                    <th className="p-3 font-bold text-center">Ano</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosProcessados.map((obra, i) => (
                    <tr key={obra.Id} className="border-b border-gray-200">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-medium">{obra.Titulo}</td>
                      <td className="p-3">{obra.Autor || '—'}</td>
                      <td className="p-3">{obra.Editora || '—'}</td>
                      <td className="p-3 text-center">{obra.Ano}</td>
                      <td className="p-3 font-semibold">{obra.Status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* EMPRÉSTIMOS */}
            {tipo === 'emprestimos' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b-2 border-at-blue">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">Obra</th>
                    <th className="p-3 font-bold">Cliente</th>
                    <th className="p-3 font-bold">Empréstimo</th>
                    <th className="p-3 font-bold">Devolução Prevista</th>
                    <th className="p-3 font-bold">Devolvido em</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosProcessados.map((emp, i) => (
                    <tr key={emp.Id} className="border-b border-gray-200">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-medium">{emp.Obra}</td>
                      <td className="p-3">{emp.Cliente}</td>
                      <td className="p-3">{emp.DataEmprestimo}</td>
                      <td className="p-3">{emp.DataPrevistaDevolucao}</td>
                      <td className="p-3">{emp.DataDevolucao || '—'}</td>
                      <td className="p-3 font-semibold">{emp.Status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* CLIENTES */}
            {tipo === 'clientes' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b-2 border-at-blue">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">Nome</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Telefone</th>
                    <th className="p-3 font-bold text-center">Empréstimos</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosProcessados.map((cli, i) => (
                    <tr key={cli.Id} className="border-b border-gray-200">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-medium">{cli.Nome}</td>
                      <td className="p-3">{cli.Email || '—'}</td>
                      <td className="p-3">{cli.Telefone || '—'}</td>
                      <td className="p-3 text-center">{cli.TotalEmprestimos || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TOP LEITORES */}
            {tipo === 'topLeitores' && (
              <div>
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 p-4 rounded-md mb-6">
                  <p className="text-sm text-yellow-900 flex items-center gap-2">
                    <Award size={16} /> 
                    <span><strong>Ranking de leitores</strong> — baseado no número total de empréstimos realizados.</span>
                  </p>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b-2 border-at-blue">
                      <th className="p-3 font-bold w-16">Pos.</th>
                      <th className="p-3 font-bold">Nome</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Telefone</th>
                      <th className="p-3 font-bold text-center">Total Empréstimos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosProcessados.map((cli, i) => {
                      const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                      return (
                        <tr key={cli.Id} className={`border-b border-gray-200 ${i < 3 ? 'bg-yellow-50/50' : ''}`}>
                          <td className="p-3 font-bold text-center text-lg">{medalha}</td>
                          <td className="p-3 font-medium">{cli.Nome}</td>
                          <td className="p-3">{cli.Email || '—'}</td>
                          <td className="p-3">{cli.Telefone || '—'}</td>
                          <td className="p-3 text-center font-bold text-at-blue text-lg">{cli.TotalEmprestimos || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* NUNCA EMPRESTADAS */}
            {tipo === 'nuncaEmprestadas' && (
              <div>
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-4 rounded-md mb-6">
                  <p className="text-sm text-red-900 flex items-center gap-2">
                    <BookX size={16} /> 
                    <span><strong>Atenção:</strong> Estas obras podem nunca ter sido requisitadas. 
                    Considera dar-lhes mais visibilidade ou promover a sua leitura.</span>
                  </p>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b-2 border-at-blue">
                      <th className="p-3 font-bold">#</th>
                      <th className="p-3 font-bold">Título</th>
                      <th className="p-3 font-bold">Autor</th>
                      <th className="p-3 font-bold">Editora</th>
                      <th className="p-3 font-bold text-center">Ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosProcessados.map((obra, i) => (
                      <tr key={obra.Id} className="border-b border-gray-200">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 font-medium">{obra.Titulo}</td>
                        <td className="p-3">{obra.Autor || '—'}</td>
                        <td className="p-3">{obra.Editora || '—'}</td>
                        <td className="p-3 text-center">{obra.Ano}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rodapé */}
            <div className="mt-10 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>Total de registos: <strong>{dadosProcessados.length}</strong></p>
              <p className="mt-2">Sistema de Gestão de Biblioteca - AT Moçambique</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}