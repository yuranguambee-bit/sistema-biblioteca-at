import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, BookMarked, History, ArrowRight, 
  Sparkles, Clock, AlertTriangle, TrendingUp, BellRing,
  CheckCircle2, ChevronRight
} from 'lucide-react';

interface Emprestimo {
  Id: number;
  Obra: string;
  Autor: string | null;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DiasAtraso: number;
}

interface Requisicao {
  Id: number;
  Obra: string;
  Autor: string | null;
  DataReserva: string;
}

export function PortalHome() {
  const { user } = useAuth();
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [totalDisponiveis, setTotalDisponiveis] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/portal/meus-emprestimos').then((r) => r.json()),
      apiFetch('/api/portal/meu-historico').then((r) => r.json()),
      apiFetch('/api/obras/disponiveis').then((r) => r.json()),
      apiFetch('/api/portal/minhas-requisicoes').then((r) => r.json()),
    ])
      .then(([dEmp, dHist, dDisp, dReq]) => {
        setEmprestimos(Array.isArray(dEmp) ? dEmp : []);
        setTotalHistorico(Array.isArray(dHist) ? dHist.length : 0);
        setTotalDisponiveis(Array.isArray(dDisp) ? dDisp.length : 0);
        setRequisicoes(Array.isArray(dReq) ? dReq : []);
        setLoading(false);
      })
      .catch((e) => { console.error(e); setLoading(false); });
  }, []);

  const totalAtrasados = emprestimos.filter((e) => e.DiasAtraso > 0).length;

  return (
    <main className="max-w-6xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      
      {/* HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1B3D] via-[#1A365D] to-[#0B1B3D] rounded-3xl shadow-2xl p-8 md:p-12 mb-8 text-white">
        {/* Elementos decorativos (Glassmorphism) */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl -mb-32"></div>
        <div className="absolute top-1/2 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl -ml-20"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-5 shadow-sm">
            <Sparkles size={14} className="text-yellow-300" />
            <span className="text-xs font-semibold text-white tracking-wide uppercase">
              Portal do Leitor
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">
            Olá, {user?.nome?.split(' ')[0] || 'Leitor'} <span className="inline-block hover:animate-wave origin-bottom-right">👋</span>
          </h1>
          <p className="text-blue-100/90 text-base md:text-lg max-w-2xl font-light leading-relaxed">
            Bem-vindo à Biblioteca da AT Moçambique. Explora o catálogo, requisita novas obras e acompanha as tuas leituras num só lugar.
          </p>
        </div>
      </div>

      {/* ALERTAS */}
      <div className="space-y-4 mb-8">
        {requisicoes.length > 0 && (
          <div className="group relative overflow-hidden bg-blue-50/50 backdrop-blur-sm border border-blue-100 rounded-2xl p-5 flex items-start gap-4 transition-all hover:bg-blue-50 hover:shadow-md hover:shadow-blue-100/50">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-2xl"></div>
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <BellRing className="text-white" size={22} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                Tens {requisicoes.length} livro(s) à tua espera!
              </h3>
              <p className="text-sm text-blue-800/80 mt-1 leading-relaxed">
                {requisicoes.map(r => `"${r.Obra}"`).join(', ')}. <br className="hidden sm:block"/>
                Por favor, dirige-te à biblioteca para efetuares o levantamento.
              </p>
              <Link to="/meus-emprestimos" className="inline-flex items-center gap-1.5 mt-3 text-blue-700 font-semibold text-sm hover:text-blue-800 transition-colors">
                Ver detalhes <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        )}

        {totalAtrasados > 0 && (
          <div className="group relative overflow-hidden bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-2xl p-5 flex items-start gap-4 transition-all hover:bg-rose-50 hover:shadow-md hover:shadow-rose-100/50">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-l-2xl"></div>
            <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <AlertTriangle className="text-white" size={22} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-rose-900">
                Atenção: {totalAtrasados} empréstimo(s) em atraso
              </h3>
              <p className="text-sm text-rose-800/80 mt-1 leading-relaxed">
                Devolve as obras o mais breve possível para evitares multas adicionais.
              </p>
              <Link to="/meus-emprestimos" className="inline-flex items-center gap-1.5 mt-3 text-rose-700 font-semibold text-sm hover:text-rose-800 transition-colors">
                Resolver agora <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* CARTÕES DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Link to="/meus-emprestimos" className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 shadow-inner group-hover:scale-110 transition-transform">
              <BookMarked size={26} strokeWidth={2.5} />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
              <ArrowRight size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:-rotate-45 transition-all duration-300" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-extrabold text-slate-800 tracking-tight">{emprestimos.length}</p>
            <p className="text-sm font-bold text-slate-700 mt-1">Empréstimos Ativos</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Obras que tens em mãos</p>
          </div>
        </Link>

        <Link to="/catalogo" className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
              <BookOpen size={26} strokeWidth={2.5} />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
              <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-500 group-hover:-rotate-45 transition-all duration-300" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-extrabold text-slate-800 tracking-tight">{totalDisponiveis}</p>
            <p className="text-sm font-bold text-slate-700 mt-1">Obras Disponíveis</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Prontas a requisitar</p>
          </div>
        </Link>

        <Link to="/meu-historico" className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
              <History size={26} strokeWidth={2.5} />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
              <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:-rotate-45 transition-all duration-300" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-extrabold text-slate-800 tracking-tight">{totalHistorico}</p>
            <p className="text-sm font-bold text-slate-700 mt-1">Livros no Histórico</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Já devolvidos</p>
          </div>
        </Link>
      </div>

      {/* LISTA DE EMPRÉSTIMOS ATIVOS */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100/50">
              <Clock className="text-orange-500" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Os teus Empréstimos</h3>
              <p className="text-sm text-slate-500 font-medium">Acompanha os prazos de devolução</p>
            </div>
          </div>
          {emprestimos.length > 0 && (
            <Link to="/meus-emprestimos" className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-at-blue hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-xl">
              Ver todos <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-at-blue rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">A carregar os teus dados...</p>
          </div>
        ) : emprestimos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookMarked size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-800 font-bold text-lg">Não tens empréstimos ativos.</p>
            <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">Explora o nosso catálogo e requisita o teu próximo livro favorito.</p>
            <Link to="/catalogo" className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-at-blue-light hover:shadow-lg hover:shadow-at-blue/20 transition-all">
              <BookOpen size={18} /> Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {emprestimos.slice(0, 3).map((emp) => {
              const atrasado = emp.DiasAtraso > 0;
              return (
                <div key={emp.Id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm ${atrasado ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-at-blue to-blue-700'}`}>
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate text-base group-hover:text-at-blue transition-colors">{emp.Obra}</p>
                      <p className="text-sm text-slate-500 truncate font-medium">{emp.Autor || 'Autor desconhecido'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Devolver até</p>
                      <p className={`text-sm font-bold ${atrasado ? 'text-rose-600' : 'text-slate-700'}`}>
                        {emp.DataPrevistaDevolucao}
                      </p>
                    </div>
                    {atrasado ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                        <AlertTriangle size={14} /> {emp.DiasAtraso} dia(s)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                        <CheckCircle2 size={14} /> Em dia
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMO FUNCIONA */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1A365D] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/10 shadow-inner">
            <TrendingUp size={28} className="text-blue-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Como funciona a requisição?</h3>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border border-blue-400/30">1</div>
                <p className="text-sm text-blue-100/80 leading-relaxed">Encontra o livro no <Link to="/catalogo" className="font-bold text-white hover:underline decoration-blue-400 decoration-2 underline-offset-2">Catálogo</Link></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border border-blue-400/30">2</div>
                <p className="text-sm text-blue-100/80 leading-relaxed">Clica em <strong className="text-white">"Requisitar"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border border-blue-400/30">3</div>
                <p className="text-sm text-blue-100/80 leading-relaxed">Levanta na biblioteca</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}