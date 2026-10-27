import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { 
  History, Search, ShieldAlert, User, 
  Trash2, Edit3, PlusCircle, Filter 
} from 'lucide-react';

interface Log {
  Id: number;
  UsuarioId: number | null;
  UsuarioNome: string;
  Acao: string;
  Entidade: string;
  EntidadeId: number | null;
  Detalhes: string;
  DataHora: string;
}

export function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<string>('TODAS');

  const carregarLogs = async () => {
    try {
      const res = await apiFetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      const correspondePesquisa = 
        log.UsuarioNome.toLowerCase().includes(pesquisa.toLowerCase()) ||
        log.Detalhes.toLowerCase().includes(pesquisa.toLowerCase()) ||
        log.Entidade.toLowerCase().includes(pesquisa.toLowerCase());
      
      const correspondeAcao = filtroAcao === 'TODAS' || log.Acao === filtroAcao;

      return correspondePesquisa && correspondeAcao;
    });
  }, [logs, pesquisa, filtroAcao]);

  const getCorAcao = (acao: string) => {
    switch (acao) {
      case 'CRIAR': return 'bg-green-50 text-green-700 ring-1 ring-green-200';
      case 'EDITAR': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'APAGAR': return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
  };

  const getIconeAcao = (acao: string) => {
    switch (acao) {
      case 'CRIAR': return <PlusCircle size={14} />;
      case 'EDITAR': return <Edit3 size={14} />;
      case 'APAGAR': return <Trash2 size={14} />;
      default: return <History size={14} />;
    }
  };

  if (loading) {
    return (
      <main className="w-full mx-auto p-4 lg:p-8 mt-2">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar logs de auditoria...
        </div>
      </main>
    );
  }

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl shadow-xl p-6 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <ShieldAlert size={22} />
              </div>
              <h2 className="text-2xl font-bold">Logs de Auditoria</h2>
            </div>
            <p className="text-purple-100 text-sm">Registo completo de todas as ações realizadas no sistema.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <p className="text-xs text-purple-200 font-medium uppercase tracking-wider">Total de Registos</p>
            <p className="text-3xl font-bold mt-1">{logs.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por utilizador, detalhe ou entidade..."
              className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="text-gray-400" size={18} />
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue w-full md:w-auto font-semibold text-gray-700"
            >
              <option value="TODAS">Todas as Ações</option>
              <option value="CRIAR">Apenas Criação</option>
              <option value="EDITAR">Apenas Edição</option>
              <option value="APAGAR">Apenas Eliminação</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {logsFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <History size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">Nenhum registo encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Data / Hora</th>
                  <th className="px-6 py-4 font-bold">Utilizador</th>
                  <th className="px-6 py-4 font-bold">Ação</th>
                  <th className="px-6 py-4 font-bold">Entidade</th>
                  <th className="px-6 py-4 font-bold">Detalhes</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {logsFiltrados.map((log) => (
                  <tr key={log.Id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {log.DataHora}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 font-semibold text-gray-800">
                        <User size={14} className="text-gray-400" />
                        {log.UsuarioNome}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getCorAcao(log.Acao)}`}>
                        {getIconeAcao(log.Acao)} {log.Acao}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {log.Entidade} #{log.EntidadeId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {log.Detalhes}
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