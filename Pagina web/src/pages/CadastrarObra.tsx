import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface Autor { Id: number; Nome: string; }
interface Editora { Id: number; Nome: string; }

export function CadastrarObra() {
  const [titulo, setTitulo] = useState('');
  const [ano, setAno] = useState('');
  const [autorId, setAutorId] = useState('');
  const [editoraId, setEditoraId] = useState('');
  const [autores, setAutores] = useState<Autor[]>([]);
  const [editoras, setEditoras] = useState<Editora[]>([]);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch('/api/autores')
      .then((r) => r.json())
      .then((data) => { 
        setAutores(Array.isArray(data) ? data : []); 
        if (data.length > 0) setAutorId(data[0].Id.toString()); 
      })
      .catch((e) => console.error(e));

    apiFetch('/api/editoras')
      .then((r) => r.json())
      .then((data) => { 
        setEditoras(Array.isArray(data) ? data : []); 
        if (data.length > 0) setEditoraId(data[0].Id.toString()); 
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/obras', {
        method: 'POST',
        body: JSON.stringify({ 
          Titulo: titulo, 
          Ano: Number(ano), 
          AutorId: Number(autorId),
          EditoraId: editoraId ? Number(editoraId) : null
        }),
      });

      if (response.ok) {
        showToast('Obra cadastrada com sucesso!', 'success');
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
        <h2 className="text-2xl font-bold text-at-blue mb-6">Cadastrar Nova Obra</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Título da Obra</label>
            <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
              placeholder="Ex: Manual de Direito Tributário" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ano</label>
              <input type="number" required value={ano} onChange={(e) => setAno(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                placeholder="Ex: 2024" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Autor</label>
              <select value={autorId} onChange={(e) => setAutorId(e.target.value)} required
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
                {autores.length === 0 ? <option value="">Sem autores</option> : 
                  autores.map((a) => <option key={a.Id} value={a.Id}>{a.Nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Editora</label>
              <select value={editoraId} onChange={(e) => setEditoraId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
                <option value="">Sem editora</option>
                {editoras.map((ed) => <option key={ed.Id} value={ed.Id}>{ed.Nome}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="submit" className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
              Guardar Obra
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