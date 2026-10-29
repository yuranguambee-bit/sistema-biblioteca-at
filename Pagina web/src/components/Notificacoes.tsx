import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, BookOpen, User, CheckCircle, Trash2, X } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Notificacao {
  Id: number;
  Titulo: string;
  Mensagem: string;
  Tipo: string;
  Lida: boolean;
  Link: string | null;
  Data: string;
  Hora: string;
}

export function Notificacoes() {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCliente = user?.role === 'Cliente';

  const carregarContagem = () => {
    apiFetch('/api/notificacoes/contagem')
      .then((r) => r.json())
      .then((data) => setNaoLidas(data.naoLidas || 0))
      .catch(console.error);
  };

  const carregarNotificacoes = () => {
    setLoading(true);
    apiFetch('/api/notificacoes')
      .then((r) => r.json())
      .then((data) => {
        setNotificacoes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    carregarContagem();
    const intervalo = setInterval(carregarContagem, 30000); // 30 em 30 seg
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (aberto) carregarNotificacoes();
  }, [aberto]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickFora(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const marcarComoLida = async (id: number) => {
    try {
      await apiFetch(`/api/notificacoes/${id}/ler`, { method: 'PUT' });
      setNotificacoes((prev) =>
        prev.map((n) => (n.Id === id ? { ...n, Lida: true } : n))
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await apiFetch('/api/notificacoes/ler-todas', { method: 'PUT' });
      setNotificacoes((prev) => prev.map((n) => ({ ...n, Lida: true })));
      setNaoLidas(0);
    } catch (e) {
      console.error(e);
    }
  };

  const apagarNotificacao = async (id: number, lida: boolean) => {
    try {
      await apiFetch(`/api/notificacoes/${id}`, { method: 'DELETE' });
      setNotificacoes((prev) => prev.filter((n) => n.Id !== id));
      if (!lida) setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const iconePorTipo = (tipo: string) => {
    switch (tipo) {
      case 'EMPRESTIMO': return <BookOpen size={16} className="text-blue-600" />;
      case 'DEVOLUCAO': return <CheckCircle size={16} className="text-green-600" />;
      case 'RESERVA': return <Bookmark size={16} className="text-yellow-600" />;
      case 'UTILIZADOR': return <User size={16} className="text-purple-600" />;
      default: return <Bell size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white"
        title="Notificações"
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center animate-pulse">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-scale-in">
          {/* Cabeçalho do Dropdown */}
          <div className="bg-gradient-to-r from-at-blue to-at-blue-light p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <h3 className="font-bold text-sm">Notificações</h3>
              {naoLidas > 0 && (
                <span className="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {naoLidas} novas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasComoLidas}
                  className="text-xs text-blue-100 hover:text-white transition-colors flex items-center gap-1 p-1 rounded"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setAberto(false)} className="text-blue-100 hover:text-white p-1 rounded">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">A carregar...</div>
            ) : notificacoes.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Sem notificações</p>
              </div>
            ) : (
              notificacoes.map((n) => {
                const conteudo = (
                  <div
                    className={`p-3 hover:bg-blue-50/50 transition-colors flex items-start gap-3 ${
                      !n.Lida ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      !n.Lida ? 'bg-white shadow-sm' : 'bg-gray-50'
                    }`}>
                      {iconePorTipo(n.Tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${!n.Lida ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.Titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.Mensagem}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {n.Data} às {n.Hora}
                      </p>
                    </div>
                    {!n.Lida && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>
                    )}
                  </div>
                );

                return (
                  <div key={n.Id} className="relative group">
                    {n.Link ? (
                      <Link
                        to={n.Link}
                        onClick={() => {
                          if (!n.Lida) marcarComoLida(n.Id);
                          setAberto(false);
                        }}
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <button
                        onClick={() => { if (!n.Lida) marcarComoLida(n.Id); }}
                        className="w-full text-left"
                      >
                        {conteudo}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        apagarNotificacao(n.Id, n.Lida);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 bg-white rounded-full shadow-sm"
                      title="Apagar notificação"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé */}
          {notificacoes.length > 0 && (
            <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400">
                {isCliente ? 'As tuas notificações pessoais' : 'Notificações do sistema'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Ícone para reservas
function Bookmark({ size, className }: { size: number, className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>;
}