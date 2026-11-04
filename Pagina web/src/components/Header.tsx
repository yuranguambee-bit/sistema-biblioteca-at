import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  LogOut, User, BookOpen, Home, 
  Library, BookMarked, History
} from 'lucide-react';
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
  const isCliente = user?.role === 'Cliente';

  useEffect(() => {
    if (isCliente) return;
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
  }, [temPermissao, isCliente]);

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

  const linkClasses = "px-3 py-4 hover:bg-white/10 transition-colors text-[14px] font-medium flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent hover:border-white";

  const TopBar = () => (
    <div className="bg-white text-[#004B93] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <img src="/logo-at.png" alt="Logotipo AT" className="h-14 w-auto object-contain" />
          <div className="hidden md:block border-l border-gray-300 pl-4">
            <h1 className="text-xl font-bold leading-tight uppercase tracking-wide">Autoridade Tributária</h1>
            <p className="text-sm font-semibold text-gray-500">de Moçambique</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Notificacoes />
          <div className="w-px h-8 bg-gray-200"></div>
          
          <Link to="/perfil" className="flex items-center gap-3 hover:opacity-70 transition-opacity cursor-pointer" title="Ver o meu perfil">
            <div className="w-9 h-9 rounded-full bg-[#004B93] text-white flex items-center justify-center shadow-sm">
              <User size={18} />
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-gray-800 leading-tight">{user?.nome || 'Utilizador'}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </Link>
          
          <button onClick={handleLogout} className="ml-2 flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors text-sm font-semibold border border-transparent hover:border-red-100" title="Terminar sessão">
            <LogOut size={16} /> <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  const NavBar = () => (
    <div className="bg-[#004B93] text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-hide">
        <nav className="flex items-center gap-1">
          {isCliente ? (
            <>
              <Link to="/" className={linkClasses}><Home size={16} /> Início</Link>
              <Link to="/catalogo" className={linkClasses}><Library size={16} /> Catálogo</Link>
              {/* ALTERAÇÃO AQUI: "Empréstimos" em vez de "Meus Empréstimos" */}
              <Link to="/meus-emprestimos" className={linkClasses}><BookMarked size={16} /> Empréstimos</Link>
              {/* ALTERAÇÃO AQUI: "Histórico" em vez de "Meu Histórico" */}
              <Link to="/meu-historico" className={linkClasses}><History size={16} /> Histórico</Link>
              <Link to="/manual" className={linkClasses}><BookOpen size={16} /> Manual</Link>
            </>
          ) : (
            <>
              <Link to="/" className={linkClasses}><Home size={16} /> Início</Link>
              {temPermissao('obras') && <Link to="/cadastrar-obra" className={linkClasses}>Obras</Link>}
              {temPermissao('autores') && <Link to="/cadastrar-autor" className={linkClasses}>Autores</Link>}
              {temPermissao('clientes') && <Link to="/clientes" className={linkClasses}>Clientes</Link>}
              {temPermissao('editoras') && <Link to="/cadastrar-editora" className={linkClasses}>Editoras</Link>}
              {temPermissao('emprestimos') && (
                <Link to="/emprestimos" className={`${linkClasses} relative`}>
                  Empréstimos
                  {atrasados > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center animate-pulse ml-1">
                      {atrasados}
                    </span>
                  )}
                </Link>
              )}
              {temPermissao('reservas') && <Link to="/reservas" className={linkClasses}>Reservas</Link>}
              {temPermissao('historico') && <Link to="/historico" className={linkClasses}>Histórico</Link>}
              {temPermissao('acervo') && <Link to="/acervo" className={linkClasses}>Acervo</Link>}
              {temPermissao('relatorios') && <Link to="/relatorios" className={linkClasses}>Relatórios</Link>}
              {temPermissao('manual') && <Link to="/manual" className={linkClasses}>Manual</Link>}
              {isAdmin && (
                <>
                  <Link to="/utilizadores" className={linkClasses}>Utilizadores</Link>
                  <Link to="/permissoes" className={linkClasses}>Permissões</Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </div>
  );

  return (
    <header className="relative z-50 flex flex-col shadow-md print:hidden">
      <TopBar />
      <NavBar />
    </header>
  );
}