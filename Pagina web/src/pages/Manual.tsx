import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Search, User, BookMarked, Bookmark, Users, Building2, 
  BarChart3, Settings, Shield, Mail, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Info, Printer, FileText, Lock,
  Award, Clock, TrendingUp, Hash, Sparkles, ArrowRight
} from 'lucide-react';

interface Seccao {
  id: string;
  titulo: string;
  icone: React.ReactNode;
  cor: string;
  conteudo: React.ReactNode;
}

export function Manual() {
  const [pesquisa, setPesquisa] = useState('');
  const [abertas, setAbertas] = useState<string[]>(['introducao']);

  const toggleSeccao = (id: string) => {
    setAbertas((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const abrirTodas = () => setAbertas(seccoes.map((s) => s.id));
  const fecharTodas = () => setAbertas([]);

  const seccoes: Seccao[] = useMemo(() => [
    // ============ INTRODUÇÃO ============
    {
      id: 'introducao',
      titulo: 'Introdução ao Sistema',
      icone: <Sparkles size={20} />,
      cor: 'blue',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Bem-vindo ao <strong>Sistema de Gestão de Biblioteca</strong> da Autoridade Tributária de Moçambique. 
            Este sistema permite gerir de forma integrada o acervo bibliográfico, empréstimos, reservas, 
            clientes e relatórios.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Info size={16} /> O que podes fazer neste sistema?
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Cadastrar e gerir obras, autores, editoras e clientes</li>
              <li>Realizar empréstimos com comprovativos imprimíveis</li>
              <li>Controlar devoluções, renovações e multas por atraso</li>
              <li>Gerir reservas em fila de espera</li>
              <li>Gerar relatórios e exportar para Excel/PDF</li>
              <li>Configurar prazos e valores de multa personalizados</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">📚</div>
              <p className="text-sm font-bold text-gray-700">Acervo</p>
              <p className="text-xs text-gray-500 mt-1">Livros e publicações</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">📤</div>
              <p className="text-sm font-bold text-gray-700">Empréstimos</p>
              <p className="text-xs text-gray-500 mt-1">Gestão de saídas</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm font-bold text-gray-700">Relatórios</p>
              <p className="text-xs text-gray-500 mt-1">Análises e exports</p>
            </div>
          </div>
        </div>
      ),
    },

    // ============ PRIMEIROS PASSOS ============
    {
      id: 'primeiros-passos',
      titulo: 'Primeiros Passos',
      icone: <CheckCircle size={20} />,
      cor: 'green',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Para começar a usar o sistema, segue esta sequência recomendada:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <p className="font-bold text-green-900">Fazer login</p>
                <p className="text-sm text-green-800 mt-1">
                  Usa as tuas credenciais para aceder ao sistema. 
                  Se és novo utilizador, pede ao administrador para te criar uma conta.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <p className="font-bold text-green-900">Cadastrar Autores e Editoras</p>
                <p className="text-sm text-green-800 mt-1">
                  Antes de cadastrar obras, precisas de ter autores e editoras registados.
                  Vai a "Cadastrar Autor" e "Editoras" no menu superior.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <p className="font-bold text-green-900">Cadastrar Obras</p>
                <p className="text-sm text-green-800 mt-1">
                  Agora podes cadastrar obras. Podes definir vários exemplares de uma só vez 
                  (ex: 5 cópias do mesmo livro).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
              <div>
                <p className="font-bold text-green-900">Cadastrar Clientes</p>
                <p className="text-sm text-green-800 mt-1">
                  Regista os leitores que irão requisitar obras. 
                  Recomendamos guardar email e telefone para contacto.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">5</div>
              <div>
                <p className="font-bold text-green-900">Começar a Emprestar!</p>
                <p className="text-sm text-green-800 mt-1">
                  Já podes realizar empréstimos. O sistema gera automaticamente 
                  o comprovativo e controla os prazos.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ============ GESTÃO DE OBRAS ============
    {
      id: 'obras',
      titulo: 'Gestão de Obras',
      icone: <BookOpen size={20} />,
      cor: 'blue',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            As obras são os livros e publicações do acervo da biblioteca.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Hash size={16} className="text-at-blue" /> Como Cadastrar uma Obra
            </p>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Clica em <strong>"Cadastrar Obra"</strong> no menu superior</li>
              <li>Preenche o <strong>título</strong> da obra</li>
              <li>Define o <strong>ano de publicação</strong></li>
              <li>Escolhe o <strong>número de exemplares</strong> (se tiveres 3 cópias, coloca 3)</li>
              <li>Pesquisa e seleciona o <strong>Autor</strong> (usa as setas ↑↓ para navegar)</li>
              <li>Pesquisa e seleciona a <strong>Editora</strong></li>
              <li>Clica em <strong>"Guardar"</strong></li>
            </ol>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-900">
              💡 <strong>Dica:</strong> Se criares 3 exemplares de uma só vez, o sistema cria 3 registos 
              independentes. Cada um pode ser emprestado separadamente a pessoas diferentes.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Search size={16} className="text-at-blue" /> Página do Acervo
            </p>
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
              <li><strong>Pesquisa em tempo real</strong> — escreve e vê os resultados a filtrar</li>
              <li><strong>Filtros avançados</strong> — por autor, editora e estado</li>
              <li><strong>Exportar Excel</strong> — descarrega o inventário em CSV</li>
              <li><strong>Imprimir PDF</strong> — gera um relatório imprimível</li>
              <li><strong>Ver Detalhes</strong> — clica em qualquer obra para ver o histórico</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ============ EMPRÉSTIMOS ============
    {
      id: 'emprestimos',
      titulo: 'Empréstimos e Devoluções',
      icone: <BookMarked size={20} />,
      cor: 'red',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            O módulo mais importante do sistema — onde registas saídas e entradas de obras.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <BookMarked size={16} className="text-red-600" /> Como Registar um Empréstimo
            </p>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Clica em <strong>"Empréstimos"</strong> no menu</li>
              <li>Pesquisa e escolhe a <strong>obra</strong> (usa autocomplete)</li>
              <li>Pesquisa e escolhe o <strong>cliente</strong></li>
              <li>Vê a <strong>pré-visualização</strong> com a data de devolução prevista</li>
              <li>Clica em <strong>"Registar Empréstimo"</strong></li>
              <li>O comprovativo é gerado automaticamente — podes imprimir!</li>
            </ol>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" /> Devolução
            </p>
            <p className="text-sm text-gray-700">
              Na tabela de empréstimos ativos, clica em <strong>"Devolver"</strong> na obra a devolver. 
              Confirma no modal. A obra volta automaticamente a estar disponível.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Clock size={16} className="text-yellow-600" /> Renovação
            </p>
            <p className="text-sm text-gray-700">
              Se o leitor precisar de mais tempo, clica em <strong>"+15 dias"</strong> (ou o valor configurado). 
              A data de devolução prevista é estendida automaticamente.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" /> Multas por Atraso
            </p>
            <p className="text-sm text-gray-700 mb-2">
              O sistema calcula automaticamente as multas baseado nas configurações:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Empréstimos atrasados aparecem destacados em <span className="text-red-600 font-bold">vermelho</span></li>
              <li>A <strong>multa é mostrada</strong> na coluna "Multa" da tabela</li>
              <li>O <strong>badge vermelho no menu</strong> mostra o total de atrasados</li>
              <li>Usa o botão <strong>"Mostrar só atrasados"</strong> para focar apenas nesses</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Printer size={16} className="text-at-blue" /> Comprovativo de Empréstimo
            </p>
            <p className="text-sm text-gray-700">
              Após cada empréstimo, abre-se automaticamente um comprovativo oficial com:
              dados do leitor, obra, datas, regras e espaço para assinaturas. 
              Podes imprimir ou guardar em PDF.
            </p>
          </div>
        </div>
      ),
    },

    // ============ RESERVAS ============
    {
      id: 'reservas',
      titulo: 'Sistema de Reservas',
      icone: <Bookmark size={20} />,
      cor: 'yellow',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Quando uma obra está emprestada, os clientes podem reservá-la para serem notificados 
            quando for devolvida.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">Como funciona a fila</p>
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
              <li>Cada reserva tem uma <strong>posição na fila</strong> (1º, 2º, 3º...)</li>
              <li>Quando alguém requisita a obra, o <strong>1º da fila</strong> é atendido automaticamente</li>
              <li>A reserva é marcada como "ATENDIDA" e desaparece da fila</li>
              <li>Não podes reservar a mesma obra duas vezes com o mesmo cliente</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-900">
              💡 <strong>Dica:</strong> Vê as reservas pendentes no cartão amarelo do Dashboard 
              ou clicando em <strong>"Reservas"</strong> no menu.
            </p>
          </div>
        </div>
      ),
    },

    // ============ CLIENTES ============
    {
      id: 'clientes',
      titulo: 'Gestão de Clientes',
      icone: <Users size={20} />,
      cor: 'pink',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Os clientes são os leitores que requisitam obras da biblioteca.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">Cadastrar um Cliente</p>
            <p className="text-sm text-gray-700">
              Vai a <strong>"Cadastrar Cliente"</strong> e preenche nome, email e telefone. 
              O email é útil para futuras notificações.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Award size={16} className="text-yellow-600" /> Página de Detalhes
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Clica em <strong>"Ver Detalhes"</strong> num cliente para ver:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Estatísticas (empréstimos totais, ativos, atrasos, reservas)</li>
              <li>Histórico completo de empréstimos</li>
              <li>Reservas ativas</li>
              <li>Badge de <strong>"Bom Leitor"</strong> se não tiver atrasos</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ============ RELATÓRIOS ============
    {
      id: 'relatorios',
      titulo: 'Relatórios e Exportações',
      icone: <BarChart3 size={20} />,
      cor: 'cyan',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Podes gerar relatórios e exportar dados para análise externa.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-at-blue" /> Relatórios
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Inventário completo</li>
                <li>Empréstimos ativos</li>
                <li>Clientes registados</li>
                <li>Imprimíveis em PDF</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Printer size={16} className="text-green-600" /> Exportação Excel
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Botão "Exportar Excel" no Acervo</li>
                <li>Gera ficheiro .CSV</li>
                <li>Abre no Microsoft Excel</li>
                <li>Mantém acentos portugueses</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },

    // ============ CONFIGURAÇÕES ============
    {
      id: 'configuracoes',
      titulo: 'Configurações do Sistema',
      icone: <Settings size={20} />,
      cor: 'purple',
      conteudo: (
        <div className="space-y-4">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
            <p className="text-sm text-purple-900">
              <Shield size={14} className="inline mr-1" /> 
              <strong>Apenas Administradores</strong> podem alterar estas configurações.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">📅 Dias de Empréstimo</p>
            <p className="text-sm text-gray-700">
              Define quantos dias o leitor tem para devolver a obra. 
              Podes escolher entre valores rápidos (3, 7, 15, 30) ou personalizar.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">💰 Valor da Multa por Dia</p>
            <p className="text-sm text-gray-700">
              Valor cobrado por cada dia de atraso. Ex: 40 MT/dia significa que 
              3 dias de atraso = 120 MT.
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-900">
              💡 <strong>Como aceder:</strong> Vai a <strong>"Empréstimos"</strong> e clica no botão 
              <strong>"Configurar"</strong> no canto superior direito do formulário.
            </p>
          </div>
        </div>
      ),
    },

    // ============ UTILIZADORES ============
    {
      id: 'utilizadores',
      titulo: 'Gestão de Utilizadores',
      icone: <Lock size={20} />,
      cor: 'gray',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            O sistema tem dois tipos de utilizadores com permissões diferentes:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <p className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <Shield size={16} /> Administrador
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Acesso total ao sistema</li>
                <li>Gerir utilizadores</li>
                <li>Alterar configurações</li>
                <li>Eliminar obras</li>
              </ul>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <User size={16} /> Bibliotecário
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Gerir obras e clientes</li>
                <li>Realizar empréstimos</li>
                <li>Gerir reservas</li>
                <li>Ver relatórios</li>
              </ul>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">Criar novo utilizador</p>
            <p className="text-sm text-gray-700">
              Vai a <strong>"🔐 Utilizadores"</strong> (só aparece para Admins). 
              Preenche nome, email, password e perfil.
            </p>
          </div>
        </div>
      ),
    },

    // ============ PERFIL ============
    {
      id: 'perfil',
      titulo: 'O Teu Perfil',
      icone: <User size={20} />,
      cor: 'indigo',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Podes aceder ao teu perfil clicando no <strong>teu nome</strong> no canto superior direito.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">O que podes fazer</p>
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
              <li>Ver os teus dados pessoais</li>
              <li>Ver a tua atividade recente</li>
              <li><strong>Alterar a tua password</strong> (com validação de força)</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-900">
              <strong>🔒 Segurança da Password:</strong> Usa pelo menos 8 caracteres, 
              mistura maiúsculas, minúsculas e números. A barra de força diz-te se a tua password é forte.
            </p>
          </div>
        </div>
      ),
    },

    // ============ SUPORTE ============
    {
      id: 'suporte',
      titulo: 'Suporte e Contacto',
      icone: <Mail size={20} />,
      cor: 'green',
      conteudo: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Em caso de problemas técnicos ou dúvidas, contacta:
          </p>

          <div className="bg-gradient-to-br from-at-blue to-at-blue-light text-white rounded-lg p-6">
            <p className="text-sm text-blue-100 font-medium mb-1">Suporte Técnico</p>
            <p className="text-xl font-bold">Autoridade Tributária de Moçambique</p>
            <p className="text-sm text-blue-100 mt-3">
              📧 suporte.ti@at.gov.mz<br />
              📞 +258 21 000 000
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-800 mb-2">Antes de contactar</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Tenta fazer refresh na página (F5)</li>
              <li>Verifica se estás com sessão ativa</li>
              <li>Anota a mensagem de erro exata</li>
              <li>Confirma que o backend está a correr</li>
            </ul>
          </div>
        </div>
      ),
    },
  ], []);

  // Filtra secções pela pesquisa
  const seccoesFiltradas = useMemo(() => {
    if (!pesquisa.trim()) return seccoes;
    const p = pesquisa.toLowerCase();
    return seccoes.filter((s) => s.titulo.toLowerCase().includes(p));
  }, [seccoes, pesquisa]);

  const corClasses: { [key: string]: { bg: string; border: string; text: string; badge: string } } = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100' },
  };

  return (
    <main className="max-w-5xl mx-auto p-6 mt-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-br from-at-blue via-at-blue-light to-blue-900 rounded-3xl shadow-xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 right-32 w-40 h-40 bg-white/5 rounded-full -mb-20"></div>

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <BookOpen size={26} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Manual do Utilizador</h1>
                <p className="text-blue-100 text-sm">Guia completo do Sistema de Biblioteca</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm max-w-lg mt-2">
              Aprende a usar todas as funcionalidades do sistema passo a passo.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Secções</p>
            <p className="text-3xl font-bold mt-1">{seccoes.length}</p>
          </div>
        </div>
      </div>

      {/* Pesquisa e botões */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar secção do manual..."
              className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-at-blue"
            />
          </div>
          <button
            onClick={abrirTodas}
            className="px-4 py-3 rounded-md bg-at-blue text-white font-semibold hover:bg-at-blue-light transition-colors text-sm"
          >
            Abrir Todas
          </button>
          <button
            onClick={fecharTodas}
            className="px-4 py-3 rounded-md bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm"
          >
            Fechar Todas
          </button>
        </div>
      </div>

      {/* Lista de secções */}
      <div className="space-y-3">
        {seccoesFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <Search size={56} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma secção encontrada</p>
            <p className="text-sm mt-1">Tenta pesquisar por outro termo</p>
          </div>
        ) : (
          seccoesFiltradas.map((seccao) => {
            const aberta = abertas.includes(seccao.id);
            const cores = corClasses[seccao.cor] || corClasses.blue;

            return (
              <div 
                key={seccao.id} 
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${
                  aberta ? cores.border : 'border-transparent'
                }`}
              >
                <button
                  onClick={() => toggleSeccao(seccao.id)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl ${cores.badge} ${cores.text} flex items-center justify-center flex-shrink-0`}>
                      {seccao.icone}
                    </div>
                    <h3 className={`text-lg font-bold ${cores.text}`}>{seccao.titulo}</h3>
                  </div>
                  <div className={`flex-shrink-0 text-gray-400 transition-transform ${aberta ? 'rotate-180' : ''}`}>
                    {aberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {aberta && (
                  <div className="px-5 pb-6 pt-0 animate-fade-in">
                    <div className={`border-t-2 ${cores.border} pt-5`}>
                      {seccao.conteudo}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 text-center">
        <p className="text-sm text-gray-600 mb-2">
          Precisas de ajuda adicional? Contacta o suporte técnico.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-at-blue font-semibold hover:underline text-sm"
        >
          Voltar ao Dashboard <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}