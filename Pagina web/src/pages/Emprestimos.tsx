import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { AlertTriangle, Clock, Filter, Printer } from 'lucide-react';

interface Obra { Id: number; Titulo: string; Autor: string; }
interface Cliente { Id: number; Nome: string; }
interface Emprestimo { 
  Id: number; Obra: string; Cliente: string; 
  DataEmprestimo: string; DataPrevistaDevolucao: string;
  DiasAtraso: number;
}

export function Emprestimos() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [obraId, setObraId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [filtroAtraso, setFiltroAtraso] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const carregarDados = async () => {
    try {
      const resObras = await apiFetch('/api/obras/disponiveis');
      const dataObras = await resObras.json();
      setObras(Array.isArray(dataObras) ? dataObras : []);
      if (dataObras.length > 0) setObraId(dataObras[0].Id.toString());

      const resClientes = await apiFetch('/api/clientes');
      const dataClientes = await resClientes.json();
      setClientes(Array.isArray(dataClientes) ? dataClientes : []);
      if (dataClientes.length > 0) setClienteId(dataClientes[0].Id.toString());

      const resEmprestimos = await apiFetch('/api/emprestimos');
      const dataEmprestimos = await resEmprestimos.json();
      setEmprestimos(Array.isArray(dataEmprestimos) ? dataEmprestimos : []);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleEmprestar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/emprestimos', {
        method: 'POST',
        body: JSON.stringify({ ObraId: Number(obraId), ClienteId: Number(clienteId) }),
      });
      const data = await response.json();
      
      if (response.ok) {
        showToast('Empréstimo realizado! A abrir comprovativo...', 'success');
        // Redireciona diretamente para o comprovativo
        setTimeout(() => navigate(`/comprovativo/${data.emprestimoId}`), 800);
      } else {
        showToast(data.error || 'Erro ao realizar empréstimo.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  const handleDevolver = async (id: number, titulo: string) => {
    const ok = await confirm({
      title: 'Devolver Obra',
      message: `Confirmas a devolução da obra "${titulo}"?`,
      confirmText: 'Devolver',
      cancelText: 'Cancelar',
      variant: 'info',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/emprestimos/${id}/devolver`, { method: 'PUT' });
      if (response.ok) {
        showToast('Devolução realizada com sucesso!', 'success');
        carregarDados();
      } else {
        showToast('Erro ao devolver.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  const handleRenovar = async (id: number) => {
    const ok = await confirm({
      title: 'Renovar Empréstimo',
      message: 'Queres renovar este empréstimo por mais 15 dias?',
      confirmText: 'Renovar',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/emprestimos/${id}/renovar`, { method: 'PUT' });
      if (response.ok) {
        showToast('Empréstimo renovado por mais 15 dias!', 'success');
        carregarDados();
      } else {
        showToast('Erro ao renovar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    }
  };

  const emprestimosFiltrados = filtroAtraso
    ? emprestimos.filter(e => e.DiasAtraso > 0)
    : emprestimos;

  const totalAtrasados = emprestimos.filter(e => e.DiasAtraso > 0).length;

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      {totalAtrasados > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-red-600" size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-700">
              {totalAtrasados} empréstimo(s) em atraso
            </h3>
            <p className="text-sm text-red-600 mt-1">
              Alguns leitores já ultrapassaram o prazo de devolução. Considera enviar um lembrete.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue mb-8">
        <h2 className="text-2xl font-bold text-at-blue mb-6">Novo Empréstimo</h2>
        <form onSubmit={handleEmprestar} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Obra</label>
            <select value={obraId} onChange={(e) => setObraId(e.target.value)} required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
              {obras.length === 0 ? <option value="">Nenhuma disponível</option> : 
                obras.map(o => <option key={o.Id} value={o.Id}>{o.Titulo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue">
              {clientes.length === 0 ? <option value="">Nenhum cliente</option> : 
                clientes.map(c => <option key={c.Id} value={c.Id}>{c.Nome}</option>)}
            </select>
          </div>
          <div>
            <button type="submit" disabled={obras.length === 0 || clientes.length === 0}
              className="w-full bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors disabled:bg-gray-400">
              Confirmar Empréstimo
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
          💡 Após confirmar, o comprovativo será aberto automaticamente para impressão.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-at-blue">
            Empréstimos Ativos ({emprestimos.length})
            {totalAtrasados > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                {totalAtrasados} em atraso
              </span>
            )}
          </h3>
          <button
            onClick={() => setFiltroAtraso(!filtroAtraso)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              filtroAtraso
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={14} />
            {filtroAtraso ? 'A mostrar só atrasados' : 'Mostrar só atrasados'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-at-blue text-white text-sm">
                <th className="p-4 font-semibold">Obra</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Empréstimo</th>
                <th className="p-4 font-semibold">Devolver até</th>
                <th className="p-4 font-semibold text-center">Estado</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {emprestimosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">
                  {filtroAtraso ? 'Nenhum empréstimo em atraso. 🎉' : 'Nenhum empréstimo ativo.'}
                </td></tr>
              ) : (
                emprestimosFiltrados.map((emp) => {
                  const atrasado = emp.DiasAtraso > 0;
                  return (
                    <tr 
                      key={emp.Id} 
                      className={`border-b border-gray-100 transition-colors ${
                        atrasado ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="p-4 font-medium">{emp.Obra}</td>
                      <td className="p-4">{emp.Cliente}</td>
                      <td className="p-4">{emp.DataEmprestimo}</td>
                      <td className={`p-4 font-semibold ${atrasado ? 'text-red-600' : 'text-gray-700'}`}>
                        {emp.DataPrevistaDevolucao}
                      </td>
                      <td className="p-4 text-center">
                        {atrasado ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-200">
                            <AlertTriangle size={12} />
                            Atrasado {emp.DiasAtraso} dia(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-200">
                            <Clock size={12} />
                            Em dia
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button 
                            onClick={() => navigate(`/comprovativo/${emp.Id}`)}
                            className="bg-at-blue text-white px-3 py-1 rounded text-xs font-semibold hover:bg-at-blue-light transition-colors inline-flex items-center gap-1"
                            title="Ver comprovativo">
                            <Printer size={12} /> Comprovativo
                          </button>
                          <button onClick={() => handleRenovar(emp.Id)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-600 transition-colors">
                            +15 dias
                          </button>
                          <button onClick={() => handleDevolver(emp.Id, emp.Obra)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 transition-colors">
                            Devolver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}