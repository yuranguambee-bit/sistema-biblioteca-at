import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, BookMarked, History, ArrowRight, 
  Sun, Clock, AlertTriangle, BellRing, Calendar,
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
  
  const dataAtual = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const dataFormatada = dataAtual.charAt(0).toUpperCase() + dataAtual.slice(1);
  const horaAtual = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <main className="max-w-6xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      
      {/* 1. BANNER DE BOAS-VINDAS (Exatamente igual ao Admin) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0a2f5e] to-[#004d99] rounded-3xl shadow-xl p-8 md:p-10 mb-6 text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Sun className="text-yellow-400 fill-yellow-400" size={32} />
            </div>
            <div>
              <p className="text-sm text-blue-200 font-medium mb-1">Bom dia,</p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                {user?.nome?.split(' ')[0] || 'Leitor'}!
              </h1>
              <p className="text-blue-100/90 text-sm md:text-base max-w-xl leading-relaxed">
                Bem-vindo ao portal da Biblioteca da Autoridade Tributária de Moçambique. 
                Consulta o catálogo, requisita obras e acompanha as tuas leituras.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-blue-50">
                  <Calendar size={14} /> {dataFormatada}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-blue-50">
                  <Clock size={14} /> {horaAtual}
                </span>
              </div>
            </div>
          </div>

          {/* Cartão lateral de destaque */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center min-w-[220px] flex-shrink-0 shadow-lg">
            <p className="text-xs text-blue-100 font-bold uppercase tracking-wider mb-2">
              Empréstimos Ativos
            </p>
            <p className="text-5xl font-extrabold text-white">
              {emprestimos.length}
            </p>
            <p className="text-xs text-blue-200 mt-2 font-medium">
              obras em teu poder
            </p>
          </div>

        </div>
      </div>

      {/* 2. GRELHA DE CARTÕES (Exatamente igual ao Admin) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Cartão 1: Catálogo */}
        <Link to="/catalogo" className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-1">Catálogo</span>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-extrabold text-slate-800">{totalDisponiveis}</p>
            <p className="text-sm font-semibold text-slate-600 mt-1">Obras Disponíveis</p>
          </div>
        </Link>

        {/* Cartão 2: Histórico */}
        <Link to="/meu-historico" className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <History size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-1">Histórico</span>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-extrabold text-slate-800">{totalHistorico}</p>
            <p className="text-sm font-semibold text-slate-600 mt-1">Já Devolvidos</p>
          </div>
        </Link>

        {/* Cartão 3: Empréstimos Ativos */}
        <Link to="/meus-emprestimos" className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <BookMarked size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-1">Ativos</span>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-extrabold text-slate-800">{emprestimos.length}</p>
            <p className="text-sm font-semibold text-slate-600 mt-1">Empréstimos</p>
          </div>
        </Link>

        {/* Cartão 4: Reservas / Fila */}
        <Link to="/meus-emprestimos" className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
              <BellRing size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mt-1">Fila</span>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-extrabold text-slate-800">{requisicoes.length}</p>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-slate-600 mt-1">Reservas</p>
              <ArrowRight size={14} className="text-slate-400 mt-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

      </div>

      {/* 3. ALERTAS (Agora colocados abaixo dos cartões) */}
      {(requisicoes.length > 0 || totalAtrasados > 0) && (
        <div className="space-y-4 mb-6">
          {requisicoes.length > 0 && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                <BellRing className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900">
                  Tens {requisicoes.length} livro(s) à tua espera!
                </h3>
                <p className="text-sm text-blue-800 mt-1">
                  {requisicoes.map(r => `"${r.Obra}"`).join(', ')}. <br className="hidden sm:block"/>
                  Por favor, dirige-te à biblioteca para efetuares o levantamento.
                </p>
                <Link to="/meus-emprestimos" className="inline-flex items-center gap-1.5 mt-2 text-blue-700 font-bold text-xs hover:underline">
                  Ver detalhes <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {totalAtrasados > 0 && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-900">
                  Atenção: {totalAtrasados} empréstimo(s) em atraso
                </h3>
                <p className="text-sm text-rose-800 mt-1">
                  Por favor, dirige-te à biblioteca para devolver as obras e evitar multas.
                </p>
                <Link to="/meus-emprestimos" className="inline-flex items-center gap-1.5 mt-2 text-rose-700 font-bold text-xs hover:underline">
                  Resolver agora <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. LISTA DE EMPRÉSTIMOS ATIVOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
              <Clock className="text-slate-500" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Os teus Empréstimos Atuais</h3>
              <p className="text-xs text-slate-500">Acompanha os prazos de devolução</p>
            </div>
          </div>
          {emprestimos.length > 0 && (
            <Link to="/meus-emprestimos" className="hidden sm:flex items-center gap-1 text-xs font-bold text-at-blue hover:underline">
              Ver todos <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-at-blue rounded-full animate-spin mx-auto mb-3"></div>
            A carregar...
          </div>
        ) : emprestimos.length === 0 ? (
          <div className="p-12 text-center">
            <BookMarked size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-700 font-bold">Não tens empréstimos ativos.</p>
            <p className="text-sm text-slate-500 mt-1 mb-5">Explora o catálogo e requisita o teu próximo livro.</p>
            <Link to="/catalogo" className="inline-flex items-center gap-2 bg-at-blue text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-at-blue-light transition-colors text-sm shadow-sm">
              <BookOpen size={16} /> Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {emprestimos.slice(0, 3).map((emp) => {
              const atrasado = emp.DiasAtraso > 0;
              return (
                <div key={emp.Id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm ${atrasado ? 'bg-red-500' : 'bg-at-blue'}`}>
                      <BookOpen size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate text-sm">{emp.Obra}</p>
                      <p className="text-xs text-slate-500 truncate">{emp.Autor || 'Autor desconhecido'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Devolver até</p>
                      <p className={`text-sm font-bold ${atrasado ? 'text-red-600' : 'text-slate-700'}`}>
                        {emp.DataPrevistaDevolucao}
                      </p>
                    </div>
                    {atrasado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                        <AlertTriangle size={12} /> {emp.DiasAtraso} dias
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                        <CheckCircle2 size={12} /> Em dia
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}