import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, User, BookOpen, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../services/api';

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

  // Links do menu — só aparecem se o utilizador tiver permissão
  const linkClasses = "hover:text-yellow-300 transition-colors";

  return (
    <header className="bg-gradient-to-b from-at-blue to-at-blue-light text-white shadow-md print:hidden">
      {/* Cabeçalho — Logo em cima, título por baixo, centrado */}
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <div className="w-24 h-24 mb-4 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 flex items-center justify-center p-3 shadow-2xl hover:scale-105 transition-transform duration-300">
          <img
            src="/logo-at.png"
            alt="Logotipo da Autoridade Tributária de Moçambique"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-center leading-tight">
          Autoridade Tributária de Moçambique
        </h1>

        <p className="text-xs text-blue-200 font-medium tracking-[0.15em] uppercase mt-2">
          Sistema de Gestão de Biblioteca
        </p>
      </div>

      {/* Navegação */}
      <nav className="bg-at-blue-light/60 backdrop-blur-sm px-6 py-3 flex flex-wrap items-center justify-between text-sm border-t border-blue-400/20">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 items-center">
          <li><Link to="/" className={`${linkClasses} font-semibold`}>Início</Link></li>

          {temPermissao('obras') && (
            <li><Link to="/cadastrar-obra" className={linkClasses}>Cadastrar Obra</Link></li>
          )}

          {temPermissao('autores') && (
            <li><Link to="/cadastrar-autor" className={linkClasses}>Cadastrar Autor</Link></li>
          )}

          {temPermissao('clientes') && (
            <li><Link to="/clientes" className={linkClasses}>Clientes</Link></li>
          )}

          {temPermissao('editoras') && (
            <li><Link to="/cadastrar-editora" className={linkClasses}>Editoras</Link></li>
          )}

          {temPermissao('emprestimos') && (
            <li>
              <Link to="/emprestimos" className={`${linkClasses} flex items-center gap-1.5 relative`}>
                Empréstimos
                {atrasados > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center animate-pulse">
                    {atrasados}
                  </span>
                )}
              </Link>
            </li>
          )}

          {temPermissao('reservas') && (
            <li><Link to="/reservas" className={linkClasses}>Reservas</Link></li>
          )}

          {temPermissao('historico') && (
            <li><Link to="/historico" className={linkClasses}>Histórico</Link></li>
          )}

          {temPermissao('acervo') && (
            <li><Link to="/acervo" className={linkClasses}>Acervo</Link></li>
          )}

          {temPermissao('relatorios') && (
            <li><Link to="/relatorios" className={linkClasses}>📊 Relatórios</Link></li>
          )}

          {temPermissao('manual') && (
            <li>
              <Link to="/manual" className={`${linkClasses} flex items-center gap-1`}>
                <BookOpen size={14} /> Manual
              </Link>
            </li>
          )}

          {isAdmin && (
            <>
              <li>
                <Link to="/utilizadores" className={`${linkClasses} font-semibold`}>
                  🔐 Utilizadores
                </Link>
              </li>
              <li>
                <Link to="/permissoes" className="text-yellow-300 hover:text-yellow-100 transition-colors font-semibold flex items-center gap-1">
                  <ShieldCheck size={14} /> Permissões
                </Link>
              </li>
            </>
          )}
        </ul>
        
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <Link 
            to="/perfil"
            className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors group"
            title="Ver o meu perfil"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <User size={14} />
            </div>
            <span className="font-medium">{user?.nome || 'Utilizador'}</span>
            <span className={`ml-1 px-2 py-0.5 rounded text-xs font-bold ${isAdmin ? 'bg-yellow-400 text-black' : 'bg-blue-400 text-white'}`}>
              {user?.role}
            </span>
          </Link>
          <span className="text-gray-400">|</span>
          <button onClick={handleLogout} className="flex items-center gap-1 hover:text-red-300 transition-colors">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </nav>
    </header>
  );
}