import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Permissoes {
  obras?: boolean;
  autores?: boolean;
  clientes?: boolean;
  editoras?: boolean;
  emprestimos?: boolean;
  reservas?: boolean;
  historico?: boolean;
  acervo?: boolean;
  relatorios?: boolean;
  manual?: boolean;

  obras_criar?: boolean;
  obras_editar?: boolean;
  obras_apagar?: boolean;
  obras_campo_titulo?: boolean;
  obras_campo_ano?: boolean;
  obras_campo_exemplares?: boolean;
  obras_campo_autor?: boolean;
  obras_campo_editora?: boolean;
  obras_campo_numeroedicao?: boolean;
  obras_campo_nacionalidadelivro?: boolean;
  obras_campo_isbn?: boolean; // <- NOVO

  autores_criar?: boolean;
  autores_editar?: boolean;
  autores_apagar?: boolean;
  autores_campo_nome?: boolean;
  autores_campo_sobrenome?: boolean;
  autores_campo_nacionalidade?: boolean;
  autores_campo_datanascimento?: boolean;
  autores_campo_biografia?: boolean;
  autores_campo_sexo?: boolean;
  autores_campo_tiposlivros?: boolean;

  editoras_criar?: boolean;
  editoras_editar?: boolean;
  editoras_apagar?: boolean;
  editoras_campo_nome?: boolean;
  editoras_campo_endereco?: boolean;
  editoras_campo_telefone?: boolean;
  editoras_campo_email?: boolean;
  editoras_campo_website?: boolean;
  editoras_campo_paisorigem?: boolean;

  clientes_criar?: boolean;
  clientes_editar?: boolean;
  clientes_apagar?: boolean;
  clientes_campo_nome?: boolean;
  clientes_campo_email?: boolean;
  clientes_campo_telefone?: boolean;
  clientes_campo_pi?: boolean;
  clientes_campo_nuit?: boolean;

  emprestimos_criar?: boolean;
  emprestimos_renovar?: boolean;
  emprestimos_devolver?: boolean;

  reservas_criar?: boolean;
  reservas_cancelar?: boolean;

  [key: string]: boolean | undefined;
}

interface User {
  id: number;
  nome: string;
  email: string;
  role: string;
  permissoes?: Permissoes;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  temPermissao: (chave: string) => boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('@biblioteca:user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('@biblioteca:token'));

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('@biblioteca:user', JSON.stringify(user));
    localStorage.setItem('@biblioteca:token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('@biblioteca:user');
    localStorage.removeItem('@biblioteca:token');
  };

  const temPermissao = useCallback((chave: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return user.permissoes?.[chave] === true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, temPermissao }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}