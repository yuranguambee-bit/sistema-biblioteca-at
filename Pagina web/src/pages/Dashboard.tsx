import { useState, useEffect } from 'react';
import { Obra } from '../types';
import { apiFetch } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { 
  BookOpen, CheckCircle, BookMarked, BarChart3, PieChart, 
  ArrowRight, Clock, Bookmark, AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Estatisticas { 
  totalObras: number; 
  disponiveis: number; 
  emprestimosAtivos: number;
  reservasPendentes?: number;
  emprestimosAtrasados?: number;
}
interface Graficos {
  emprestimosPorMes: { Mes: string; Total: number }[];
  obrasPorStatus: { name: string; value: number }[];
}

const CORES_STATUS: { [key: string]: string } = {
  'DISPONIVEL': '#10b981',
  'EMPRESTADO': '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-3">
        <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [stats, setStats] = useState<Estatisticas>({ 
    totalObras: 0, disponiveis: 0, emprestimosAtivos: 0, reservasPendentes: 0, emprestimosAtrasados: 0 
  });
  const [graficos, setGraficos] = useState<Graficos>({ emprestimosPorMes: [], obrasPorStatus: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/obras')
      .then((r) => r.json())
      .then((data) => { setObras(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e) => { console.error(e); setLoading(false); });

    apiFetch('/api/estatisticas')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch((e) => console.error(e));

    apiFetch('/api/estatisticas/graficos')
      .then((r) => r.json())
      .then((data) => setGraficos({
        emprestimosPorMes: data.emprestimosPorMes || [],
        obrasPorStatus: data.obrasPorStatus || []
      }))
      .catch((e) => console.error(e));
  }, []);

  const formatarMes = (mes: string) => {
    const [ano, m] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[Number(m) - 1]}/${ano.slice(2)}`;
  };

  const dataAtual = new Date().toLocaleDateString('pt-PT', { 
    weekday: 'long', day: '2-digit', month: 'long'
  });

  const dadosPie = graficos.obrasPorStatus.map(d => ({
    ...d,
    name: d.name === 'DISPONIVEL' ? 'Disponíveis' : 'Emprestados'
  }));

  const percentualDisponivel = stats.totalObras > 0 
    ? Math.round((stats.disponiveis / stats.totalObras) * 100) 
    : 0;

  const atrasados = stats.emprestimosAtrasados || 0;

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-8 mb-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-white/5 rounded-full -mb-20"></div>
        
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-blue-200 text-sm font-medium capitalize mb-2">{dataAtual}</p>
            <h2 className="text-3xl font-bold mb-2">Bem-vindo à Biblioteca</h2>
            <p className="text-blue-100 text-sm max-w-lg">
              Gere o acervo bibliográfico da Autoridade Tributária de Moçambique de forma simples e eficiente.
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
              <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Taxa de Disponibilidade</p>
              <p className="text-3xl font-bold mt-1">{percentualDisponivel}%</p>
            </div>
          </div>
        </div>
      </div>

      {atrasados > 0 && (
        <Link 
          to="/emprestimos"
          className="block bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-2xl p-5 mb-8 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <AlertTriangle className="text-white animate-pulse" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-700">
                ⚠️ {atrasados} empréstimo(s) em atraso
              </h3>
              <p className="text-sm text-red-600 mt-1">
                Existem obras que já ultrapassaram o prazo de devolução. Clica para ver e resolver.
              </p>
            </div>
            <ArrowRight className="text-red-600 group-hover:translate-x-1 transition-transform" size={24} />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="text-at-blue" size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Obras</p>
            </div>
            <p className="text-4xl font-bold text-at-blue">{stats.totalObras}</p>
            <p className="text-xs text-gray-400 mt-2">obras no catálogo</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disponíveis</p>
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.disponiveis}</p>
            <p className="text-xs text-gray-400 mt-2">prontas para empréstimo</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                <BookMarked className="text-red-600" size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Empréstimos</p>
            </div>
            <p className="text-4xl font-bold text-red-600">{stats.emprestimosAtivos}</p>
            <p className="text-xs text-gray-400 mt-2">em curso neste momento</p>
          </div>
        </div>

        <Link to="/reservas" className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 relative overflow-hidden block">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Bookmark className="text-yellow-600" size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reservas</p>
            </div>
            <p className="text-4xl font-bold text-yellow-600">{stats.reservasPendentes || 0}</p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              em fila de espera <ArrowRight size={12} />
            </p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="text-at-blue" size={18} />
              </div>
              <div>
                <h4 className="text-base font-bold text-at-blue">Empréstimos por Mês</h4>
                <p className="text-xs text-gray-400">Últimos 6 meses</p>
              </div>
            </div>
          </div>
          {graficos.emprestimosPorMes.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-300">
              <BarChart3 size={56} className="mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-400">Sem empréstimos registados</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                data={graficos.emprestimosPorMes.map(d => ({ ...d, Mes: formatarMes(d.Mes) }))}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#003366" stopOpacity={1} />
                    <stop offset="100%" stopColor="#004080" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="Mes" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                <Bar dataKey="Total" fill="url(#gradBar)" radius={[10, 10, 0, 0]} name="Empréstimos" maxBarSize={55} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <PieChart className="text-purple-600" size={18} />
            </div>
            <div>
              <h4 className="text-base font-bold text-at-blue">Estado das Obras</h4>
              <p className="text-xs text-gray-400">Distribuição atual</p>
            </div>
          </div>
          {dadosPie.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-300">
              <PieChart size={56} className="mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-400">Sem obras cadastradas</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie data={dadosPie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} fill="#8884d8" dataKey="value" stroke="none">
                    {dadosPie.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_STATUS[graficos.obrasPorStatus[index]?.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2">
                {dadosPie.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_STATUS[graficos.obrasPorStatus[index]?.name] || '#8884d8' }}></span>
                      <span className="text-gray-600 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-bold text-gray-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="text-at-blue" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-at-blue">Últimas Obras Cadastradas</h3>
              <p className="text-xs text-gray-400">As 5 mais recentes do catálogo</p>
            </div>
          </div>
          <Link to="/acervo" className="flex items-center gap-1 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors">
            Ver todo o acervo <ArrowRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">A carregar dados...</div>
          ) : obras.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sem obras cadastradas</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Título</th>
                  <th className="px-6 py-4 font-bold">Autor</th>
                  <th className="px-6 py-4 font-bold">Editora</th>
                  <th className="px-6 py-4 font-bold text-center">Ano</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {obras.slice(0, 5).map((obra) => (
                  <tr key={obra.Id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{obra.Titulo}</td>
                    <td className="px-6 py-4 text-gray-600">{obra.Autor}</td>
                    <td className="px-6 py-4 text-gray-600">{obra.Editora || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{obra.Ano}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        obra.Status === 'DISPONIVEL' 
                          ? 'bg-green-50 text-green-700 ring-1 ring-green-200' 
                          : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          obra.Status === 'DISPONIVEL' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        {obra.Status}
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