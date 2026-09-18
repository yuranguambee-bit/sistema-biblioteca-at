import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextData {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextData>({} as ConfirmContextData);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    setIsOpen(false);
    if (resolver) resolver(value);
  };

  const variant = options.variant || 'info';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                variant === 'danger' ? 'bg-red-100' :
                variant === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                {variant === 'danger' ? '🗑️' : variant === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-2 ${
                  variant === 'danger' ? 'text-red-600' :
                  variant === 'warning' ? 'text-yellow-600' : 'text-at-blue'
                }`}>
                  {options.title || 'Confirmar Ação'}
                </h3>
                <p className="text-gray-600 text-sm">{options.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => handleConfirm(false)}
                className="px-5 py-2.5 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors text-sm">
                {options.cancelText || 'Cancelar'}
              </button>
              <button onClick={() => handleConfirm(true)}
                className={`px-5 py-2.5 rounded-md text-white font-semibold transition-colors text-sm ${
                  variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  variant === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  'bg-at-blue hover:bg-at-blue-light'
                }`}>
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}