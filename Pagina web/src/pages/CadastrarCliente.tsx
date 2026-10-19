import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Lock, RefreshCw, UserPlus, CreditCard, FileText } from 'lucide-react';

export function CadastrarCliente() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pi, setPi] = useState('');
  const [nuit, setNuit] = useState('');
  const [loading, setLoading] = useState(false);
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
        body: JSON.stringify({ Nome: nome, Email: email, Telefone: telefone, PI: pi, NUIT: nuit }),
      });

      if (response.ok) {
        showToast('Cliente cadastrado com sucesso!', 'success');
        setTimeout(() => navigate('/clientes'), 1500);
      } else {
        showToast('Erro ao cadastrar. Verifica os dados.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disabledClass = "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200";
  const enabledClass = "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-at-blue";

  return (
    <main className="max-w-3xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-lg shadow-sm p-8 border-t-4 border-at-blue">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-at-blue flex items-center gap-2"><UserPlus size={24}/> Cadastrar Novo Cliente</h2>
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
                <span>PI (Bilhete de Identidade)</span>
                {!temPermissao('clientes_campo_pi') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={pi} onChange={(e) => setPi(e.target.value)} disabled={campoBloqueado('clientes_campo_pi')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('clientes_campo_pi') ? disabledClass : enabledClass}`} placeholder="Ex: 123456789A" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>NUIT</span>
                {!temPermissao('clientes_campo_nuit') && <Lock size={12} className="text-red-400" />}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={nuit} onChange={(e) => setNuit(e.target.value)} disabled={campoBloqueado('clientes_campo_nuit')} className={`w-full pl-10 p-3 border rounded-md transition-colors ${campoBloqueado('clientes_campo_nuit') ? disabledClass : enabledClass}`} placeholder="Ex: 123456789" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading || !podeCriar} className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
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