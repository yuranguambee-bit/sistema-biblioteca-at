import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

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

  return (
    <header className="bg-at-blue text-white shadow-md print:hidden">
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-16 h-16 bg-white rounded-full mb-3 flex items-center justify-center text-at-blue font-bold text-xs">
          LOGO
        </div>
        <h1 className="text-2xl font-bold tracking-wide">Autoridade Tributária de Moçambique</h1>
      </div>

      <nav className="bg-at-blue-light px-6 py-3 flex flex-wrap items-center justify-between text-sm">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li><Link to="/" className="hover:text-gray-300 font-semibold">Início</Link></li>
          <li><Link to="/cadastrar-obra" className="hover:text-gray-300">Cadastrar Obra</Link></li>
          <li><Link to="/cadastrar-autor" className="hover:text-gray-300">Cadastrar Autor</Link></li>
          <li><Link to="/cadastrar-cliente" className="hover:text-gray-300">Clientes</Link></li>
          <li><Link to="/cadastrar-editora" className="hover:text-gray-300">Editoras</Link></li>
          <li><Link to="/emprestimos" className="hover:text-gray-300">Empréstimos</Link></li>
          <li><Link to="/reservas" className="hover:text-gray-300">Reservas</Link></li>
          <li><Link to="/historico" className="hover:text-gray-300">Histórico</Link></li>
          <li><Link to="/acervo" className="hover:text-gray-300">Acervo</Link></li>
          <li><Link to="/relatorios" className="hover:text-gray-300">📊 Relatórios</Link></li>
          {user?.role === 'Admin' && (
            <li><Link to="/utilizadores" className="hover:text-yellow-300 font-semibold">🔐 Utilizadores</Link></li>
          )}
        </ul>
        
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <span className="flex items-center gap-1">
            <User size={16} /> 
            {user?.nome || 'Utilizador'} 
            <span className={`ml-1 px-2 py-0.5 rounded text-xs ${user?.role === 'Admin' ? 'bg-yellow-400 text-black' : 'bg-blue-400 text-white'}`}>
              {user?.role}
            </span>
          </span>
          <span className="text-gray-400">|</span>
          <button onClick={handleLogout} className="flex items-center gap-1 hover:text-red-300 transition-colors">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </nav>
    </header>
  );
}