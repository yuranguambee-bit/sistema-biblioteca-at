import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface Utilizador { Id: number; Nome: string; Email: string; Role: string; }

export function Utilizadores() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Bibliotecario');

  const carregarUtilizadores = async () => {
    try {
      const res = await apiFetch('/api/usuarios');
      const data = await res.json();
      setUtilizadores(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { carregarUtilizadores(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify({ Nome: nome, Email: email, Password: password, Role: role }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Utilizador criado com sucesso!', 'success');
        setNome(''); setEmail(''); setPassword(''); setRole('Bibliotecario');
        carregarUtilizadores();
      } else {
        showToast(data.error || 'Erro ao criar utilizador.', 'error');
      }
    } catch (error) { showToast('Erro de ligação ao servidor.', 'error'); }
  };

  const handleEliminar = async (id: number, nomeUser: string) => {
    const ok = await confirm({
      title: 'Eliminar Utilizador',
      message: `Tens a certeza que queres eliminar permanentemente o utilizador "${nomeUser}"? Esta ação não pode ser revertida.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        showToast('Utilizador removido com sucesso.', 'success');
        carregarUtilizadores();
      } else { showToast(data.error || 'Erro ao remover.', 'error'); }
    } catch (error) { showToast('Erro de ligação.', 'error'); }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-at-blue">
        <h2 className="text-2xl font-bold text-at-blue">Gestão de Utilizadores</h2>
        <p className="text-gray-500 text-sm mt-1">Só administradores podem gerir utilizadores do sistema.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
        <h3 className="text-lg font-bold text-at-blue mb-4">Criar Novo Utilizador</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="email@at.gov.mz" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Perfil</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
              <option value="Bibliotecario">Bibliotecário</option>
              <option value="Admin">Administrador</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <button type="submit" className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
              Criar Utilizador
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-at-blue">Utilizadores Registados ({utilizadores.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-at-blue text-white text-sm">
                <th className="p-4 font-semibold">Nome</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Perfil</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {utilizadores.map((u) => (
                <tr key={u.Id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.Nome}</td>
                  <td className="p-4">{u.Email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      u.Role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>{u.Role}</span>
                  </td>
                  <td className="p-4 text-center">
                    {u.Id === user?.id ? (
                      <span className="text-xs text-gray-400 italic">(tu)</span>
                    ) : (
                      <button onClick={() => handleEliminar(u.Id, u.Nome)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-red-700 transition-colors">
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}