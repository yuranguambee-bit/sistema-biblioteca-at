import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { Autocomplete } from '../components/Autocomplete';
import { TableSkeleton } from '../components/Skeleton';
import { 
  AlertTriangle, Clock, Filter, Printer, BookOpen, User, 
  CheckCircle, Calendar, BookMarked, Info, Settings, X, Save, Lock, RefreshCw,
  Hourglass, ThumbsUp, ThumbsDown, BellRing
} from 'lucide-react';

interface Obra { Id: number; Titulo: string; Autor: string; }
interface Cliente { Id: number; Nome: string; Email?: string; }
interface Emprestimo { 
  Id: number; Obra: string; Cliente: string; 
  DataEmprestimo: string; DataPrevistaDevolucao: string;
  DiasAtraso: number;
  ValorMulta: number;
  RenovacaoPendente?: boolean | number;
}
interface RenovacaoPendente {
  Id: number;
  Obra: string;
  Autor: string | null;
  Cliente: string;
  ClienteEmail: string | null;
  ClienteTelefone: string | null;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  SolicitadoEm: string;
}

function nivelUrgencia(diasAtraso: number, dataPrevista: string): 'atrasado' | 'urgente' | 'ok' {
  if (diasAtraso > 0) return 'atrasado';
  const [dia, mes, ano] = dataPrevista.split('/').map(Number);
  const dataPrev = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((dataPrev.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias <= 2) return 'urgente';
  return 'ok';
}

function isRenovacaoPendente(v: boolean | number | undefined): boolean {
  return v === true || v === 1;
}

export function Emprestimos() {
  const navigate = useNavigate();
  const { user, temPermissao } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [renovacoesPendentes, setRenovacoesPendentes] = useState<RenovacaoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRenovacoes, setLoadingRenovacoes] = useState(true);
  const [processandoRenovacao, setProcessandoRenovacao] = useState<number | null>(null);
  const [obraId, setObraId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [filtroAtraso, setFiltroAtraso] = useState(false);
  const [processando, setProcessando] = useState(false);
  
  const [diasEmprestimo, setDiasEmprestimo] = useState(15);
  const [valorMultaDia, setValorMultaDia] = useState(40);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [configTemporaria, setConfigTemporaria] = useState({ dias: 15, multa: 40 });
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const podeCriar = temPermissao('emprestimos_criar');
  const podeRenovar = temPermissao('emprestimos_renovar');
  const podeDevolver = temPermissao('emprestimos_devolver');

  const carregarConfig = async () => {
    try {
      const res = await apiFetch('/api/configuracoes');
      const data = await res.json();
      setDiasEmprestimo(data.diasEmprestimo);
      setValorMultaDia(data.valorMultaDia);
      setConfigTemporaria({ dias: data.diasEmprestimo, multa: data.valorMultaDia });
    } catch (e) { console.error(e); }
  };

  const carregarRenovacoes = async () => {
    setLoadingRenovacoes(true);
    try {
      const res = await apiFetch('/api/renovacoes/pendentes');
      const data = await res.json();
      setRenovacoesPendentes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoadingRenovacoes(false); }
  };

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
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
    carregarRenovacoes();
  };

  useEffect(() => {
    carregarConfig();
    carregarDados();
  }, []);

  const abrirModalConfig = () => {
    setConfigTemporaria({ dias: diasEmprestimo, multa: valorMultaDia });
    setModalConfigAberto(true);
  };

  const salvarConfiguracoes = async () => {
    if (configTemporaria.dias < 1 || configTemporaria.dias > 365) {
      showToast('Os dias de empréstimo devem estar entre 1 e 365.', 'error');
      return;
    }
    if (configTemporaria.multa < 0 || configTemporaria.multa > 100000) {
      showToast('Valor de multa inválido.', 'error');
      return;
    }

    setSalvandoConfig(true);
    try {
      const response = await apiFetch('/api/configuracoes', {
        method: 'PUT',
        body: JSON.stringify({ diasEmprestimo: configTemporaria.dias, valorMultaDia: configTemporaria.multa }),
      });

      if (response.ok) {
        setDiasEmprestimo(configTemporaria.dias);
        setValorMultaDia(configTemporaria.multa);
        showToast('Configurações atualizadas!', 'success');
        setModalConfigAberto(false);
        carregarDados();
      } else {
        showToast('Erro ao guardar configurações.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setSalvandoConfig(false);
    }
  };

  const opcoesObras = obras.map((o) => ({ id: o.Id, label: o.Titulo, sublabel: o.Autor ? `Autor: ${o.Autor}` : undefined }));
  const opcoesClientes = clientes.map((c) => ({ id: c.Id, label: c.Nome, sublabel: c.Email || undefined }));

  const handleEmprestar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeCriar) return showToast('Não tens permissão para registar empréstimos.', 'error');
    if (!obraId || !clienteId) return showToast('Seleciona uma obra e um cliente.', 'error');

    setProcessando(true);
    try {
      const response = await apiFetch('/api/emprestimos', {
        method: 'POST',
        body: JSON.stringify({ ObraId: Number(obraId), ClienteId: Number(clienteId) }),
      });
      const data = await response.json();
      
      if (response.ok) {
        showToast('Empréstimo realizado! A abrir comprovativo...', 'success');
        setTimeout(() => navigate(`/comprovativo/${data.emprestimoId}`), 800);
      } else {
        showToast(data.error || 'Erro ao realizar empréstimo.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  const handleDevolver = async (id: number, titulo: string) => {
    if (!podeDevolver) return showToast('Não tens permissão para devolver obras.', 'error');

    const ok = await confirm({
      title: 'Devolver Obra',
      message: `Confirmas a devolução da obra "${titulo}"?`,
      confirmText: 'Devolver', cancelText: 'Cancelar', variant: 'info',
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
    } catch (error) { showToast('Erro de ligação ao servidor.', 'error'); }
  };

  const handleRenovarDireto = async (id: number) => {
    if (!podeRenovar) return showToast('Não tens permissão para renovar empréstimos.', 'error');

    const ok = await confirm({
      title: 'Renovar Empréstimo',
      message: `Queres renovar este empréstimo por mais ${diasEmprestimo} dias?`,
      confirmText: 'Renovar', cancelText: 'Cancelar', variant: 'warning',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/emprestimos/${id}/renovar`, { method: 'PUT' });
      if (response.ok) {
        showToast(`Empréstimo renovado por mais ${diasEmprestimo} dias!`, 'success');
        carregarDados();
      } else {
        showToast('Erro ao renovar.', 'error');
      }
    } catch (error) { showToast('Erro de ligação ao servidor.', 'error'); }
  };

  const handleAprovarRenovacao = async (id: number, obra: string, cliente: string) => {
    if (!podeRenovar) return showToast('Não tens permissão para aprovar renovações.', 'error');

    const ok = await confirm({
      title: 'Aprovar Renovação',
      message: `Aprovar a renovação de "${obra}" para ${cliente} por mais ${diasEmprestimo} dias?`,
      confirmText: 'Aprovar', cancelText: 'Cancelar', variant: 'info',
    });
    if (!ok) return;

    setProcessandoRenovacao(id);
    try {
      const response = await apiFetch(`/api/renovacoes/${id}/aprovar`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Renovação aprovada!', 'success');
        carregarDados();
      } else {
        showToast(data.error || 'Erro ao aprovar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessandoRenovacao(null);
    }
  };

  const handleRejeitarRenovacao = async (id: number, obra: string, cliente: string) => {
    if (!podeRenovar) return showToast('Não tens permissão para rejeitar renovações.', 'error');

    const ok = await confirm({
      title: 'Rejeitar Renovação',
      message: `Rejeitar a renovação de "${obra}" para ${cliente}? O prazo original mantém-se.`,
      confirmText: 'Rejeitar', cancelText: 'Cancelar', variant: 'danger',
    });
    if (!ok) return;

    setProcessandoRenovacao(id);
    try {
      const response = await apiFetch(`/api/renovacoes/${id}/rejeitar`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Renovação rejeitada.', 'success');
        carregarDados();
      } else {
        showToast(data.error || 'Erro ao rejeitar.', 'error');
      }
    } catch (error) {
      showToast('Erro de ligação ao servidor.', 'error');
    } finally {
      setProcessandoRenovacao(null);
    }
  };

  const emprestimosFiltrados = filtroAtraso ? emprestimos.filter(e => e.DiasAtraso > 0) : emprestimos;
  const totalAtrasados = emprestimos.filter(e => e.DiasAtraso > 0).length;
  const totalMultas = emprestimos.reduce((acc, e) => acc + (e.ValorMulta || 0), 0);

  return (
    <main className="w-full mx-auto p-4 lg:p-8 mt-2 animate-fade-up">
      {totalAtrasados > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <AlertTriangle className="text-white animate-pulse" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-700">
              {totalAtrasados} empréstimo(s) em atraso · {totalMultas.toLocaleString('pt-MZ')} MT em multas
            </h3>
            <p className="text-sm text-red-600 mt-1">Alguns leitores já ultrapassaram o prazo de devolução.</p>
          </div>
        </div>
      )}

      {/* ============ SECÇÃO RENOVAÇÕES PENDENTES ============ */}
      {renovacoesPendentes.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <BellRing className="text-white animate-pulse" size={22} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-yellow-900">
                {renovacoesPendentes.length} pedido(s) de renovação a aguardar aprovação
              </h3>
              <p className="text-sm text-yellow-800 mt-0.5">
                Clientes pediram para estender o prazo de devolução. Aprova ou rejeita abaixo.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {loadingRenovacoes ? (
              <div className="bg-white/70 rounded-lg p-4 text-center text-sm text-yellow-800">
                <RefreshCw size={16} className="inline animate-spin mr-2" /> A carregar pedidos...
              </div>
            ) : (
              renovacoesPendentes.map((ren) => (
                <div key={ren.Id} className="bg-white rounded-xl border border-yellow-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Hourglass className="text-yellow-700" size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{ren.Obra}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <User size={10} /> {ren.Cliente}
                          {ren.ClienteTelefone && <span className="text-gray-400">· {ren.ClienteTelefone}</span>}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs mt-2">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Calendar size={11} /> Empréstimo: <strong>{ren.DataEmprestimo}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock size={11} /> Devolver até: <strong className="text-yellow-700">{ren.DataPrevistaDevolucao}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Hourglass size={11} /> Pedido em: {ren.SolicitadoEm}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAprovarRenovacao(ren.Id, ren.Obra, ren.Cliente)}
                        disabled={processandoRenovacao === ren.Id || !podeRenovar}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {processandoRenovacao === ren.Id ? (
                          <><RefreshCw size={12} className="animate-spin" /> A processar...</>
                        ) : (
                          <><ThumbsUp size={12} /> Aprovar +{diasEmprestimo}d</>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejeitarRenovacao(ren.Id, ren.Obra, ren.Cliente)}
                        disabled={processandoRenovacao === ren.Id || !podeRenovar}
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ThumbsDown size={12} /> Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-8 border-t-4 border-at-blue mb-8">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg">
              <BookMarked size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-at-blue">Novo Empréstimo</h2>
              <p className="text-xs text-gray-500 mt-0.5">Preenche os dados do empréstimo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!podeCriar && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
                <Lock size={16} /> Modo de Leitura
              </div>
            )}
            {user?.role === 'Admin' && (
              <button type="button" onClick={abrirModalConfig} className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-semibold transition-colors" title="Configurações do sistema">
                <Settings size={16} /> Configurar
              </button>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6 flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-blue-900">
            <strong>Informações:</strong> Prazo de empréstimo de <strong>{diasEmprestimo} dias</strong>. Multa de <strong>{valorMultaDia} MT/dia</strong> em caso de atraso.
          </div>
        </div>

        <form onSubmit={handleEmprestar} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Autocomplete label="Obra a Emprestar" options={opcoesObras} value={obraId} onChange={setObraId} placeholder="Escreve para pesquisar a obra..." icon={<BookOpen size={18} />} disabled={!podeCriar} />
            <Autocomplete label="Cliente / Leitor" options={opcoesClientes} value={clienteId} onChange={setClienteId} placeholder="Escreve para pesquisar o cliente..." icon={<User size={18} />} disabled={!podeCriar} />
          </div>

          {obraId && clienteId && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={14} /> Pré-visualização</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-gray-500 font-semibold">Data do Empréstimo</p><p className="font-bold text-gray-800">{new Date().toLocaleDateString('pt-PT')}</p></div>
                <div><p className="text-xs text-gray-500 font-semibold">Devolução Prevista</p><p className="font-bold text-red-600">{new Date(Date.now() + diasEmprestimo * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')}</p></div>
                <div><p className="text-xs text-gray-500 font-semibold">Multa por Atraso</p><p className="font-bold text-orange-600">{valorMultaDia} MT / dia</p></div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={processando || obras.length === 0 || clientes.length === 0 || !podeCriar} className="bg-at-blue text-white px-8 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
              {processando ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {processando ? 'A processar...' : 'Registar Empréstimo'}
            </button>
            <button type="button" onClick={() => { setObraId(''); setClienteId(''); }} disabled={!podeCriar} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Limpar</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-at-blue">
            Empréstimos Ativos ({emprestimos.length})
            {totalAtrasados > 0 && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">{totalAtrasados} em atraso</span>}
            {renovacoesPendentes.length > 0 && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold">{renovacoesPendentes.length} renovação(ões) pendente(s)</span>}
          </h3>
          <button onClick={() => setFiltroAtraso(!filtroAtraso)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${filtroAtraso ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Filter size={14} /> {filtroAtraso ? 'A mostrar só atrasados' : 'Mostrar só atrasados'}
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-at-blue text-white text-sm">
                  <th className="p-4 font-semibold">Obra</th>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Empréstimo</th>
                  <th className="p-4 font-semibold">Devolver até</th>
                  <th className="p-4 font-semibold text-center">Estado</th>
                  <th className="p-4 font-semibold text-right">Multa</th>
                  <th className="p-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {emprestimosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-gray-500">{filtroAtraso ? 'Nenhum empréstimo em atraso. 🎉' : 'Nenhum empréstimo ativo.'}</td></tr>
                ) : (
                  emprestimosFiltrados.map((emp) => {
                    const atrasado = emp.DiasAtraso > 0;
                    const urgencia = nivelUrgencia(emp.DiasAtraso, emp.DataPrevistaDevolucao);
                    const renovacaoPend = isRenovacaoPendente(emp.RenovacaoPendente);
                    return (
                      <tr key={emp.Id} className={`border-b border-gray-100 transition-colors ${atrasado ? 'bg-red-50/40 hover:bg-red-50' : renovacaoPend ? 'bg-yellow-50/40 hover:bg-yellow-50' : 'hover:bg-gray-50'}`}>
                        <td className="p-4 font-medium">
                          {emp.Obra}
                          {renovacaoPend && (
                            <span className="ml-2 inline-flex items-center gap-1 bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Hourglass size={10} /> Renov. Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-4">{emp.Cliente}</td>
                        <td className="p-4">{emp.DataEmprestimo}</td>
                        <td className={`p-4 font-semibold ${atrasado ? 'text-red-600' : 'text-gray-700'}`}>{emp.DataPrevistaDevolucao}</td>
                        <td className="p-4 text-center">
                          {urgencia === 'atrasado' && <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-200"><AlertTriangle size={12} /> Atrasado {emp.DiasAtraso}d</span>}
                          {urgencia === 'urgente' && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-amber-200"><Clock size={12} /> Vence em breve</span>}
                          {urgencia === 'ok' && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-200"><Clock size={12} /> Em dia</span>}
                        </td>
                        <td className="p-4 text-right">
                          {emp.ValorMulta > 0 ? <span className="font-bold text-red-600">{emp.ValorMulta.toLocaleString('pt-MZ')} MT</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button onClick={() => navigate(`/comprovativo/${emp.Id}`)} className="bg-at-blue text-white px-3 py-1 rounded text-xs font-semibold hover:bg-at-blue-light transition-colors inline-flex items-center gap-1" title="Ver comprovativo"><Printer size={12} /> Comprovativo</button>
                            <button onClick={() => handleRenovarDireto(emp.Id)} disabled={!podeRenovar} className="bg-yellow-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={podeRenovar ? "Renovar diretamente (admin)" : "Sem permissão"}>+{diasEmprestimo}d</button>
                            <button onClick={() => handleDevolver(emp.Id, emp.Obra)} disabled={!podeDevolver} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={podeDevolver ? "Devolver" : "Sem permissão"}>Devolver</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalConfigAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-at-blue to-at-blue-light flex items-center justify-center text-white shadow-lg"><Settings size={20} /></div>
                <div><h3 className="text-lg font-bold text-at-blue">Configurações do Sistema</h3><p className="text-xs text-gray-500">Definições dos empréstimos</p></div>
              </div>
              <button type="button" onClick={() => setModalConfigAberto(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Dias de Empréstimo</label>
                <p className="text-xs text-gray-500 mb-2">Prazo padrão para devolução das obras</p>
                <input type="number" min={1} max={365} value={configTemporaria.dias} onChange={(e) => setConfigTemporaria({ ...configTemporaria, dias: Number(e.target.value) || 1 })} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-center font-bold text-lg" />
                <div className="flex flex-wrap gap-2 mt-2">{[3, 7, 15, 30].map((d) => (<button key={d} type="button" onClick={() => setConfigTemporaria({ ...configTemporaria, dias: d })} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${configTemporaria.dias === d ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{d} dias</button>))}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Valor da Multa (MT/dia)</label>
                <p className="text-xs text-gray-500 mb-2">Valor cobrado por cada dia de atraso</p>
                <div className="relative">
                  <input type="number" min={0} max={100000} value={configTemporaria.multa} onChange={(e) => setConfigTemporaria({ ...configTemporaria, multa: Number(e.target.value) || 0 })} className="w-full p-3 pr-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue text-center font-bold text-lg" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">MT/dia</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">{[10, 20, 40, 50, 100].map((v) => (<button key={v} type="button" onClick={() => setConfigTemporaria({ ...configTemporaria, multa: v })} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${configTemporaria.multa === v ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{v} MT</button>))}</div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-bold text-blue-900 mb-1">📊 Como vai ficar:</p>
                <p className="text-xs text-blue-800">Empréstimo de <strong>{configTemporaria.dias} dias</strong> · Multa de <strong>{configTemporaria.multa} MT/dia</strong>. Um atraso de 5 dias = <strong>{(configTemporaria.multa * 5).toLocaleString('pt-MZ')} MT</strong>.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setModalConfigAberto(false)} className="px-5 py-2.5 rounded-md bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm">Cancelar</button>
              <button type="button" onClick={salvarConfiguracoes} disabled={salvandoConfig} className="px-5 py-2.5 rounded-md bg-at-blue text-white font-semibold hover:bg-at-blue-light transition-colors text-sm flex items-center gap-2 disabled:bg-gray-400">
                {salvandoConfig ? <><RefreshCw size={16} className="animate-spin" /> A guardar...</> : <><Save size={16} /> Guardar Configurações</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}