import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Search, Edit3, Trash2, Save, X, 
  Phone, Mail, Globe, MapPin, BookOpen, Plus
} from 'lucide-react';

interface Editora {
  Id: number;
  Nome: string;
  Endereco: string | null;
  Telefone: string | null;
  Email: string | null;
  Website: string | null;
  TotalObras: number;
}

export function CadastrarEditora() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user } = useAuth();

  // Formulário
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Lista
  const [editoras, setEditoras] = useState<Editora[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  const carregarEditoras = async () => {
    try {
      const res = await apiFetch('/api/editoras');
      const data = await res.json();
      setEditoras(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  useEffect(() => { carregarEditoras(); }, []);

  const editorasFiltradas = useMemo(() => {
    if (!pesquisa.trim()) return editoras;
    const p = pesquisa.toLowerCase();
    return editoras.filter((e) =>
      e.Nome.toLowerCase().includes(p) ||
      (e.Endereco && e.Endereco.toLowerCase().includes(p)) ||
      (e.Telefone && e.Telefone.toLowerCase().includes(p)) ||
      (e.Email && e.Email.toLowerCase().includes(p))
    );
  }, [editoras, pesquisa]);

  const limparFormulario = () => {
    setNome('');
    setEndereco('');
    setTelefone('');
    setEmail('');
    setWebsite('');
    setEditandoId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      showToast('Preenche o nome da editora.', 'error');
      return;
    }

    setSalvando(true);
    try {
      const url = editandoId ? `/api/editoras/${editandoId}` : '/api/editoras';
      const method = editandoId ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({
          Nome: nome.trim(),
          Endereco: endereco.trim() || null,
          Telefone: telefone.trim() || null,
          Email: email.trim() || null,
          Website: website.trim() || null,
        }),
      });

      if (response.ok) {
        showToast(
          editandoId ? 'Editora atualizada com sucesso!' : 'Editora cadastrada com sucesso!',
          'success'
        );
        limparFormulario();
        carregarEditoras();
      } else {
        const data = await response.json();
        showToast(data.error || 'Erro ao guardar editora.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (editora: Editora) => {
    setNome(editora.Nome);
    setEndereco(editora.Endereco || '');
    setTelefone(editora.Telefone || '');
    setEmail(editora.Email || '');
    setWebsite(editora.Website || '');
    setEditandoId(editora.Id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (editora: Editora) => {
    const ok = await confirm({
      title: 'Eliminar Editora',
      message: `Tens a certeza que queres eliminar "${editora.Nome}"? Esta ação não pode ser revertida.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/editoras/${editora.Id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        showToast('Editora removida com sucesso.', 'success');
        carregarEditoras();
      } else {
        showToast(data.error || 'Erro ao eliminar editora.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 mt-6">
      {/* ============ FORMULÁRIO ============ */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue mb-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg">
            {editandoId ? <Edit3 size={24} /> : <Plus size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-at-blue">
              {editandoId ? 'Editar Editora' : 'Cadastrar Nova Editora'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {editandoId
                ? 'Altera os dados e guarda as mudanças'
                : 'Preenche os dados da editora abaixo'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome e Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome da Editora
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: Edições Técnicas"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Endereço
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: Av. das Indústrias, 45"
                />
              </div>
            </div>
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: 84 567 8901"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                  placeholder="Ex: tecnicas@edicoes.co.mz"
                />
              </div>
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
                placeholder="Ex: www.edicoestecnicas.co.mz"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={salvando}
              className="bg-at-blue text-white px-8 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              {salvando ? 'A guardar...' : editandoId ? 'Guardar Alterações' : 'Guardar Editora'}
            </button>

            {editandoId ? (
              <button
                type="button"
                onClick={limparFormulario}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <X size={18} />
                Cancelar Edição
              </button>
            ) : (
              <button
                type="button"
                onClick={limparFormulario}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ============ LISTA DE EDITORAS ============ */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
                <Building2 className="text-orange-600" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-at-blue">Lista de Editoras</h3>
                <p className="text-xs text-gray-400">
                  {editoras.length} editora{editoras.length !== 1 ? 's' : ''} cadastrada{editoras.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por nome, endereço, telefone ou email..."
              className="w-full pl-9 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-sm"
            />
          </div>

          {pesquisa && (
            <p className="text-xs text-gray-500 mt-2">
              {editorasFiltradas.length} resultado{editorasFiltradas.length !== 1 ? 's' : ''} encontrado{editorasFiltradas.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">A carregar editoras...</div>
          ) : editorasFiltradas.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={56} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {pesquisa ? 'Nenhuma editora corresponde à pesquisa.' : 'Ainda não há editoras cadastradas.'}
              </p>
              {pesquisa && (
                <button
                  onClick={() => setPesquisa('')}
                  className="mt-4 text-at-blue font-semibold hover:underline text-sm"
                >
                  Limpar pesquisa
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Nome</th>
                  <th className="px-6 py-4 font-bold">Endereço</th>
                  <th className="px-6 py-4 font-bold">Contactos</th>
                  <th className="px-6 py-4 font-bold">Website</th>
                  <th className="px-6 py-4 font-bold text-center">Obras</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {editorasFiltradas.map((editora) => (
                  <tr key={editora.Id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white flex-shrink-0">
                          <Building2 size={18} />
                        </div>
                        <p className="font-semibold text-gray-800">{editora.Nome}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {editora.Endereco || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {editora.Telefone && (
                          <p className="text-gray-700 font-medium flex items-center gap-1">
                            📞 {editora.Telefone}
                          </p>
                        )}
                        {editora.Email && (
                          <p className="text-gray-500 flex items-center gap-1 truncate max-w-xs">
                            ✉️ {editora.Email}
                          </p>
                        )}
                        {!editora.Telefone && !editora.Email && (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editora.Website ? (
                        <a
                          href={editora.Website.startsWith('http') ? editora.Website : `https://${editora.Website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1 truncate max-w-xs hover:underline"
                        >
                          <Globe size={12} /> {editora.Website}
                        </a>
                      ) : (
                        <span className="text-gray-300 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editora.TotalObras > 0 ? (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">
                          <BookOpen size={12} />
                          {editora.TotalObras}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditar(editora)}
                          className="bg-yellow-500 text-white p-2 rounded-md hover:bg-yellow-600 transition-colors"
                          title="Editar editora"
                        >
                          <Edit3 size={14} />
                        </button>
                        {user?.role === 'Admin' && (
                          <button
                            onClick={() => handleEliminar(editora)}
                            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors"
                            title="Eliminar editora"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}