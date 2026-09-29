import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface RotaPermissaoProps {
  chave: string;
  children: ReactNode;
}

export function RotaPermissao({ chave, children }: RotaPermissaoProps) {
  const { temPermissao } = useAuth();

  if (!temPermissao(chave)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}