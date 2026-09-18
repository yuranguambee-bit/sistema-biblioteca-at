import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface Obra { Id: number; Titulo: string; Autor: string; }
interface Cliente { Id: number; Nome: string; }
interface Emprestimo { 
  Id: number; Obra: string; Cliente: string; 
  DataEmprestimo: string; DataPrevistaDevolucao: string;
}

export function Emprestimos() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [obraId, setObraId] = useState('');
  const [clienteId, setClienteId] = useState('');
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
      if (response.ok) {
        showToast('Empréstimo realizado com sucesso!', 'success');
        carregarDados();
      } else {
        showToast('Erro ao realizar empréstimo.', 'error');
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

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-lg shadow-sm p-8 border-t-4 border-at-blue mb-8">
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
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-at-blue">Empréstimos Ativos ({emprestimos.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-at-blue text-white text-sm">
                <th className="p-4 font-semibold">Obra</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Empréstimo</th>
                <th className="p-4 font-semibold">Devolver até</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {emprestimos.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum empréstimo ativo.</td></tr>
              ) : (
                emprestimos.map((emp) => (
                  <tr key={emp.Id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{emp.Obra}</td>
                    <td className="p-4">{emp.Cliente}</td>
                    <td className="p-4">{emp.DataEmprestimo}</td>
                    <td className="p-4 font-semibold text-red-600">{emp.DataPrevistaDevolucao}</td>
                    <td className="p-4 text-center space-x-2">
                      <button onClick={() => handleRenovar(emp.Id)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-600 transition-colors">
                        +15 dias
                      </button>
                      <button onClick={() => handleDevolver(emp.Id, emp.Obra)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 transition-colors">
                        Devolver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}