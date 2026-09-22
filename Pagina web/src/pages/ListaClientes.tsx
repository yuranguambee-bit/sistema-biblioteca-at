import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { Eye, UserPlus, Search, Users } from 'lucide-react';

interface Cliente {
  Id: number;
  Nome: string;
  Email: string | null;
  Telefone: string | null;
}

export function ListaClientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  useEffect(() => {
    apiFetch('/api/clientes')
      .then((r) => r.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => { console.error(e); setLoading(false); });
  }, []);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const p = pesquisa.toLowerCase();
      return (
        c.Nome.toLowerCase().includes(p) ||
        (c.Email && c.Email.toLowerCase().includes(p)) ||
        (c.Telefone && c.Telefone.toLowerCase().includes(p))
      );
    });
  }, [clientes, pesquisa]);

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Users size={22} />
              </div>
              <h2 className="text-2xl font-bold">Clientes</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Gestão e consulta dos leitores da biblioteca.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
              <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total</p>
              <p className="text-3xl font-bold mt-1">{clientes.length}</p>
            </div>
            <Link
              to="/cadastrar-cliente"
              className="bg-white text-at-blue px-5 py-3 rounded-md font-bold hover:bg-blue-50 transition-colors text-sm flex items-center gap-2 shadow-lg"
            >
              <UserPlus size={16} /> Novo Cliente
            </Link>
          </div>
        </div>
      </div>

      {/* Pesquisa */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          🔍 Pesquisar Cliente
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Nome, email ou telefone..."
            className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
          />
        </div>
        {pesquisa && (
          <p className="text-xs text-gray-500 mt-2">
            {clientesFiltrados.length} resultado(s) encontrado(s)
          </p>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">A carregar clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {pesquisa ? 'Nenhum cliente corresponde à pesquisa.' : 'Sem clientes registados.'}
              </p>
              {!pesquisa && (
                <Link
                  to="/cadastrar-cliente"
                  className="inline-flex items-center gap-2 mt-4 bg-at-blue text-white px-5 py-2.5 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
                >
                  <UserPlus size={16} /> Cadastrar Primeiro Cliente
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Nome</th>
                  <th className="px-6 py-4 font-bold">Email</th>
                  <th className="px-6 py-4 font-bold">Telefone</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {cliente.Nome}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {cliente.Email || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {cliente.Telefone || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/clientes/${cliente.Id}`)}
                        className="inline-flex items-center gap-1.5 bg-at-blue text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-at-blue-light transition-colors"
                        title="Ver detalhes e histórico"
                      >
                        <Eye size={14} /> Ver Detalhes
                      </button>
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