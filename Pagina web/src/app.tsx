import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { CadastrarObra } from './pages/CadastrarObra';
import { CadastrarAutor } from './pages/CadastrarAutor';
import { CadastrarCliente } from './pages/CadastrarCliente';
import { ListaClientes } from './pages/ListaClientes';
import { DetalhesCliente } from './pages/DetalhesCliente';
import { CadastrarEditora } from './pages/CadastrarEditora';
import { Emprestimos } from './pages/Emprestimos';
import { Comprovativo } from './pages/Comprovativo';
import { HistoricoEmprestimos } from './pages/HistoricoEmprestimos';
import { Reservas } from './pages/Reservas';
import { Acervo } from './pages/Acervo';
import { DetalhesObra } from './pages/DetalhesObra';
import { Relatorios } from './pages/Relatorios';
import { Utilizadores } from './pages/Utilizadores';
import { Login } from './pages/Login';

function SistemaPrivado() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cadastrar-obra" element={<CadastrarObra />} />
        <Route path="/cadastrar-autor" element={<CadastrarAutor />} />
        <Route path="/cadastrar-cliente" element={<CadastrarCliente />} />
        <Route path="/clientes" element={<ListaClientes />} />
        <Route path="/clientes/:id" element={<DetalhesCliente />} />
        <Route path="/cadastrar-editora" element={<CadastrarEditora />} />
        <Route path="/emprestimos" element={<Emprestimos />} />
        <Route path="/comprovativo/:id" element={<Comprovativo />} />
        <Route path="/historico" element={<HistoricoEmprestimos />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/acervo" element={<Acervo />} />
        <Route path="/obras/:id" element={<DetalhesObra />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/utilizadores" element={<Utilizadores />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<SistemaPrivado />} />
            </Routes>
          </Router>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;