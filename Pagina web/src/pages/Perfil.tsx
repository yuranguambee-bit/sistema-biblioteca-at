import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  User, Mail, Shield, Lock, Eye, EyeOff, Save, 
  Key, CheckCircle, AlertTriangle, History, Clock
} from 'lucide-react';

interface Perfil {
  Id: number;
  Nome: string;
  Email: string;
  Role: string;
}

interface Atividade {
  Id: number;
  Obra: string;
  Cliente: string;
  Data: string;
  Status: string;
}

export function Perfil() {
  useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [atividade, setAtividade] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  const [passwordAtual, setPasswordAtual] = useState('');
  const [passwordNova, setPasswordNova] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [mostrarAtual, setMostrarAtual] = useState(false);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [alterando, setAlterando] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/perfil').then((r) => r.json()),
      apiFetch('/api/perfil/atividade').then((r) => r.json()),
    ])
      .then(([dPerfil, dAtividade]) => {
        setPerfil(dPerfil);
        setAtividade(dAtividade.emprestimosRecentes || []);
        setLoading(false);
      })
      .catch((e) => { console.error(e); setLoading(false); });
  }, []);

  const calcularForcaPassword = (pwd: string) => {
    let forca = 0;
    if (pwd.length >= 6) forca++;
    if (pwd.length >= 10) forca++;
    if (/[A-Z]/.test(pwd)) forca++;
    if (/[0-9]/.test(pwd)) forca++;
    if (/[^A-Za-z0-9]/.test(pwd)) forca++;
    return forca;
  };

  const forcaNova = calcularForcaPassword(passwordNova);
  const coresForca = ['bg-gray-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const textosForca = ['', 'Muito Fraca', 'Fraca', 'Média', 'Forte', 'Muito Forte'];

  const handleAlterarPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordNova !== passwordConfirmar) {
      showToast('As passwords novas não coincidem.', 'error');
      return;
    }

    if (passwordNova.length < 6) {
      showToast('A nova password deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    setAlterando(true);
    try {
      const response = await apiFetch('/api/perfil/password', {
        method: 'PUT',
        body: JSON.stringify({ 
          PasswordAtual: passwordAtual, 
          PasswordNova: passwordNova 
        }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Password alterada com sucesso!', 'success');
        setPasswordAtual('');
        setPasswordNova('');
        setPasswordConfirmar('');
      } else {
        showToast(data.error || 'Erro ao alterar password.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setAlterando(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar perfil...
        </div>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <AlertTriangle size={56} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Erro ao carregar perfil</h2>
          <button onClick={() => navigate('/')}
            className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors mt-4">
            Voltar ao Início
          </button>
        </div>
      </main>
    );
  }

  const iniciais = perfil.Nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <main className="max-w-5xl mx-auto p-6 mt-6">
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 right-24 w-40 h-40 bg-white/5 rounded-full -mb-20"></div>
        
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            {iniciais}
          </div>
          <div className="flex-1 min-w-[250px]">
            <h1 className="text-3xl font-bold mb-1">{perfil.Nome}</h1>
            <p className="text-blue-100 flex items-center gap-2 text-sm">
              <Mail size={14} /> {perfil.Email}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                perfil.Role === 'Admin' ? 'bg-yellow-400 text-yellow-900' : 'bg-blue-400 text-white'
              }`}>
                <Shield size={12} /> {perfil.Role}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30">
                ID #{perfil.Id}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="text-at-blue" size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-at-blue">Informações Pessoais</h3>
                <p className="text-xs text-gray-400">Os teus dados no sistema</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</p>
                <p className="text-gray-800 font-semibold">{perfil.Nome}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-gray-700">{perfil.Email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Perfil de Acesso</p>
                <p className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  perfil.Role === 'Admin' 
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' 
                    : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                }`}>
                  <Shield size={12} /> {perfil.Role}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <History className="text-orange-600" size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-at-blue">Atividade Recente</h3>
                <p className="text-xs text-gray-400">Últimos empréstimos no sistema</p>
              </div>
            </div>
            {atividade.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Sem atividade recente.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {atividade.map((item) => (
                  <div key={item.Id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.Obra}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 truncate">👤 {item.Cliente}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {item.Data}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <Key className="text-red-600" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-at-blue">Alterar Password</h3>
              <p className="text-xs text-gray-400">Mantém a tua conta segura</p>
            </div>
          </div>

          <form onSubmit={handleAlterarPassword} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password Atual
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={mostrarAtual ? 'text' : 'password'}
                  required
                  value={passwordAtual}
                  onChange={(e) => setPasswordAtual(e.target.value)}
                  className="w-full pl-9 pr-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="A tua password atual"
                />
                <button
                  type="button"
                  onClick={() => setMostrarAtual(!mostrarAtual)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarAtual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nova Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={mostrarNova ? 'text' : 'password'}
                  required
                  value={passwordNova}
                  onChange={(e) => setPasswordNova(e.target.value)}
                  className="w-full pl-9 pr-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNova(!mostrarNova)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarNova ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordNova && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          n <= forcaNova ? coresForca[forcaNova] : 'bg-gray-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs mt-1 font-semibold text-gray-500">
                    Força: <span className={
                      forcaNova <= 2 ? 'text-red-600' : 
                      forcaNova <= 3 ? 'text-yellow-600' : 'text-green-600'
                    }>{textosForca[forcaNova]}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmar Nova Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={mostrarConfirmar ? 'text' : 'password'}
                  required
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  className={`w-full pl-9 pr-10 p-3 border rounded-md focus:outline-none focus:ring-2 ${
                    passwordConfirmar && passwordNova !== passwordConfirmar
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-at-blue'
                  }`}
                  placeholder="Repete a nova password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordConfirmar && passwordNova !== passwordConfirmar && (
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  ⚠️ As passwords não coincidem
                </p>
              )}
              {passwordConfirmar && passwordNova === passwordConfirmar && passwordConfirmar.length >= 6 && (
                <p className="text-xs text-green-600 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} /> As passwords coincidem
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={alterando || !passwordAtual || !passwordNova || passwordNova !== passwordConfirmar}
                className="w-full bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {alterando ? 'A alterar...' : 'Alterar Password'}
              </button>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-xs text-yellow-800">
              <p className="font-bold mb-1">💡 Dica de segurança</p>
              <ul className="list-disc list-inside space-y-0.5 text-yellow-700">
                <li>Usa pelo menos 8 caracteres</li>
                <li>Mistura letras maiúsculas, minúsculas e números</li>
                <li>Não reutilizes passwords de outros serviços</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}