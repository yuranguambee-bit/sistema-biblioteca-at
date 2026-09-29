import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { RotaPermissao } from './components/RotaPermissao';
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
import { Permissoes } from './pages/Permissoes';
import { Perfil } from './pages/Perfil';
import { Manual } from './pages/Manual';
import { Login } from './pages/Login';

function SistemaPrivado() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Routes>
        {/* Rotas sempre acessíveis (qualquer utilizador autenticado) */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/clientes/:id" element={<DetalhesCliente />} />
        <Route path="/obras/:id" element={<DetalhesObra />} />
        <Route path="/comprovativo/:id" element={<Comprovativo />} />

        {/* Rotas protegidas por permissão */}
        <Route path="/cadastrar-obra" element={
          <RotaPermissao chave="obras"><CadastrarObra /></RotaPermissao>
        } />
        <Route path="/cadastrar-autor" element={
          <RotaPermissao chave="autores"><CadastrarAutor /></RotaPermissao>
        } />
        <Route path="/cadastrar-cliente" element={
          <RotaPermissao chave="clientes"><CadastrarCliente /></RotaPermissao>
        } />
        <Route path="/clientes" element={
          <RotaPermissao chave="clientes"><ListaClientes /></RotaPermissao>
        } />
        <Route path="/cadastrar-editora" element={
          <RotaPermissao chave="editoras"><CadastrarEditora /></RotaPermissao>
        } />
        <Route path="/emprestimos" element={
          <RotaPermissao chave="emprestimos"><Emprestimos /></RotaPermissao>
        } />
        <Route path="/historico" element={
          <RotaPermissao chave="historico"><HistoricoEmprestimos /></RotaPermissao>
        } />
        <Route path="/reservas" element={
          <RotaPermissao chave="reservas"><Reservas /></RotaPermissao>
        } />
        <Route path="/acervo" element={
          <RotaPermissao chave="acervo"><Acervo /></RotaPermissao>
        } />
        <Route path="/relatorios" element={
          <RotaPermissao chave="relatorios"><Relatorios /></RotaPermissao>
        } />
        <Route path="/manual" element={
          <RotaPermissao chave="manual"><Manual /></RotaPermissao>
        } />

        {/* Rotas exclusivas do Admin */}
        <Route path="/utilizadores" element={<Utilizadores />} />
        <Route path="/permissoes" element={<Permissoes />} />

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