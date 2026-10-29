import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, BookMarked, History, ArrowRight, 
  Sparkles, Clock, AlertTriangle, TrendingUp
} from 'lucide-react';

interface Emprestimo {
  Id: number;
  Obra: string;
  Autor: string | null;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DiasAtraso: number;
}

export function PortalHome() {
  const { user } = useAuth();
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [totalDisponiveis, setTotalDisponiveis] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/portal/meus-emprestimos').then((r) => r.json()),
      apiFetch('/api/portal/meu-historico').then((r) => r.json()),
      apiFetch('/api/obras/disponiveis').then((r) => r.json()),
    ])
      .then(([dEmp, dHist, dDisp]) => {
        setEmprestimos(Array.isArray(dEmp) ? dEmp : []);
        setTotalHistorico(Array.isArray(dHist) ? dHist.length : 0);
        setTotalDisponiveis(Array.isArray(dDisp) ? dDisp.length : 0);
        setLoading(false);
      })
      .catch((e) => { console.error(e); setLoading(false); });
  }, []);

  const totalAtrasados = emprestimos.filter((e) => e.DiasAtraso > 0).length;

  return (
    <main className="max-w-6xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      {/* CABEÇALHO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-3xl shadow-2xl p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-white/5 rounded-full -mb-24"></div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-yellow-300" />
            <span className="text-yellow-200 text-sm font-semibold uppercase tracking-wider">
              Portal do Leitor
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Olá, {user?.nome?.split(' ')[0] || 'Leitor'}! 👋
          </h1>
          <p className="text-blue-100 text-base max-w-2xl">
            Bem-vindo ao portal da Biblioteca da AT Moçambique. Aqui podes consultar o catálogo, 
            requisitar obras e acompanhar os teus empréstimos.
          </p>
        </div>
      </div>

      {/* AVISO DE ATRASOS */}
      {totalAtrasados > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <AlertTriangle className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-700">
              Tens {totalAtrasados} empréstimo(s) em atraso
            </h3>
            <p className="text-sm text-red-600 mt-1">
              Por favor, dirige-te à biblioteca para devolver as obras o mais breve possível.
            </p>
            <Link 
              to="/meus-emprestimos" 
              className="inline-flex items-center gap-1 mt-3 text-red-700 font-semibold text-sm hover:underline"
            >
              Ver os meus empréstimos <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* CARTÕES DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/meus-emprestimos"
          className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all p-6 border-l-4 border-orange-400 cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <BookMarked className="text-orange-600" size={22} />
            </div>
            <ArrowRight size={18} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{emprestimos.length}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">Empréstimos Ativos</p>
          <p className="text-xs text-gray-400 mt-0.5">Livros que tens em mãos</p>
        </Link>

        <Link
          to="/catalogo"
          className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all p-6 border-l-4 border-green-400 cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <BookOpen className="text-green-600" size={22} />
            </div>
            <ArrowRight size={18} className="text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalDisponiveis}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">Obras Disponíveis</p>
          <p className="text-xs text-gray-400 mt-0.5">Prontas a requisitar</p>
        </Link>

        <Link
          to="/meu-historico"
          className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all p-6 border-l-4 border-blue-400 cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <History className="text-blue-600" size={22} />
            </div>
            <ArrowRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalHistorico}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">Livros no Histórico</p>
          <p className="text-xs text-gray-400 mt-0.5">Já devolvidos</p>
        </Link>
      </div>

      {/* EMPRÉSTIMOS RECENTES */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="text-orange-600" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-at-blue">Empréstimos Ativos</h3>
              <p className="text-xs text-gray-400">Obras que tens neste momento</p>
            </div>
          </div>
          {emprestimos.length > 0 && (
            <Link
              to="/meus-emprestimos"
              className="text-xs font-semibold text-at-blue hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">A carregar...</div>
        ) : emprestimos.length === 0 ? (
          <div className="p-12 text-center">
            <BookMarked size={56} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-semibold">Não tens empréstimos ativos.</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Que tal explorar o catálogo?</p>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 bg-at-blue text-white px-5 py-2.5 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm"
            >
              <BookOpen size={16} /> Ver Catálogo
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {emprestimos.slice(0, 3).map((emp) => (
              <div key={emp.Id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{emp.Obra}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.Autor || 'Autor desconhecido'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Devolver até</p>
                  <p className={`text-sm font-bold ${emp.DiasAtraso > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {emp.DataPrevistaDevolucao}
                  </p>
                  {emp.DiasAtraso > 0 && (
                    <p className="text-xs text-red-500 font-bold mt-0.5">
                      {emp.DiasAtraso} dia(s) de atraso
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DICA */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-at-blue rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-at-blue flex items-center justify-center text-white flex-shrink-0">
          <TrendingUp size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-at-blue">Como funciona</h3>
          <p className="text-sm text-gray-700 mt-1">
            Encontras um livro no <Link to="/catalogo" className="font-semibold text-at-blue hover:underline">Catálogo</Link> e clicas em <strong>"Requisitar"</strong>. 
            Depois, diriges-te à biblioteca, o bibliotecário confirma a entrega e o empréstimo fica registado no teu nome.
          </p>
        </div>
      </div>
    </main>
  );
}