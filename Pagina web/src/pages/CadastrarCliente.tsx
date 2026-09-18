import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export function CadastrarCliente() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/clientes', {
        method: 'POST',
        body: JSON.stringify({ Nome: nome, Email: email, Telefone: telefone }),
      });

      if (response.ok) {
        showToast('Cliente cadastrado com sucesso!', 'success');
        setTimeout(() => navigate('/'), 1500);
      } else {
        showToast('Erro ao cadastrar. Verifica os dados.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-lg shadow-sm p-8 border-t-4 border-at-blue">
        <h2 className="text-2xl font-bold text-at-blue mb-6">Cadastrar Novo Cliente</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
            <input 
              type="text" 
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                placeholder="Ex: joao@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone</label>
              <input 
                type="text" 
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                placeholder="Ex: +258 84 000 0000"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="submit" className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
              Guardar Cliente
            </button>
            <button type="button" onClick={() => navigate('/')} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}