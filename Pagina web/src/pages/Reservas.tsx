import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Bookmark, Clock, User, Trash2, ArrowRight } from 'lucide-react';

interface Reserva {
  Id: number;
  ObraId: number;
  Obra: string;
  ObraStatus: string;
  Cliente: string;
  ClienteEmail: string | null;
  ClienteTelefone: string | null;
  DataReserva: string;
}

export function Reservas() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarReservas = async () => {
    try {
      const res = await apiFetch('/api/reservas');
      const data = await res.json();
      setReservas(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  useEffect(() => { carregarReservas(); }, []);

  const handleCancelar = async (id: number, cliente: string, obra: string) => {
    const ok = await confirm({
      title: 'Cancelar Reserva',
      message: `Tens a certeza que queres cancelar a reserva de "${cliente}" para a obra "${obra}"?`,
      confirmText: 'Cancelar Reserva',
      cancelText: 'Manter',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/reservas/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Reserva cancelada com sucesso.', 'success');
        carregarReservas();
      } else {
        showToast('Erro ao cancelar reserva.', 'error');
      }
    } catch (error) { showToast('Erro de ligação ao servidor.', 'error'); }
  };

  // Agrupar reservas por obra para mostrar a fila
  const reservasPorObra = reservas.reduce((acc: { [key: number]: Reserva[] }, reserva) => {
    if (!acc[reserva.ObraId]) acc[reserva.ObraId] = [];
    acc[reserva.ObraId].push(reserva);
    return acc;
  }, {});

  return (
    <main className="max-w-7xl mx-auto p-6 mt-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-2xl shadow-xl p-6 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Bookmark size={22} />
              </div>
              <h2 className="text-2xl font-bold">Gestão de Reservas</h2>
            </div>
            <p className="text-blue-100 text-sm">Fila de espera para obras emprestadas.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Reservas Pendentes</p>
            <p className="text-3xl font-bold mt-1">{reservas.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
          A carregar reservas...
        </div>
      ) : reservas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Bookmark size={56} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Sem reservas pendentes</h3>
          <p className="text-gray-500 text-sm mb-6">
            Quando alguém reservar uma obra emprestada, aparece aqui.
          </p>
          <Link to="/acervo"
            className="inline-flex items-center gap-2 bg-at-blue text-white px-6 py-3 rounded-md font-semibold hover:bg-at-blue-light transition-colors text-sm">
            Ver Acervo <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(reservasPorObra).map(([obraId, listaReservas]) => {
            const obra = listaReservas[0];
            const isEmprestada = obra.ObraStatus === 'EMPRESTADO';
            
            return (
              <div key={obraId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Cabeçalho da Obra */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-at-blue flex items-center justify-center text-white">
                      <Bookmark size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-at-blue">{obra.Obra}</h3>
                      <p className="text-xs text-gray-500">
                        {listaReservas.length} pessoa(s) na fila de espera
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isEmprestada 
                        ? 'bg-red-50 text-red-700 ring-1 ring-red-200' 
                        : 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isEmprestada ? 'bg-red-500' : 'bg-green-500'
                      }`}></span>
                      {obra.ObraStatus}
                    </span>
                    <Link 
                      to={`/obras/${obraId}`}
                      className="text-xs font-semibold text-at-blue hover:underline flex items-center gap-1">
                      Ver Obra <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Lista da fila */}
                <div className="divide-y divide-gray-50">
                  {listaReservas.map((reserva, index) => (
                    <div key={reserva.Id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-blue-50/20 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          index === 0 
                            ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-semibold text-gray-800 flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            {reserva.Cliente}
                          </p>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {reserva.ClienteEmail && <span>✉️ {reserva.ClienteEmail}</span>}
                            {reserva.ClienteTelefone && <span>📞 {reserva.ClienteTelefone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase font-semibold">Reservado em</p>
                          <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                            <Clock size={12} /> {reserva.DataReserva}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleCancelar(reserva.Id, reserva.Cliente, reserva.Obra)}
                          className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors ring-1 ring-red-200"
                          title="Cancelar reserva">
                          <Trash2 size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Aviso para o primeiro da fila */}
                {isEmprestada && (
                  <div className="bg-yellow-50 border-t border-yellow-100 px-6 py-3 text-xs text-yellow-800 font-medium flex items-center gap-2">
                    ⚠️ A obra está emprestada. O <strong>1º da fila</strong> deve ser notificado quando for devolvida.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}