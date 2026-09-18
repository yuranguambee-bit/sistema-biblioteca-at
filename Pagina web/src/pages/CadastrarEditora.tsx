import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export function CadastrarEditora() {
  const [nome, setNome] = useState('');
  const [contacto, setContacto] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/editoras', {
        method: 'POST',
        body: JSON.stringify({ Nome: nome, Contacto: contacto }),
      });

      if (response.ok) {
        showToast('Editora cadastrada com sucesso!', 'success');
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
        <h2 className="text-2xl font-bold text-at-blue mb-6">Cadastrar Nova Editora</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome da Editora</label>
            <input 
              type="text" 
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="Ex: Editora Escolar"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contacto</label>
            <input 
              type="text" 
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="Ex: +258 21 000 000"
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="submit" className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
              Guardar Editora
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