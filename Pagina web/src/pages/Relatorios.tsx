import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { 
  Download, Printer, BookOpen, AlertTriangle, 
  Users, Award, BookX, RefreshCw, FileText 
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export function Relatorios() {
  const { showToast } = useToast();
  const [abaAtiva, setAbaAtiva] = useState('inventario');
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<any[]>([]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (abaAtiva === 'inventario') endpoint = '/api/relatorios/inventario';
      else if (abaAtiva === 'emprestimos') endpoint = '/api/relatorios/emprestimos';
      else if (abaAtiva === 'atrasos') endpoint = '/api/relatorios/atrasos';
      else if (abaAtiva === 'clientes') endpoint = '/api/relatorios/clientes';
      else if (abaAtiva === 'top-leitores') endpoint = '/api/relatorios/top-leitores';
      else if (abaAtiva === 'nunca-emprestadas') endpoint = '/api/relatorios/nunca-emprestadas';

      const res = await apiFetch(endpoint);
      const data = await res.json();
      setDados(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast('Erro ao carregar relatório.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  const handleExportarExcel = () => {
    if (dados.length === 0) {
      showToast('Não há dados para exportar.', 'warning');
      return;
    }
    
    const cabecalhos = Object.keys(dados[0]);
    const csvContent = [
      cabecalhos.join(';'),
      ...dados.map(row => cabecalhos.map(c => `"${row[c] || ''}"`).join(';'))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${abaAtiva}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Ficheiro Excel gerado com sucesso!', 'success');
  };

  const handleImprimir = () => {
    window.print();
  };

  const formatarCabecalho = (texto: string) => {
    const resultado = texto.replace(/([A-Z])/g, ' $1').trim();
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
  };

  const abas = [
    { id: 'inventario', label: 'Inventário', icon: <BookOpen size={16} /> },
    { id: 'emprestimos', label: 'Empréstimos', icon: <BookOpen size={16} /> },
    { id: 'atrasos', label: 'Atrasos e Multas', icon: <AlertTriangle size={16} /> },
    { id: 'clientes', label: 'Clientes', icon: <Users size={16} /> },
    { id: 'top-leitores', label: 'Top Leitores', icon: <Award size={16} /> },
    { id: 'nunca-emprestadas', label: 'Nunca Emprestadas', icon: <BookX size={16} /> },
  ];

  return (
    <main className="max-w-6xl mx-auto p-4 lg:p-8 mt-2 animate-fade-up print:p-0 print:mt-0 print:max-w-full">
      
      <div className="bg-[#002B5C] rounded-3xl shadow-xl p-8 mb-6 text-white relative overflow-hidden flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold mb-1">Relatórios</h1>
          <p className="text-blue-200 text-sm">Gere, exporta e imprime relatórios do sistema.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportarExcel} 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
            disabled={dados.length === 0}
          >
            <Download size={16} /> Exportar Excel
          </button>
          <button 
            onClick={handleImprimir} 
            className="flex items-center gap-2 bg-[#001F42] hover:bg-black px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
            disabled={dados.length === 0}
          >
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-2 mb-6 flex overflow-x-auto gap-2 scrollbar-hide print:hidden">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap ${
              abaAtiva === aba.id 
                ? 'bg-[#002B5C] text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 min-h-[500px] print:shadow-none print:p-0">
        
        <div className="text-center mb-8 border-b-2 border-gray-200 pb-6 print:border-gray-400">
          <h2 className="text-2xl font-bold text-[#002B5C] uppercase tracking-wide print:text-black">
            Autoridade Tributária de Moçambique
          </h2>
          <p className="text-gray-700 text-lg font-semibold mt-1">
            Relatório de {abas.find(a => a.id === abaAtiva)?.label}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Emitido em: {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <RefreshCw size={32} className="animate-spin text-[#002B5C] mb-4" />
            <p className="font-medium">A carregar dados do relatório...</p>
          </div>
        ) : dados.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText size={56} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum registo encontrado.</p>
            <p className="text-sm">Não existem dados para este relatório de momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse print:text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider print:bg-gray-200 print:text-black">
                  {Object.keys(dados[0]).map((key) => (
                    <th key={key} className="px-4 py-3 font-bold border-b border-gray-300">
                      {formatarCabecalho(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dados.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100 print:border-gray-300 print:text-black">
                        {val === null || val === '' ? <span className="text-gray-400 italic">—</span> : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="hidden print:block mt-8 text-center text-xs text-gray-500 pt-4 border-t border-gray-300">
          Documento gerado pelo Sistema de Gestão de Biblioteca da AT Moçambique.
        </div>

      </div>
    </main>
  );
}