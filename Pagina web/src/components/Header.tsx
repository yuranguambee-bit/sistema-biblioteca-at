import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, User, BookOpen, ShieldCheck, Home, FileClock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../services/api';
import { Notificacoes } from './Notificacoes';

export function Header() {
  const { user, logout, temPermissao } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [atrasados, setAtrasados] = useState(0);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (!temPermissao('emprestimos')) return;

    const carregarAtrasados = () => {
      apiFetch('/api/estatisticas')
        .then((r) => r.json())
        .then((data) => setAtrasados(data.emprestimosAtrasados || 0))
        .catch((e) => console.error(e));
    };

    carregarAtrasados();
    const intervalo = setInterval(carregarAtrasados, 30000);
    return () => clearInterval(intervalo);
  }, [temPermissao]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Terminar Sessão',
      message: 'Tens a certeza que queres sair do sistema?',
      confirmText: 'Sair',
      cancelText: 'Ficar',
      variant: 'warning',
    });

    if (ok) {
      logout();
      showToast('Sessão terminada com sucesso.', 'info');
      navigate('/login');
    }
  };

  const linkClasses = "px-2.5 py-2 rounded-md hover:bg-white/10 hover:text-yellow-300 transition-colors text-[15px] font-semibold flex items-center gap-1.5 whitespace-nowrap";

  return (
    <header className="relative z-50 bg-gradient-to-b from-at-blue to-at-blue-light text-white shadow-md print:hidden">
      <div className="flex flex-col items-center justify-center py-5 px-4">
        <div className="w-20 h-20 mb-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center p-2.5 shadow-2xl hover:scale-105 transition-transform duration-300">
          <img src="/logo-at.png" alt="Logotipo da Autoridade Tributária de Moçambique" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-center leading-tight">Autoridade Tributária de Moçambique</h1>
        <p className="text-sm text-blue-200 font-semibold tracking-[0.15em] uppercase mt-1.5">Sistema de Gestão de Biblioteca</p>
      </div>

      <div className="bg-at-blue-light/70 backdrop-blur-sm border-t border-blue-400/20 px-3">
        <div className="flex items-center justify-between gap-2 py-1.5 w-full">
          <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
            <Link to="/" className={linkClasses}><Home size={16} /> Início</Link>

            {temPermissao('obras') && <Link to="/cadastrar-obra" className={linkClasses}>Obras</Link>}
            {temPermissao('autores') && <Link to="/cadastrar-autor" className={linkClasses}>Autores</Link>}
            {temPermissao('clientes') && <Link to="/clientes" className={linkClasses}>Clientes</Link>}
            {temPermissao('editoras') && <Link to="/cadastrar-editora" className={linkClasses}>Editoras</Link>}
            
            {temPermissao('emprestimos') && (
              <Link to="/emprestimos" className={`${linkClasses} relative`}>
                Empréstimos
                {atrasados > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center animate-pulse">
                    {atrasados}
                  </span>
                )}
              </Link>
            )}

            {temPermissao('reservas') && <Link to="/reservas" className={linkClasses}>Reservas</Link>}
            {temPermissao('historico') && <Link to="/historico" className={linkClasses}>Histórico</Link>}
            {temPermissao('acervo') && <Link to="/acervo" className={linkClasses}>Acervo</Link>}
            {temPermissao('relatorios') && <Link to="/relatorios" className={linkClasses}>📊 Relatórios</Link>}

            {temPermissao('manual') && (
              <Link to="/manual" className={linkClasses}><BookOpen size={16} /> Manual</Link>
            )}

            {isAdmin && (
              <>
                <Link to="/utilizadores" className={`${linkClasses} text-yellow-200`}>🔐 Utilizadores</Link>
                <Link to="/permissoes" className={`${linkClasses} text-yellow-200`}><ShieldCheck size={16} /> Permissões</Link>
                <Link to="/logs" className={`${linkClasses} text-yellow-200`}><FileClock size={16} /> Logs</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-1.5 py-1 shadow-md flex-shrink-0">
            <Notificacoes />
            <div className="w-px h-5 bg-white/20"></div>
            <Link to="/perfil" className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-1 rounded-full transition-colors" title="Ver o meu perfil">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-at-blue to-blue-700 flex items-center justify-center shadow ring-1 ring-white/20">
                <User size={12} />
              </div>
              <span className="hidden xl:inline font-semibold text-xs text-white whitespace-nowrap">
                {user?.nome?.split(' ')[0] || 'Utilizador'}
              </span>
              <span className={`hidden xl:inline px-1.5 rounded text-[9px] font-bold ${isAdmin ? 'bg-yellow-400 text-black' : 'bg-blue-400 text-white'}`}>
                {user?.role}
              </span>
            </Link>
            <div className="w-px h-5 bg-white/20"></div>
            <button onClick={handleLogout} className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/50 px-2.5 py-1 rounded-full transition-colors text-xs font-semibold text-red-100 hover:text-white" title="Terminar sessão">
              <LogOut size={12} /> <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}