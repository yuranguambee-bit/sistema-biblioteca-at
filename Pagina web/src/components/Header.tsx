import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  LogOut, User, BookOpen, Home, 
  Library, BookMarked, History, Menu, X
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
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false);

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
    setMobileMenuAberto(false);
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

  const fecharMenuMobile = () => setMobileMenuAberto(false);

  // Reduzi o padding (px-3 em vez de px-4) e o tamanho (text-[14px]) para caber o "Permissões"
  const linkClasses = "px-3 py-3 hover:bg-white/10 transition-colors text-[14px] font-semibold flex items-center gap-1.5 whitespace-nowrap border-b-[3px] border-transparent hover:border-[#FFC107]";

  return (
    <header className="relative z-50 flex flex-col print:hidden bg-white border-b-[3px] border-[#FFC107]">
      
      {/* TOPBAR (Branca) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-3 flex items-center justify-between w-full">
        
        {/* LOGO E TEXTO */}
        <Link to="/" className="flex items-center gap-3 md:gap-4 hover:opacity-80 transition-opacity">
          <img src="/logo-at.png" alt="Logotipo AT" className="h-[40px] md:h-[50px] w-auto object-contain" />
          
          <div className="h-[30px] md:h-[38px] w-[2px] md:w-[3px] bg-[#002B5C]"></div>

          <div 
            className="flex flex-col justify-center"
            style={{ fontFamily: '"Arial Narrow", "Roboto Condensed", sans-serif' }}
          >
            <h1 className="text-[16px] md:text-[22px] font-bold text-[#002B5C] leading-[1.1] tracking-tight">
              Autoridade Tributária
            </h1>
            <p className="text-[14px] md:text-[20px] font-bold text-[#002B5C] leading-[1.1] tracking-tight">
              de Moçambique
            </p>
          </div>
        </Link>

        {/* ÁREA DIREITA (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <Notificacoes />
          <div className="w-px h-8 bg-gray-200"></div>
          
          <Link to="/perfil" className="flex items-center gap-3 hover:opacity-70 transition-opacity cursor-pointer" title="Ver o meu perfil">
            <div className="w-9 h-9 rounded-full bg-[#004B93] text-white flex items-center justify-center shadow-sm">
              <User size={18} />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800 leading-tight">{user?.nome || 'Utilizador'}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </Link>
          
          <button onClick={handleLogout} className="ml-2 flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors text-sm font-semibold border border-transparent hover:border-red-100" title="Terminar sessão">
            <LogOut size={16} /> <span className="hidden lg:inline">Sair</span>
          </button>
        </div>

        {/* ÁREA DIREITA (Mobile) - Apenas Ícone do Menu */}
        <div className="flex md:hidden items-center gap-2">
          <Notificacoes />
          <button 
            onClick={() => setMobileMenuAberto(!mobileMenuAberto)} 
            className="text-[#004B93] p-1 focus:outline-none"
          >
            {mobileMenuAberto ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* NAVBAR (Azul - Apenas Desktop) */}
      <div className="hidden md:block bg-[#004B93] text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-hide">
          <nav className="flex items-center gap-1">
            {isCliente ? (
              <>
                <Link to="/" className={linkClasses}><Home size={16} /> Início</Link>
                <Link to="/catalogo" className={linkClasses}><Library size={16} /> Catálogo</Link>
                <Link to="/meus-emprestimos" className={linkClasses}><BookMarked size={16} /> Empréstimos</Link>
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

      {/* MENU MOBILE (Dropdown) */}
      {mobileMenuAberto && (
        <div className="md:hidden bg-[#004B93] text-white flex flex-col absolute top-full left-0 w-full shadow-xl z-50 border-t border-white/20 max-h-[85vh] overflow-y-auto">
          {isCliente ? (
            <>
              <Link to="/" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center gap-2 font-medium"><Home size={18} /> Início</Link>
              <Link to="/catalogo" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center gap-2 font-medium"><Library size={18} /> Catálogo</Link>
              <Link to="/meus-emprestimos" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center gap-2 font-medium"><BookMarked size={18} /> Empréstimos</Link>
              <Link to="/meu-historico" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center gap-2 font-medium"><History size={18} /> Histórico</Link>
              <Link to="/manual" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center gap-2 font-medium"><BookOpen size={18} /> Manual</Link>
            </>
          ) : (
            <>
              <Link to="/" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center gap-2 font-medium"><Home size={18} /> Início</Link>
              {temPermissao('obras') && <Link to="/cadastrar-obra" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Obras</Link>}
              {temPermissao('autores') && <Link to="/cadastrar-autor" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Autores</Link>}
              {temPermissao('clientes') && <Link to="/clientes" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Clientes</Link>}
              {temPermissao('editoras') && <Link to="/cadastrar-editora" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Editoras</Link>}
              {temPermissao('emprestimos') && (
                <Link to="/emprestimos" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  Empréstimos
                  {atrasados > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center animate-pulse">
                      {atrasados}
                    </span>
                  )}
                </Link>
              )}
              {temPermissao('reservas') && <Link to="/reservas" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Reservas</Link>}
              {temPermissao('historico') && <Link to="/historico" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Histórico</Link>}
              {temPermissao('acervo') && <Link to="/acervo" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Acervo</Link>}
              {temPermissao('relatorios') && <Link to="/relatorios" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Relatórios</Link>}
              {temPermissao('manual') && <Link to="/manual" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Manual</Link>}
              {isAdmin && (
                <>
                  <Link to="/utilizadores" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Utilizadores</Link>
                  <Link to="/permissoes" onClick={fecharMenuMobile} className="px-6 py-4 border-b border-white/10">Permissões</Link>
                </>
              )}
            </>
          )}

          {/* Rodapé do Menu Mobile (Perfil e Sair) */}
          <div className="p-5 bg-[#003366] flex items-center justify-between mt-auto">
            <Link to="/perfil" onClick={fecharMenuMobile} className="flex items-center gap-3 hover:opacity-80">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{user?.nome || 'Utilizador'}</p>
                <p className="text-[11px] text-blue-200">{user?.role}</p>
              </div>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-red-300 hover:text-red-100 text-sm font-bold bg-white/5 hover:bg-white/10 px-3 py-2 rounded-md transition-colors">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}
    </header>
  );
}