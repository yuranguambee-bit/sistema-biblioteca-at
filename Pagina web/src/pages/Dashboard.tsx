import { useState, useEffect } from 'react';
import { Obra } from '../types';
import { apiFetch } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { 
  BookOpen, CheckCircle, BookMarked, BarChart3, PieChart, 
  ArrowRight, Clock, Bookmark, AlertTriangle, 
  UserPlus, Building2, Users, TrendingUp, Award,
  Sparkles, Calendar, Library
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
interface TopObra {
  Id: number;
  Titulo: string;
  Autor: string | null;
  TotalEmprestimos: number;
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
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [stats, setStats] = useState<Estatisticas>({ 
    totalObras: 0, disponiveis: 0, emprestimosAtivos: 0, reservasPendentes: 0, emprestimosAtrasados: 0 
  });
  const [graficos, setGraficos] = useState<Graficos>({ emprestimosPorMes: [], obrasPorStatus: [] });
  const [topObras, setTopObras] = useState<TopObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [horaAtual, setHoraAtual] = useState(new Date());

  useEffect(() => {
    apiFetch('/api/obras').then((r) => r.json())
      .then((data) => { setObras(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e) => { console.error(e); setLoading(false); });

    apiFetch('/api/estatisticas').then((r) => r.json())
      .then((data) => setStats(data)).catch((e) => console.error(e));

    apiFetch('/api/estatisticas/graficos').then((r) => r.json())
      .then((data) => setGraficos({
        emprestimosPorMes: data.emprestimosPorMes || [],
        obrasPorStatus: data.obrasPorStatus || []
      })).catch((e) => console.error(e));

    apiFetch('/api/dashboard/top-obras').then((r) => r.json())
      .then((data) => setTopObras(Array.isArray(data) ? data : []))
      .catch((e) => console.error(e));

    const timer = setInterval(() => setHoraAtual(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const hora = horaAtual.getHours();
  let saudacao = 'Bom dia';
  let emoji = '☀️';
  if (hora >= 12 && hora < 19) { saudacao = 'Boa tarde'; emoji = '🌤️'; }
  else if (hora >= 19 || hora < 6) { saudacao = 'Boa noite'; emoji = '🌙'; }

  const primeiroNome = (user?.nome || 'Utilizador').split(' ')[0];

  const formatarMes = (mes: string) => {
    const [ano, m] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[Number(m) - 1]}/${ano.slice(2)}`;
  };

  const dataAtual = horaAtual.toLocaleDateString('pt-PT', { 
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  const horaFormatada = horaAtual.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const dadosPie = graficos.obrasPorStatus.map(d => ({
    ...d,
    name: d.name === 'DISPONIVEL' ? 'Disponíveis' : 'Emprestados'
  }));

  const percentualDisponivel = stats.totalObras > 0 
    ? Math.round((stats.disponiveis / stats.totalObras) * 100) 
    : 0;

  const atrasados = stats.emprestimosAtrasados || 0;

  return (
      <main className="max-w-7xl mx-auto p-6 mt-6 animate-fade-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-3xl shadow-2xl p-8 mb-8 text-white animate-fade-down">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-white/5 rounded-full -mb-24"></div>
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full"></div>

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl">
                {emoji}
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium">{saudacao},</p>
                <h1 className="text-3xl font-bold">{primeiroNome}!</h1>
              </div>
            </div>
            <p className="text-blue-100 text-sm max-w-2xl">
              Bem-vindo ao painel de gestão da Biblioteca da Autoridade Tributária de Moçambique. 
              Aqui tens uma visão geral do sistema em tempo real.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-blue-200">
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                <Calendar size={12} /> <span className="capitalize">{dataAtual}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                <Clock size={12} /> {horaFormatada}
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-5 border border-white/20 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="text-yellow-300" size={18} />
              <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Taxa de Disponibilidade</p>
            </div>
            <p className="text-5xl font-bold">{percentualDisponivel}%</p>
            <p className="text-xs text-blue-200 mt-2">
              {stats.disponiveis} de {stats.totalObras} obras prontas
            </p>
          </div>
        </div>
      </div>

      {atrasados > 0 && (
        <Link 
          to="/emprestimos"
          className="block bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5 mb-8 hover:shadow-xl transition-all duration-200 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <AlertTriangle className="text-white animate-pulse" size={26} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-700">
                Atenção: {atrasados} empréstimo{atrasados > 1 ? 's' : ''} em atraso
              </h3>
              <p className="text-sm text-red-600 mt-1">
                Existem obras que já ultrapassaram o prazo de devolução. Clica para gerires.
              </p>
            </div>
            <ArrowRight className="text-red-600 group-hover:translate-x-2 transition-transform" size={28} />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6 relative overflow-hidden cursor-pointer">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="text-at-blue" size={24} />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">CATÁLOGO</span>
            </div>
            <p className="text-5xl font-bold text-at-blue leading-none">{stats.totalObras}</p>
            <p className="text-sm text-gray-500 mt-2 font-medium">Total de Obras</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6 relative overflow-hidden cursor-pointer">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">PRONTAS</span>
            </div>
            <p className="text-5xl font-bold text-green-600 leading-none">{stats.disponiveis}</p>
            <p className="text-sm text-gray-500 mt-2 font-medium">Disponíveis</p>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6 relative overflow-hidden cursor-pointer">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <BookMarked className="text-red-600" size={24} />
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">ATIVOS</span>
            </div>
            <p className="text-5xl font-bold text-red-600 leading-none">{stats.emprestimosAtivos}</p>
            <p className="text-sm text-gray-500 mt-2 font-medium">Empréstimos</p>
          </div>
        </div>

        <Link to="/reservas" className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6 relative overflow-hidden block">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-yellow-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Bookmark className="text-yellow-600" size={24} />
              </div>
              <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">FILA</span>
            </div>
            <p className="text-5xl font-bold text-yellow-600 leading-none">{stats.reservasPendentes || 0}</p>
            <p className="text-sm text-gray-500 mt-2 font-medium flex items-center gap-1">
              Reservas <ArrowRight size={12} />
            </p>
          </div>
        </Link>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-at-blue mb-4 flex items-center gap-2">
          <Sparkles size={20} /> Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link to="/cadastrar-obra"
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="text-at-blue" size={22} />
            </div>
            <p className="text-xs font-bold text-gray-700">Nova Obra</p>
          </Link>

          <Link to="/cadastrar-autor"
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UserPlus className="text-purple-600" size={22} />
            </div>
            <p className="text-xs font-bold text-gray-700">Novo Autor</p>
          </Link>

          <Link to="/cadastrar-editora"
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Building2 className="text-orange-600" size={22} />
            </div>
            <p className="text-xs font-bold text-gray-700">Nova Editora</p>
          </Link>

          <Link to="/cadastrar-cliente"
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Users className="text-pink-600" size={22} />
            </div>
            <p className="text-xs font-bold text-gray-700">Novo Cliente</p>
          </Link>

          <Link to="/emprestimos"
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookMarked className="text-red-600" size={22} />
            </div>
            <p className="text-xs font-bold text-gray-700">Empréstimo</p>
          </Link>

          <Link to="/relatorios"
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BarChart3 className="text-cyan-600" size={22} />
            </div>
            <p className="text-xs font-bold text-gray-700">Relatórios</p>
          </Link>
        </div>
      </div>

      <h3 className="text-lg font-bold text-at-blue mb-4 flex items-center gap-2">
        <TrendingUp size={20} /> Análise Visual
      </h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Award className="text-yellow-600" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-at-blue">Top 5 Livros Mais Emprestados</h3>
              <p className="text-xs text-gray-400">Obras favoritas dos leitores</p>
            </div>
          </div>
          {topObras.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Award size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Sem dados de empréstimos ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topObras.map((obra, index) => {
                const medalha = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                return (
                  <Link 
                    key={obra.Id} 
                    to={`/obras/${obra.Id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-yellow-50/30 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300' :
                      index === 1 ? 'bg-gray-100 text-gray-600 ring-2 ring-gray-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {medalha}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate group-hover:text-at-blue transition-colors">
                        {obra.Titulo}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {obra.Autor || 'Autor desconhecido'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-at-blue">{obra.TotalEmprestimos}</p>
                      <p className="text-xs text-gray-400">empréstimos</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Library className="text-at-blue" size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-at-blue">Últimas Obras Cadastradas</h3>
                <p className="text-xs text-gray-400">As 5 mais recentes</p>
              </div>
            </div>
            <Link to="/acervo" className="text-xs font-semibold text-at-blue hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">A carregar...</div>
            ) : obras.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">Sem obras cadastradas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {obras.slice(0, 5).map((obra) => (
                  <Link
                    key={obra.Id}
                    to={`/obras/${obra.Id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/30 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white flex-shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate group-hover:text-at-blue transition-colors">
                        {obra.Titulo}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {obra.Autor} {obra.Ano && `· ${obra.Ano}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                      obra.Status === 'DISPONIVEL' 
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200' 
                        : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        obra.Status === 'DISPONIVEL' ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      {obra.Status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}