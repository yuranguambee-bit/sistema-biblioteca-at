import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

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
      const response = await fetch('http://localhost:3005/api/auth/login', {
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
    <div className="min-h-screen flex items-center justify-center bg-at-blue p-6">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-at-blue rounded-full mx-auto flex items-center justify-center text-white font-bold text-xs mb-4">
            LOGO
          </div>
          <h1 className="text-2xl font-bold text-at-blue">Autoridade Tributária de Moçambique</h1>
          <p className="text-gray-500 text-sm mt-2">Sistema de Gestão de Biblioteca</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="o.teu@email.com" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-at-blue text-white py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors disabled:bg-gray-400">
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>Credenciais de teste:</p>
          <p className="mt-1"><strong>admin@at.gov.mz</strong> / <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
}