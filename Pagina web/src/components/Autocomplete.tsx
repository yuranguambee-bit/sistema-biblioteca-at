import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface Opcao {
  id: number | string;
  label: string;
  sublabel?: string;
}

interface AutocompleteProps {
  options: Opcao[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  required?: boolean;
  disabled?: boolean; // <- NOVO
}

export function Autocomplete({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Pesquisar...',
  label,
  icon,
  required = false,
  disabled = false // <- NOVO
}: AutocompleteProps) {
  const [aberto, setAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [indiceRealcado, setIndiceRealcado] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const opcaoSelecionada = useMemo(() => {
    return options.find((o) => String(o.id) === String(value));
  }, [options, value]);

  const opcoesFiltradas = useMemo(() => {
    if (!pesquisa.trim()) return options;
    const p = pesquisa.toLowerCase();
    return options.filter((o) =>
      o.label.toLowerCase().includes(p) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(p))
    );
  }, [options, pesquisa]);

  useEffect(() => {
    setIndiceRealcado(0);
  }, [pesquisa]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setAberto(false);
        setPesquisa('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!aberto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setAberto(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceRealcado((prev) => Math.min(prev + 1, opcoesFiltradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceRealcado((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (opcoesFiltradas[indiceRealcado]) {
        onChange(String(opcoesFiltradas[indiceRealcado].id));
        setAberto(false);
        setPesquisa('');
      }
    } else if (e.key === 'Escape') {
      setAberto(false);
      setPesquisa('');
    }
  };

  const handleSelecionar = (opcao: Opcao) => {
    onChange(String(opcao.id));
    setAberto(false);
    setPesquisa('');
  };

  const handleLimpar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setPesquisa('');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
          {disabled && <span className="text-xs text-red-400 flex items-center gap-1"><X size={12}/> Bloqueado</span>}
        </label>
      )}

      <div
        onClick={() => {
          if (disabled) return;
          setAberto(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full min-h-[46px] px-3 py-2.5 border rounded-md flex items-center gap-2 transition-all ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
            : aberto
            ? 'border-at-blue ring-2 ring-at-blue/20 bg-white cursor-pointer'
            : 'border-gray-300 hover:border-gray-400 bg-white cursor-pointer'
        }`}
      >
        {icon && <div className={`flex-shrink-0 ${disabled ? 'text-gray-400' : 'text-gray-400'}`}>{icon}</div>}

        {aberto && !disabled ? (
          <input
            ref={inputRef}
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={opcaoSelecionada ? opcaoSelecionada.label : placeholder}
            className="flex-1 outline-none bg-transparent text-sm"
            autoFocus
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${opcaoSelecionada ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
            {opcaoSelecionada ? opcaoSelecionada.label : placeholder}
          </span>
        )}

        {opcaoSelecionada && !aberto && !disabled && (
          <button
            type="button"
            onClick={handleLimpar}
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Limpar"
          >
            <X size={16} />
          </button>
        )}

        <ChevronDown
          size={18}
          className={`text-gray-400 flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`}
        />
      </div>

      {aberto && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              {opcoesFiltradas.length} resultado{opcoesFiltradas.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400">↑↓ navegar · Enter escolher</span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {opcoesFiltradas.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Search size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Nenhum resultado</p>
              </div>
            ) : (
              opcoesFiltradas.map((opcao, index) => {
                const selecionada = String(opcao.id) === String(value);
                const realcada = index === indiceRealcado;

                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => handleSelecionar(opcao)}
                    onMouseEnter={() => setIndiceRealcado(index)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      realcada ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } ${selecionada ? 'bg-blue-100/50' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selecionada ? 'bg-at-blue text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selecionada ? <Check size={16} /> : <span className="text-xs font-bold">{opcao.label[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${selecionada ? 'font-bold text-at-blue' : 'font-medium text-gray-700'}`}>
                        {opcao.label}
                      </p>
                      {opcao.sublabel && (
                        <p className="text-xs text-gray-400 truncate">{opcao.sublabel}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}