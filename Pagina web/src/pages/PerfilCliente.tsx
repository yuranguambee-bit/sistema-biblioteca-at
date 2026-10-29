import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  User, Mail, Phone, CreditCard, FileText, 
  Lock, Save, RefreshCw, ShieldCheck
} from 'lucide-react';

interface Perfil {
  Id: number;
  Nome: string;
  Email: string | null;
  Telefone: string | null;
  PI: string | null;
  NUIT: string | null;
}

export function PerfilCliente() {
  const { showToast } = useToast();
  
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const [passwordAtual, setPasswordAtual] = useState('');
  const [passwordNova, setPasswordNova] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [salvandoPassword, setSalvandoPassword] = useState(false);

  useEffect(() => {
    apiFetch('/api/portal/perfil')
      .then((r) => r.json())
      .then((data) => {
        setPerfil(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
        showToast('Erro ao carregar o perfil.', 'error');
      });
  }, []);

  const handleAlterarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordAtual || !passwordNova || !passwordConfirmar) {
      return showToast('Preenche todos os campos da password.', 'error');
    }
    if (passwordNova.length < 6) {
      return showToast('A nova password deve ter pelo menos 6 caracteres.', 'error');
    }
    if (passwordNova !== passwordConfirmar) {
      return showToast('A nova password e a confirmação não coincidem.', 'error');
    }

    setSalvandoPassword(true);
    try {
      const response = await apiFetch('/api/portal/password', {
        method: 'PUT',
        body: JSON.stringify({ PasswordAtual: passwordAtual, PasswordNova: passwordNova }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Password alterada com sucesso!', 'success');
        setPasswordAtual('');
        setPasswordNova('');
        setPasswordConfirmar('');
      } else {
        showToast(data.error || 'Erro ao alterar a password.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvandoPassword(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 lg:p-8 mt-2 flex justify-center items-center h-64">
        <RefreshCw size={32} className="animate-spin text-at-blue" />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      {/* CABEÇALHO */}
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-3xl shadow-xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>
            <p className="text-blue-100 text-sm mt-1">Gere os teus dados e a tua password</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DADOS PESSOAIS (APENAS LEITURA) */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border-t-4 border-at-blue">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <ShieldCheck className="text-at-blue" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Dados Pessoais</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <User size={16} className="text-gray-400" /> {perfil?.Nome}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" /> {perfil?.Email || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Telefone</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" /> {perfil?.Telefone || '—'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">PI (Bilhete)</p>
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-400" /> {perfil?.PI || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">NUIT</p>
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" /> {perfil?.NUIT || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-xs text-blue-900 mt-6">
            Para atualizar os teus dados pessoais (email, telefone, etc.), deves dirigir-te à biblioteca com o bibliotecário.
          </div>
        </div>

        {/* ALTERAR PASSWORD */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border-t-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Lock className="text-yellow-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Alterar Password</h2>
          </div>

          <form onSubmit={handleAlterarPassword} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Password Atual</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="password"
                  required
                  value={passwordAtual}
                  onChange={(e) => setPasswordAtual(e.target.value)}
                  className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="A tua password atual"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Nova Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordNova}
                  onChange={(e) => setPasswordNova(e.target.value)}
                  className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Confirmar Nova Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Repete a nova password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvandoPassword}
              className="w-full bg-yellow-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-yellow-600 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {salvandoPassword ? (
                <><RefreshCw size={18} className="animate-spin" /> A guardar...</>
              ) : (
                <><Save size={18} /> Guardar Nova Password</>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}