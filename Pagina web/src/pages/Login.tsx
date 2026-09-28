import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Mail, Lock, LogIn } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Email ou password incorretos.', 'error');
        setLoading(false);
        return;
      }

      login(data.user, data.token);
      showToast(`Bem-vindo, ${data.user.nome}!`, 'success');
      navigate('/');
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 relative overflow-hidden">
      {/* Círculos decorativos */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full -ml-48 -mb-48"></div>
      <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-white/5 rounded-full"></div>

      {/* Painel Esquerdo — Branding (escondido em mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center text-white p-12 relative z-10">
        <div className="max-w-md text-center">
          <div className="w-40 h-40 mx-auto mb-8 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 flex items-center justify-center p-4 shadow-2xl">
            <img
              src="/logo-at.png"
              alt="Logotipo da Autoridade Tributária de Moçambique"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-3">
            Autoridade Tributária<br />de Moçambique
          </h1>
          <div className="w-24 h-1 bg-yellow-400 rounded-full mx-auto my-6"></div>
          <p className="text-blue-100 text-lg font-medium">
            Sistema de Gestão de Biblioteca
          </p>
          <p className="text-blue-200 text-sm mt-6 max-w-sm mx-auto leading-relaxed">
            Gestão integrada do acervo bibliográfico, empréstimos, 
            reservas e relatórios da biblioteca da AT Moçambique.
          </p>
        </div>
      </div>

      {/* Painel Direito — Formulário de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
          {/* Logo (só aparece em mobile) */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center">
              <img
                src="/logo-at.png"
                alt="Logotipo da Autoridade Tributária de Moçambique"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-at-blue leading-tight">
              Autoridade Tributária de Moçambique
            </h1>
            <p className="text-gray-500 text-sm mt-1">Sistema de Gestão de Biblioteca</p>
          </div>

          {/* Cabeçalho do formulário (desktop) */}
          <div className="hidden lg:block text-center mb-8">
            <h2 className="text-2xl font-bold text-at-blue">Bem-vindo</h2>
            <p className="text-gray-500 text-sm mt-1">Inicia sessão para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-at-blue focus:border-transparent transition-all"
                  placeholder="o.teu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-at-blue focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-at-blue text-white py-3.5 rounded-lg font-semibold hover:bg-at-blue-light transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 mt-2"
            >
              <LogIn size={18} />
              {loading ? 'A entrar...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Autoridade Tributária de Moçambique
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}