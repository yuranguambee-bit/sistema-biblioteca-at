import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Mail, Phone, Lock, RefreshCw, UserPlus, CreditCard, FileText, 
  CheckCircle, ArrowRight, MailCheck 
} from 'lucide-react';

export function CadastrarCliente() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bi, setBi] = useState('');
  const [nuit, setNuit] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para o painel de sucesso
  const [sucesso, setSucesso] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState('');
  
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { temPermissao } = useAuth();

  const podeCriar = temPermissao('clientes_criar');

  const campoBloqueado = (chaveCampo: string) => {
    return !temPermissao(chaveCampo) || !podeCriar;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!podeCriar) {
      showToast('Não tens permissão para cadastrar clientes.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/clientes', {
        method: 'POST',
        // O backend espera 'PI', mesmo que na interface se chame BI
        body: JSON.stringify({ Nome: nome, Email: email, Telefone: telefone, PI: bi, NUIT: nuit }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Cliente cadastrado com sucesso!', 'success');
        if (email && data.passwordGerada) {
          setSenhaGerada(data.passwordGerada);
          setSucesso(true);
        } else {
          setTimeout(() => navigate('/clientes'), 1500);
        }
      } else {
        showToast(data.error || 'Erro ao cadastrar. Verifica os dados.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNovoRegisto = () => {
    setNome(''); setEmail(''); setTelefone(''); setBi(''); setNuit('');
    setSucesso(false);
    setSenhaGerada('');
  };

  const disabledClass = "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200";
  const enabledClass = "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#004B93]";

  if (sucesso) {
    return (
      <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
        <div className="bg-white rounded-lg shadow-sm p-8 border-t-4 border-green-500 max-w-2xl mx-auto text-center animate-scale-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cliente Registado com Sucesso!</h2>
          <p className="text-gray-500 mb-6">
            O leitor <strong>{nome}</strong> foi adicionado ao sistema e as credenciais de acesso foram criadas.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-8 text-left">
            <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
              <MailCheck size={18} /> Email Enviado
            </h3>
            <p className="text-sm text-green-700 mb-4">
              Foi enviado um email de boas-vindas para <strong>{email}</strong> com as instruções e credenciais de acesso.
            </p>
            <div className="bg-white p-3 rounded border border-green-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Password Inicial</span>
                <span className="font-mono text-lg font-bold text-gray-800">{senhaGerada}</span>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(senhaGerada);
                  showToast('Password copiada!', 'success');
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-green-600 mt-2">
              * Se o leitor não receber o email, podes dar-lhe esta password pessoalmente.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={handleNovoRegisto}
              className="bg-[#004B93] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#003870] transition-colors flex items-center gap-2"
            >
              <UserPlus size={18} /> Registar Outro Cliente
            </button>
            <button 
              onClick={() => navigate('/clientes')}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              Ver Lista de Clientes <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      <div className="bg-white rounded-lg shadow-sm p-8 border-t-4 border-[#004B93]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#004B93] flex items-center gap-2"><UserPlus size={24}/> Cadastrar Novo Cliente</h2>
          {!podeCriar && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Lock size={16} /> Modo de Leitura
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Nome Completo</span>
              {!temPermissao('clientes_campo_nome') && <Lock size={12} className="text-red-400" />}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} disabled={campoBloqueado('clientes_campo_nome')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('clientes_campo_nome') ? disabledClass : enabledClass}`} placeholder="Ex: João da Silva" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Email</span>
                {!temPermissao('clientes_campo_email') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={campoBloqueado('clientes_campo_email')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('clientes_campo_email') ? disabledClass : enabledClass}`} placeholder="Ex: joao@email.com" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Obrigatório para o leitor receber o email com as credenciais.</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Telefone</span>
                {!temPermissao('clientes_campo_telefone') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={campoBloqueado('clientes_campo_telefone')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('clientes_campo_telefone') ? disabledClass : enabledClass}`} placeholder="Ex: +258 84 000 0000" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>BI (Bilhete de Identidade)</span>
                {!temPermissao('clientes_campo_pi') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={bi} onChange={(e) => setBi(e.target.value)} disabled={campoBloqueado('clientes_campo_pi')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('clientes_campo_pi') ? disabledClass : enabledClass}`} placeholder="Ex: 123456789A" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>NUIT</span>
                {!temPermissao('clientes_campo_nuit') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={nuit} onChange={(e) => setNuit(e.target.value)} disabled={campoBloqueado('clientes_campo_nuit')} className={`w-full pl-10 p-3 rounded-md transition-colors ${campoBloqueado('clientes_campo_nuit') ? disabledClass : enabledClass}`} placeholder="Ex: 123456789" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading || !podeCriar} className="bg-[#004B93] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#003870] transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {loading ? 'A guardar...' : 'Guardar Cliente'}
            </button>
            <button type="button" onClick={() => navigate('/clientes')} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors">Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}