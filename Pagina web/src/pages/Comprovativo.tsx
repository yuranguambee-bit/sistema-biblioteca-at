import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft, Printer, BookOpen, XCircle } from 'lucide-react';

interface ComprovativoData {
  Id: number;
  DataEmprestimo: string;
  DataPrevistaDevolucao: string;
  DataDevolucao: string | null;
  Status: string;
  ClienteId: number;
  Cliente: string;
  ClienteEmail: string | null;
  ClienteTelefone: string | null;
  ObraId: number;
  Obra: string;
  ObraAno: number | null;
  Autor: string | null;
  Editora: string | null;
}

export function Comprovativo() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [data, setData] = useState<ComprovativoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/emprestimos/${id}/comprovativo`)
      .then((r) => {
        if (!r.ok) throw new Error('Comprovativo não encontrado');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => {
        console.error(e);
        showToast('Erro ao carregar o comprovativo.', 'error');
        setLoading(false);
      });
  }, [id]);

  const handleImprimir = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar comprovativo...
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <XCircle size={56} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Comprovativo não encontrado</h2>
          <p className="text-gray-500 text-sm mb-6">O empréstimo que procuras não existe.</p>
          <Link to="/emprestimos" className="bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors">
            Voltar aos Empréstimos
          </Link>
        </div>
      </main>
    );
  }

  const anoAtual = new Date().getFullYear();
  const numeroRecibo = `AT-${anoAtual}-${String(data.Id).padStart(5, '0')}`;

  const dataHoje = new Date().toLocaleDateString('pt-PT', { 
    day: '2-digit', month: 'long', year: 'numeric' 
  });

  return (
    <main className="max-w-3xl mx-auto p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link 
          to="/emprestimos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-at-blue hover:text-at-blue-light transition-colors"
        >
          <ArrowLeft size={16} /> Voltar aos Empréstimos
        </Link>
        <button 
          onClick={handleImprimir}
          className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors shadow-md"
        >
          <Printer size={18} /> Imprimir Comprovativo
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-10 print:rounded-none print:shadow-none print:p-8 border-2 border-at-blue print:border print:border-gray-400">
        
        <div className="text-center border-b-2 border-at-blue pb-6 mb-6">
          <div className="w-20 h-20 mx-auto bg-at-blue rounded-full flex items-center justify-center mb-3">
            <BookOpen className="text-white" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-at-blue">Autoridade Tributária de Moçambique</h1>
          <p className="text-sm text-gray-600 mt-1">Sistema de Gestão de Biblioteca</p>
          <h2 className="text-lg font-bold text-gray-800 mt-4 uppercase tracking-wider">
            Comprovativo de Empréstimo
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-300">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Nº de Comprovativo</p>
            <p className="text-lg font-bold text-at-blue font-mono">{numeroRecibo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Emitido em</p>
            <p className="text-sm font-semibold text-gray-700">{dataHoje}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-at-blue uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
            📖 Dados do Leitor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Nome</p>
              <p className="font-bold text-gray-800">{data.Cliente}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Nº de Registo</p>
              <p className="font-bold text-gray-800 font-mono">CLI-{String(data.ClienteId).padStart(5, '0')}</p>
            </div>
            {data.ClienteEmail && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                <p className="text-gray-700">{data.ClienteEmail}</p>
              </div>
            )}
            {data.ClienteTelefone && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Telefone</p>
                <p className="text-gray-700">{data.ClienteTelefone}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-at-blue uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
            📚 Dados da Obra
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase">Título</p>
              <p className="font-bold text-gray-800 text-base">{data.Obra}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Autor</p>
              <p className="text-gray-700">{data.Autor || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Editora</p>
              <p className="text-gray-700">{data.Editora || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Ano de Publicação</p>
              <p className="text-gray-700">{data.ObraAno || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Código da Obra</p>
              <p className="font-mono text-gray-700">OBR-{String(data.ObraId).padStart(5, '0')}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-at-blue uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
            📅 Datas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 print:bg-white print:border print:border-gray-300">
              <p className="text-xs text-gray-500 font-semibold uppercase">Data do Empréstimo</p>
              <p className="font-bold text-gray-800">{data.DataEmprestimo}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 print:bg-white print:border print:border-gray-300">
              <p className="text-xs text-gray-500 font-semibold uppercase">Devolução Prevista</p>
              <p className="font-bold text-red-700">{data.DataPrevistaDevolucao}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 print:bg-white print:border print:border-gray-300">
              <p className="text-xs text-gray-500 font-semibold uppercase">Status</p>
              <p className="font-bold text-gray-800">{data.Status}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 print:bg-white print:border print:border-gray-400">
          <p className="text-xs text-yellow-800 font-bold uppercase mb-2">⚠️ Regras Importantes</p>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>O leitor compromete-se a devolver a obra na data prevista.</li>
            <li>Em caso de atraso, poderá ser aplicada uma penalização.</li>
            <li>O leitor é responsável pela conservação da obra emprestada.</li>
            <li>Este comprovativo deve ser apresentado em caso de devolução.</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-12 pt-8">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-gray-500 font-semibold">Assinatura do Leitor</p>
              <p className="text-xs text-gray-400 mt-1">{data.Cliente}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-gray-500 font-semibold">Assinatura do Bibliotecário</p>
              <p className="text-xs text-gray-400 mt-1">Autoridade Tributária de Moçambique</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Documento emitido automaticamente pelo Sistema de Gestão de Biblioteca — AT Moçambique
          </p>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            {numeroRecibo} · {dataHoje}
          </p>
        </div>
      </div>
    </main>
  );
}