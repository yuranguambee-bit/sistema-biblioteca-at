import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  Bell, Check, CheckCheck, Trash2, X, 
  BookMarked, Bookmark, CheckCircle, AlertTriangle, Info, User
} from 'lucide-react';

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
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const carregarNotificacoes = async () => {
    try {
      const [resLista, resContagem] = await Promise.all([
        apiFetch('/api/notificacoes').then((r) => r.json()),
        apiFetch('/api/notificacoes/contagem').then((r) => r.json()),
      ]);
      setNotificacoes(Array.isArray(resLista) ? resLista : []);
      setNaoLidas(resContagem.naoLidas || 0);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
    const intervalo = setInterval(carregarNotificacoes, 20000); // A cada 20s
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarcarLida = async (id: number) => {
    try {
      await apiFetch(`/api/notificacoes/${id}/ler`, { method: 'PUT' });
      carregarNotificacoes();
    } catch (error) { console.error(error); }
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await apiFetch('/api/notificacoes/ler-todas', { method: 'PUT' });
      showToast('Todas marcadas como lidas.', 'success');
      carregarNotificacoes();
    } catch (error) { console.error(error); }
  };

  const handleEliminar = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/notificacoes/${id}`, { method: 'DELETE' });
      carregarNotificacoes();
    } catch (error) { console.error(error); }
  };

  const handleClickNotif = (notif: Notificacao) => {
    if (!notif.Lida) handleMarcarLida(notif.Id);
    if (notif.Link) {
      setAberto(false);
      navigate(notif.Link);
    }
  };

  // Ícone por tipo de notificação
  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'EMPRESTIMO': return <BookMarked size={16} className="text-red-600" />;
      case 'DEVOLUCAO': return <CheckCircle size={16} className="text-green-600" />;
      case 'RESERVA': return <Bookmark size={16} className="text-yellow-600" />;
      case 'OBRA': return <BookMarked size={16} className="text-blue-600" />;
      case 'ATRASO': return <AlertTriangle size={16} className="text-red-600" />;
      case 'UTILIZADOR': return <User size={16} className="text-purple-600" />;
      default: return <Info size={16} className="text-gray-600" />;
    }
  };

  const getCorFundo = (tipo: string, lida: boolean) => {
    if (lida) return 'bg-white hover:bg-gray-50';
    switch (tipo) {
      case 'EMPRESTIMO': return 'bg-red-50/60 hover:bg-red-50';
      case 'DEVOLUCAO': return 'bg-green-50/60 hover:bg-green-50';
      case 'RESERVA': return 'bg-yellow-50/60 hover:bg-yellow-50';
      case 'OBRA': return 'bg-blue-50/60 hover:bg-blue-50';
      case 'ATRASO': return 'bg-red-50/60 hover:bg-red-50';
      case 'UTILIZADOR': return 'bg-purple-50/60 hover:bg-purple-50';
      default: return 'bg-blue-50/40 hover:bg-blue-50';
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Botão sino */}
      <button
        onClick={() => setAberto(!aberto)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        title="Notificações"
      >
        <Bell size={18} className={naoLidas > 0 ? 'animate-pulse' : ''} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-at-blue">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 mt-3 w-[380px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[90] animate-fade-down">
          {/* Cabeçalho */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-at-blue" />
              <h3 className="text-sm font-bold text-at-blue">Notificações</h3>
              {naoLidas > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {naoLidas} novas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  onClick={handleMarcarTodasLidas}
                  className="text-xs text-at-blue hover:underline font-semibold flex items-center gap-1 p-1 rounded hover:bg-blue-50 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={14} /> Marcar todas
                </button>
              )}
              <button
                onClick={() => setAberto(false)}
                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition-colors"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[450px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Bell size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">Sem notificações</p>
                <p className="text-xs mt-1">As novidades aparecem aqui</p>
              </div>
            ) : (
              notificacoes.map((notif) => (
                <div
                  key={notif.Id}
                  onClick={() => handleClickNotif(notif)}
                  className={`group p-4 border-b border-gray-50 cursor-pointer transition-colors relative ${getCorFundo(notif.Tipo, notif.Lida)}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notif.Lida ? 'bg-gray-100' : 'bg-white shadow-sm border border-gray-100'
                    }`}>
                      {getIcone(notif.Tipo)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${notif.Lida ? 'text-gray-500' : 'text-gray-800'}`}>
                          {notif.Titulo}
                        </p>
                        {!notif.Lida && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5 animate-pulse"></span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${notif.Lida ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notif.Mensagem}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                        🕒 {notif.Data} às {notif.Hora}
                      </p>
                    </div>
                  </div>

                  {/* Ações (aparecem no hover) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.Lida && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarcarLida(notif.Id); }}
                        className="bg-white shadow-sm border border-gray-200 text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                        title="Marcar como lida"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleEliminar(notif.Id, e)}
                      className="bg-white shadow-sm border border-gray-200 text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé */}
          {notificacoes.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50/70 text-center">
              <button
                onClick={() => { setAberto(false); carregarNotificacoes(); }}
                className="text-xs font-semibold text-at-blue hover:underline"
              >
                Atualizar lista
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}