import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { 
    enviarEmailEmprestimo, 
    enviarEmailBackup, 
    enviarEmailLembrete, 
    enviarEmailAtraso, 
    enviarEmailReservaDisponivel 
} from './utils/email';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
    'https://sistema-biblioteca-at.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS bloqueou origem não autorizada: ${origin}`);
            callback(new Error('Origem não autorizada pelo CORS.'));
        }
    },
    credentials: true,
}));

app.use(express.json());

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: 'Demasiados pedidos.' }, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Demasiadas tentativas.' }, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true });
app.use(generalLimiter);

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) { console.error('❌ ERRO CRÍTICO: JWT_SECRET não definido!'); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query('SELECT NOW()').then(() => { 
    console.log('✅ Ligação à Base de Dados PostgreSQL (Neon) bem-sucedida!'); 
    seedAdmin(); 
}).catch((err) => { 
    console.error('❌ FALHA NA LIGAÇÃO:', err.message); 
});

function parsePermissoes(valor: any): any {
    if (!valor) return {};
    try { return typeof valor === 'string' ? JSON.parse(valor) : valor; } catch { return {}; }
}

async function obterConfig(chave: string, fallback: number): Promise<number> {
    try {
        const result = await pool.query('SELECT Valor FROM Configuracoes WHERE Chave = $1', [chave]);
        if (result.rows.length === 0) return fallback;
        const valor = Number(result.rows[0].valor || result.rows[0].Valor);
        return isNaN(valor) ? fallback : valor;
    } catch { return fallback; }
}

async function criarNotificacao(titulo: string, mensagem: string, tipo: string, link: string | null = null) {
    try { await pool.query('INSERT INTO Notificacoes (Titulo, Mensagem, Tipo, Link) VALUES ($1, $2, $3, $4)', [titulo, mensagem, tipo, link]); } catch (error) { console.error('Erro ao criar notificação:', error); }
}

async function seedAdmin() {
    try {
        const check = await pool.query('SELECT COUNT(*) as total FROM Usuarios');
        if (Number(check.rows[0].total) === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query('INSERT INTO Usuarios (Nome, Email, PasswordHash, Role, Permissoes) VALUES ($1, $2, $3, $4, $5)', ['Maurício Guambe', 'admin@at.gov.mz', hash, 'Admin', '{}']);
            console.log('🌱 Utilizador Admin criado: admin@at.gov.mz / admin123');
        }
    } catch (error) { console.error('Erro ao criar admin:', error); }
}

// ============ CRON JOB: NOTIFICAÇÕES AUTOMÁTICAS ============
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ A executar rotina de notificações automáticas...');
    const valorMulta = await obterConfig('ValorMultaDia', 40);

    try {
        const lembretes = await pool.query(`
            SELECT E.id, C.nome as "ClienteNome", C.email as "ClienteEmail", O.titulo as "ObraTitulo", 
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevista"
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.clienteid = C.id
            INNER JOIN Obras O ON E.obraid = O.id
            WHERE E.status = 'ATIVO' AND E.dataprevistadevolucao::date = CURRENT_DATE + 2
        `);

        for (const row of lembretes.rows) {
            if (row.ClienteEmail) {
                await enviarEmailLembrete({
                    clienteNome: row.ClienteNome,
                    clienteEmail: row.ClienteEmail,
                    obraTitulo: row.ObraTitulo,
                    dataPrevista: row.DataPrevista
                });
            }
        }

        const atrasados = await pool.query(`
            SELECT E.id, C.nome as "ClienteNome", C.email as "ClienteEmail", O.titulo as "ObraTitulo", 
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevista",
                   (CURRENT_DATE - E.dataprevistadevolucao::date) as "DiasAtraso"
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.clienteid = C.id
            INNER JOIN Obras O ON E.obraid = O.id
            WHERE E.status = 'ATIVO' AND E.dataprevistadevolucao::date = CURRENT_DATE - 1
        `);

        for (const row of atrasados.rows) {
            if (row.ClienteEmail) {
                await enviarEmailAtraso({
                    clienteNome: row.ClienteNome,
                    clienteEmail: row.ClienteEmail,
                    obraTitulo: row.ObraTitulo,
                    dataPrevista: row.DataPrevista,
                    diasAtraso: row.DiasAtraso,
                    multa: row.DiasAtraso * valorMulta
                });
            }
        }
        console.log('✅ Rotina de notificações concluída.');
    } catch (error) {
        console.error('❌ Erro na rotina de notificações:', error);
    }
});

// ============ MIDDLEWARES ============
function verificarToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado. Sem token.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = decoded; next();
    } catch (error) { res.status(401).json({ error: 'Token inválido ou expirado.' }); }
}

function apenasAdmin(req: Request, res: Response, next: NextFunction) {
    if ((req as any).user.role !== 'Admin') return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    next();
}

function apenasCliente(req: Request, res: Response, next: NextFunction) {
    if ((req as any).user.role !== 'Cliente') return res.status(403).json({ error: 'Acesso apenas para leitores.' });
    next();
}

function verificarPermissao(chave: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ error: 'Não autenticado.' });
        if (user.role === 'Admin') return next();
        if (user.role === 'Cliente') return res.status(403).json({ error: 'Acesso restrito a funcionários.' });
        const permissoes = parsePermissoes(user.permissoes);
        if (permissoes[chave] === true) return next();
        return res.status(403).json({ error: 'Não tens permissão para esta ação.' });
    };
}

function verificarCamposObra(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user.role === 'Admin') return next();
    const p = parsePermissoes(user.permissoes);
    const proibidos = [];
    if (req.body.Titulo !== undefined && !p['obras_campo_titulo']) proibidos.push('Titulo');
    if (req.body.Ano !== undefined && !p['obras_campo_ano']) proibidos.push('Ano');
    if (req.body.AutorId !== undefined && !p['obras_campo_autor']) proibidos.push('Autor');
    if (req.body.EditoraId !== undefined && !p['obras_campo_editora']) proibidos.push('Editora');
    if (req.body.NumeroEdicao !== undefined && !p['obras_campo_numeroedicao']) proibidos.push('NumeroEdicao');
    if (req.body.NacionalidadeLivro !== undefined && !p['obras_campo_nacionalidadelivro']) proibidos.push('NacionalidadeLivro');
    if (req.body.ISBN !== undefined && !p['obras_campo_isbn']) proibidos.push('ISBN');
    if (proibidos.length > 0) return res.status(403).json({ error: `Sem permissão para alterar: ${proibidos.join(', ')}` });
    next();
}

function verificarCamposAutor(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user.role === 'Admin') return next();
    const p = parsePermissoes(user.permissoes);
    const proibidos = [];
    if (req.body.Nome !== undefined && !p['autores_campo_nome']) proibidos.push('Nome');
    if (req.body.Sobrenome !== undefined && !p['autores_campo_sobrenome']) proibidos.push('Sobrenome');
    if (req.body.Nacionalidade !== undefined && !p['autores_campo_nacionalidade']) proibidos.push('Nacionalidade');
    if (req.body.DataNascimento !== undefined && !p['autores_campo_datanascimento']) proibidos.push('DataNascimento');
    if (req.body.Biografia !== undefined && !p['autores_campo_biografia']) proibidos.push('Biografia');
    if (req.body.Sexo !== undefined && !p['autores_campo_sexo']) proibidos.push('Sexo');
    if (req.body.TiposLivros !== undefined && !p['autores_campo_tiposlivros']) proibidos.push('TiposLivros');
    if (proibidos.length > 0) return res.status(403).json({ error: `Sem permissão para alterar: ${proibidos.join(', ')}` });
    next();
}

function verificarCamposEditora(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user.role === 'Admin') return next();
    const p = parsePermissoes(user.permissoes);
    const proibidos = [];
    if (req.body.Nome !== undefined && !p['editoras_campo_nome']) proibidos.push('Nome');
    if (req.body.Endereco !== undefined && !p['editoras_campo_endereco']) proibidos.push('Endereco');
    if (req.body.Telefone !== undefined && !p['editoras_campo_telefone']) proibidos.push('Telefone');
    if (req.body.Email !== undefined && !p['editoras_campo_email']) proibidos.push('Email');
    if (req.body.Website !== undefined && !p['editoras_campo_website']) proibidos.push('Website');
    if (req.body.PaisOrigem !== undefined && !p['editoras_campo_paisorigem']) proibidos.push('PaisOrigem');
    if (proibidos.length > 0) return res.status(403).json({ error: `Sem permissão para alterar: ${proibidos.join(', ')}` });
    next();
}

function verificarCamposCliente(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user.role === 'Admin') return next();
    const p = parsePermissoes(user.permissoes);
    const proibidos = [];
    if (req.body.Nome !== undefined && !p['clientes_campo_nome']) proibidos.push('Nome');
    if (req.body.Email !== undefined && !p['clientes_campo_email']) proibidos.push('Email');
    if (req.body.Telefone !== undefined && !p['clientes_campo_telefone']) proibidos.push('Telefone');
    if (req.body.PI !== undefined && !p['clientes_campo_pi']) proibidos.push('PI');
    if (req.body.NUIT !== undefined && !p['clientes_campo_nuit']) proibidos.push('NUIT');
    if (proibidos.length > 0) return res.status(403).json({ error: `Sem permissão para alterar: ${proibidos.join(', ')}` });
    next();
}

// ============ LOGIN UNIFICADO (Funcionário OU Cliente) ============
app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
    const { Email, Password } = req.body;
    try {
        // 1. Tentar como funcionário
        const resultUser = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", passwordhash as "PasswordHash", role as "Role", permissoes as "Permissoes" FROM Usuarios WHERE email = $1',
            [Email]
        );

        if (resultUser.rows.length > 0) {
            const user = resultUser.rows[0];
            const passwordOk = await bcrypt.compare(Password, user.PasswordHash);
            if (!passwordOk) return res.status(401).json({ error: 'Email ou password incorretos.' });

            const permissoes = parsePermissoes(user.Permissoes);
            const token = jwt.sign({ id: user.Id, nome: user.Nome, email: user.Email, role: user.Role, permissoes }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, user: { id: user.Id, nome: user.Nome, email: user.Email, role: user.Role, permissoes } });
        }

        // 2. Tentar como cliente
        const resultCliente = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", passwordhash as "PasswordHash" FROM Clientes WHERE email = $1',
            [Email]
        );

        if (resultCliente.rows.length > 0) {
            const cliente = resultCliente.rows[0];
            if (!cliente.PasswordHash) {
                return res.status(401).json({ error: 'Conta de leitor ainda não ativada. Contacta a biblioteca.' });
            }
            const passwordOk = await bcrypt.compare(Password, cliente.PasswordHash);
            if (!passwordOk) return res.status(401).json({ error: 'Email ou password incorretos.' });

            const token = jwt.sign({ id: cliente.Id, nome: cliente.Nome, email: cliente.Email, role: 'Cliente' }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, user: { id: cliente.Id, nome: cliente.Nome, email: cliente.Email, role: 'Cliente' } });
        }

        return res.status(401).json({ error: 'Email ou password incorretos.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ BACKUP ============
app.post('/api/backup/executar', async (req: Request, res: Response) => {
    const secretHeader = req.headers['x-backup-secret'];
    if (!process.env.BACKUP_SECRET) return res.status(500).json({ error: 'Backup não configurado.' });
    if (!secretHeader || secretHeader !== process.env.BACKUP_SECRET) return res.status(401).json({ error: 'Não autorizado.' });

    try {
        const tabelas = ['usuarios', 'autores', 'editoras', 'obras', 'clientes', 'emprestimos', 'reservas', 'notificacoes', 'configuracoes'];
        const dadosBackup: any = { dataBackup: new Date().toISOString(), versao: '1.0', sistema: 'Biblioteca AT', tabelas: {} };
        for (const tabela of tabelas) {
            try { const result = await pool.query(`SELECT * FROM ${tabela}`); dadosBackup.tabelas[tabela] = result.rows; } catch (err: any) { dadosBackup.tabelas[tabela] = []; }
        }
        const destinatario = process.env.BACKUP_EMAIL || process.env.EMAIL_USER || '';
        const dataFormatada = new Date().toLocaleString('pt-PT');
        const enviado = await enviarEmailBackup({ destinatario, dataBackup: dataFormatada, conteudo: dadosBackup });
        if (!enviado) return res.status(500).json({ error: 'Falha ao enviar email.' });
        res.json({ message: 'Backup realizado!', data: dataFormatada, destinatario });
    } catch (error: any) { res.status(500).json({ error: 'Erro no backup: ' + error.message }); }
});

// ============ PORTAL DO LEITOR ============
app.get('/api/portal/perfil', verificarToken, apenasCliente, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", telefone as "Telefone", pi as "PI", nuit as "NUIT" FROM Clientes WHERE id = $1',
            [(req as any).user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Leitor não encontrado.' });
        res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/portal/meus-emprestimos', verificarToken, apenasCliente, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", A.nome as "Autor", 
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", 
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                   CASE WHEN E.dataprevistadevolucao < CURRENT_DATE THEN (CURRENT_DATE - E.dataprevistadevolucao::date) ELSE 0 END as "DiasAtraso"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            LEFT JOIN Autores A ON O.autorid = A.id
            WHERE E.clienteid = $1 AND E.status = 'ATIVO'
            ORDER BY E.dataemprestimo DESC
        `, [(req as any).user.id]);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/portal/meu-historico', verificarToken, apenasCliente, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", A.nome as "Autor", 
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", 
                   TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            LEFT JOIN Autores A ON O.autorid = A.id
            WHERE E.clienteid = $1 AND E.status = 'DEVOLVIDO'
            ORDER BY E.dataemprestimo DESC
        `, [(req as any).user.id]);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/portal/requisitar', verificarToken, apenasCliente, async (req, res) => {
    const { ObraId } = req.body;
    const ClienteId = (req as any).user.id;

    if (!ObraId) return res.status(400).json({ error: 'Indica a obra a requisitar.' });

    try {
        const checkObra = await pool.query('SELECT titulo, status FROM Obras WHERE id = $1', [ObraId]);
        if (checkObra.rows.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (checkObra.rows[0].status !== 'DISPONIVEL') {
            return res.status(400).json({ error: 'Obra indisponível para requisição. Já está emprestada.' });
        }

        const checkPedido = await pool.query(
            "SELECT COUNT(*) as total FROM Reservas WHERE obraid = $1 AND clienteid = $2 AND status = 'PENDENTE'",
            [ObraId, ClienteId]
        );
        if (Number(checkPedido.rows[0].total) > 0) {
            return res.status(400).json({ error: 'Já tens uma requisição pendente para esta obra.' });
        }

        const insertResult = await pool.query(
            "INSERT INTO Reservas (obraid, clienteid, datareserva, status, tipo) VALUES ($1, $2, NOW(), 'PENDENTE', 'LEVANTAMENTO') RETURNING id",
            [ObraId, ClienteId]
        );

        const clienteInfo = await pool.query('SELECT nome FROM Clientes WHERE id = $1', [ClienteId]);
        const nomeCliente = clienteInfo.rows[0].nome;

        await criarNotificacao(
            '🔔 Nova Requisição',
            `O leitor ${nomeCliente} requisitou "${checkObra.rows[0].titulo}" para levantamento.`,
            'RESERVA',
            '/reservas'
        );

        res.status(201).json({
            message: 'Requisição efetuada! Dirige-te à biblioteca para levantares o livro.',
            reservaId: insertResult.rows[0].id
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/portal/password', verificarToken, apenasCliente, async (req, res) => {
    const { PasswordAtual, PasswordNova } = req.body;
    if (!PasswordAtual || !PasswordNova) return res.status(400).json({ error: 'Preenche todos os campos.' });
    if (PasswordNova.length < 6) return res.status(400).json({ error: 'A password nova deve ter pelo menos 6 caracteres.' });

    try {
        const userResult = await pool.query('SELECT passwordhash FROM Clientes WHERE id = $1', [(req as any).user.id]);
        if (!userResult.rows[0].passwordhash) {
            // Primeira ativação de conta
            const novoHash = await bcrypt.hash(PasswordNova, 10);
            await pool.query('UPDATE Clientes SET passwordhash = $1 WHERE id = $2', [novoHash, (req as any).user.id]);
            return res.json({ message: 'Password definida com sucesso!' });
        }
        if (!await bcrypt.compare(PasswordAtual, userResult.rows[0].passwordhash)) {
            return res.status(400).json({ error: 'Password atual incorreta.' });
        }
        const novoHash = await bcrypt.hash(PasswordNova, 10);
        await pool.query('UPDATE Clientes SET passwordhash = $1 WHERE id = $2', [novoHash, (req as any).user.id]);
        res.json({ message: 'Password alterada com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ CONFIGURAÇÕES ============
app.get('/api/configuracoes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT chave, valor FROM Configuracoes');
        const config: any = {}; result.rows.forEach((r: any) => { config[r.chave] = r.valor; });
        res.json({ diasEmprestimo: Number(config.DiasEmprestimo) || 15, valorMultaDia: Number(config.ValorMultaDia) || 40 });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/configuracoes', verificarToken, apenasAdmin, async (req, res) => {
    const { diasEmprestimo, valorMultaDia } = req.body;
    if (!diasEmprestimo || !valorMultaDia || diasEmprestimo < 1 || valorMultaDia < 0) return res.status(400).json({ error: 'Valores inválidos.' });
    try {
        await pool.query("UPDATE Configuracoes SET valor = $1 WHERE chave = 'DiasEmprestimo'", [String(diasEmprestimo)]);
        await pool.query("UPDATE Configuracoes SET valor = $1 WHERE chave = 'ValorMultaDia'", [String(valorMultaDia)]);
        res.json({ message: 'Configurações atualizadas!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ PERFIL ============
app.get('/api/perfil', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id as "Id", nome as "Nome", email as "Email", role as "Role", permissoes as "Permissoes" FROM Usuarios WHERE id = $1', [(req as any).user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado.' });
        const u = result.rows[0];
        res.json({ Id: u.Id, Nome: u.Nome, Email: u.Email, Role: u.Role, permissoes: parsePermissoes(u.Permissoes) });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/perfil/password', verificarToken, async (req, res) => {
    const { PasswordAtual, PasswordNova } = req.body;
    if (!PasswordAtual || !PasswordNova) return res.status(400).json({ error: 'Preenche todos os campos.' });
    if (PasswordNova.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres.' });
    try {
        const userResult = await pool.query('SELECT passwordhash FROM Usuarios WHERE id = $1', [(req as any).user.id]);
        if (!await bcrypt.compare(PasswordAtual, userResult.rows[0].passwordhash)) return res.status(400).json({ error: 'Password atual incorreta.' });
        const novoHash = await bcrypt.hash(PasswordNova, 10);
        await pool.query('UPDATE Usuarios SET passwordhash = $1 WHERE id = $2', [novoHash, (req as any).user.id]);
        res.json({ message: 'Password alterada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/perfil/atividade', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "Data", E.status as "Status" FROM Emprestimos E INNER JOIN Obras O ON E.obraid = O.id INNER JOIN Clientes C ON E.clienteid = C.id ORDER BY E.dataemprestimo DESC LIMIT 5`);
        res.json({ emprestimosRecentes: result.rows });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ UTILIZADORES ============
app.get('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id as "Id", nome as "Nome", email as "Email", role as "Role", permissoes as "Permissoes" FROM Usuarios ORDER BY nome');
        const usuarios = result.rows.map((u: any) => ({ Id: u.Id, Nome: u.Nome, Email: u.Email, Role: u.Role, permissoes: parsePermissoes(u.Permissoes) }));
        res.json(usuarios);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    const { Nome, Email, Password, Role } = req.body;
    try {
        const hash = await bcrypt.hash(Password, 10);
        await pool.query('INSERT INTO Usuarios (nome, email, passwordhash, role, permissoes) VALUES ($1, $2, $3, $4, $5)', [Nome, Email, hash, Role || 'Bibliotecario', '{}']);
        await criarNotificacao('👤 Novo Utilizador', `O utilizador ${Nome} foi criado.`, 'UTILIZADOR', '/utilizadores');
        res.status(201).json({ message: 'Utilizador criado!' });
    } catch (error: any) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) return res.status(400).json({ error: 'Email já registado.' });
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/usuarios/:id/permissoes', verificarToken, apenasAdmin, async (req, res) => {
    const { permissoes } = req.body;
    if (!permissoes || typeof permissoes !== 'object') return res.status(400).json({ error: 'Inválido.' });
    try {
        await pool.query('UPDATE Usuarios SET permissoes = $1 WHERE id = $2', [JSON.stringify(permissoes), req.params.id]);
        res.json({ message: 'Permissões atualizadas!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/usuarios/:id/password', verificarToken, apenasAdmin, async (req, res) => {
    const { NovaPassword } = req.body;
    if (!NovaPassword || NovaPassword.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres.' });
    try {
        const hash = await bcrypt.hash(NovaPassword, 10);
        await pool.query('UPDATE Usuarios SET passwordhash = $1 WHERE id = $2', [hash, req.params.id]);
        res.json({ message: 'Password redefinida!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/usuarios/:id', verificarToken, apenasAdmin, async (req, res) => {
    if (Number(req.params.id) === (req as any).user.id) return res.status(400).json({ error: 'Não podes apagar a tua própria conta.' });
    try {
        await pool.query('DELETE FROM Usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Utilizador removido.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ OBRAS ============
app.get('/api/obras', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT O.id as "Id", O.titulo as "Titulo", A.nome as "Autor", E.nome as "Editora", 
                   O.ano as "Ano", O.numeroedicao as "NumeroEdicao", O.nacionalidadelivro as "NacionalidadeLivro", O.isbn as "ISBN", O.status as "Status",
                   (SELECT COUNT(*) FROM Emprestimos WHERE obraid = O.id) as "TotalEmprestimos"
            FROM Obras O 
            LEFT JOIN Autores A ON O.autorid = A.id 
            LEFT JOIN Editoras E ON O.editoraid = E.id
        `);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/disponiveis', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT O.id as "Id", O.titulo as "Titulo", A.nome as "Autor" FROM Obras O LEFT JOIN Autores A ON O.autorid = A.id WHERE O.status = 'DISPONIVEL'`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id/reservas', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT ROW_NUMBER() OVER (ORDER BY R.datareserva ASC) as "Posicao", R.id as "Id", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone", TO_CHAR(R.datareserva, 'DD/MM/YYYY') as "DataReserva", R.tipo as "Tipo" FROM Reservas R INNER JOIN Clientes C ON R.clienteid = C.id WHERE R.obraid = $1 AND R.status = 'PENDENTE' ORDER BY R.datareserva ASC`, [req.params.id]);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id/historico', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT E.id as "Id", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao", TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao", E.status as "Status" FROM Emprestimos E INNER JOIN Clientes C ON E.clienteid = C.id WHERE E.obraid = $1 ORDER BY E.dataemprestimo DESC`, [req.params.id]);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ ROTA: BUSCAR ISBN (COM FALLBACK) ============
app.get('/api/obras/buscar-isbn/:isbn', verificarToken, async (req, res) => {
    const { isbn } = req.params;
    
    const buscarNoGoogle = async (comChave: boolean) => {
        const keyParam = comChave && process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${keyParam}`;
        const response = await fetch(url);
        const data: any = await response.json();
        
        if (data.error) {
            console.warn(`Aviso do Google Books (comChave: ${comChave}):`, data.error.message);
            return { error: data.error.message, totalItems: 0 };
        }
        return data;
    };

    try {
        let data = await buscarNoGoogle(true);
        console.log(`Tentativa com chave. Total Items: ${data.totalItems}`);

        if (!data.items || data.items.length === 0) {
            console.log('A tentar novamente sem chave...');
            data = await buscarNoGoogle(false);
            console.log(`Tentativa sem chave. Total Items: ${data.totalItems}`);
        }

        if (data.error) {
            return res.status(429).json({ error: 'Limite de pesquisas do Google Books atingido. Preenche os dados manualmente.' });
        }

        if (!data.items || data.items.length === 0) {
            return res.status(404).json({ error: 'Nenhum livro encontrado com este ISBN no Google Books.' });
        }

        const book = data.items[0].volumeInfo;
        res.json({
            titulo: book.title || '',
            ano: book.publishedDate ? book.publishedDate.substring(0, 4) : '',
            autor: book.authors ? book.authors[0] : '',
            editora: book.publisher || ''
        });
    } catch (error: any) {
        console.error('Erro fatal ao procurar ISBN:', error.message);
        res.status(500).json({ error: 'Erro ao ligar ao Google Books. Tenta novamente.' });
    }
});

app.get('/api/obras/:id', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT O.id as "Id", O.titulo as "Titulo", O.ano as "Ano", O.numeroedicao as "NumeroEdicao", O.nacionalidadelivro as "NacionalidadeLivro", O.isbn as "ISBN", O.status as "Status", A.nome as "Autor", A.nacionalidade as "Nacionalidade", E.nome as "Editora", E.telefone as "EditoraContacto" FROM Obras O LEFT JOIN Autores A ON O.autorid = A.id LEFT JOIN Editoras E ON O.editoraid = E.id WHERE O.id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/obras', verificarToken, verificarPermissao('obras_criar'), verificarCamposObra, async (req, res) => {
    const { Titulo, Ano, AutorId, EditoraId, NumeroEdicao, NacionalidadeLivro, ISBN } = req.body;
    
    if (!EditoraId) return res.status(400).json({ error: 'A editora é obrigatória.' });

    try {
        const insertResult = await pool.query(
            "INSERT INTO Obras (titulo, ano, autorid, editoraid, numeroedicao, nacionalidadelivro, isbn, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DISPONIVEL') RETURNING id", 
            [Titulo, Ano, AutorId, EditoraId, NumeroEdicao || null, NacionalidadeLivro || null, ISBN || null]
        );
        const novaObraId = insertResult.rows[0].id;
        
        await criarNotificacao('📚 Nova Obra', `A obra "${Titulo}" foi adicionada.`, 'OBRA', '/acervo');
        
        res.status(201).json({ message: 'Obra cadastrada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/obras/:id', verificarToken, verificarPermissao('obras_apagar'), async (req, res) => {
    try {
        await pool.query('DELETE FROM Obras WHERE id = $1', [req.params.id]);
        res.json({ message: 'Obra removida.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ AUTORES ============
app.get('/api/autores', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT A.id as "Id", A.nome as "Nome", A.sobrenome as "Sobrenome", A.nacionalidade as "Nacionalidade", TO_CHAR(A.datanascimento, 'DD/MM/YYYY') as "DataNascimento", A.biografia as "Biografia", A.sexo as "Sexo", A.tiposlivros as "TiposLivros", (SELECT COUNT(*) FROM Obras WHERE autorid = A.id) as "TotalObras" FROM Autores A ORDER BY A.nome`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/autores', verificarToken, verificarPermissao('autores_criar'), verificarCamposAutor, async (req, res) => {
    const { Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia, Sexo, TiposLivros } = req.body;
    try {
        const insertResult = await pool.query(
            'INSERT INTO Autores (nome, sobrenome, nacionalidade, datanascimento, biografia, sexo, tiposlivros) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', 
            [Nome, Sobrenome || null, Nacionalidade || null, DataNascimento || null, Biografia || null, Sexo || null, TiposLivros || null]
        );
        const novoAutorId = insertResult.rows[0].id;
        res.status(201).json({ message: 'Autor cadastrado!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/autores/:id', verificarToken, verificarPermissao('autores_editar'), verificarCamposAutor, async (req, res) => {
    const { Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia, Sexo, TiposLivros } = req.body;
    try {
        const current = await pool.query('SELECT nome, sobrenome, nacionalidade, datanascimento, biografia, sexo, tiposlivros FROM Autores WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Autor não encontrado.' });
        const old = current.rows[0];

        const novoNome = Nome !== undefined ? Nome : old.nome;
        const novoSobrenome = Sobrenome !== undefined ? Sobrenome : old.sobrenome;
        const novaNacionalidade = Nacionalidade !== undefined ? Nacionalidade : old.nacionalidade;
        const novaData = DataNascimento !== undefined ? DataNascimento : old.datanascimento;
        const novaBio = Biografia !== undefined ? Biografia : old.biografia;
        const novoSexo = Sexo !== undefined ? Sexo : old.sexo;
        const novosTipos = TiposLivros !== undefined ? TiposLivros : old.tiposlivros;

        await pool.query('UPDATE Autores SET nome = $1, sobrenome = $2, nacionalidade = $3, datanascimento = $4, biografia = $5, sexo = $6, tiposlivros = $7 WHERE id = $8', [novoNome, novoSobrenome, novaNacionalidade, novaData, novaBio, novoSexo, novosTipos, req.params.id]);
        res.json({ message: 'Autor atualizado!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/autores/:id', verificarToken, verificarPermissao('autores_apagar'), async (req, res) => {
    try {
        const check = await pool.query('SELECT COUNT(*) as total FROM Obras WHERE autorid = $1', [req.params.id]);
        if (Number(check.rows[0].total) > 0) return res.status(400).json({ error: `O autor tem ${check.rows[0].total} obra(s) e não pode ser eliminado.` });
        
        await pool.query('DELETE FROM Autores WHERE id = $1', [req.params.id]);
        res.json({ message: 'Autor removido!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ CLIENTES ============
app.get('/api/clientes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT C.id as "Id", C.nome as "Nome", C.email as "Email", C.telefone as "Telefone", C.pi as "PI", C.nuit as "NUIT", (SELECT COUNT(*) FROM Emprestimos WHERE clienteid = C.id) as "TotalEmprestimos", (SELECT COUNT(*) FROM Emprestimos WHERE clienteid = C.id AND status = 'ATIVO') as "EmprestimosAtivos", CASE WHEN C.passwordhash IS NOT NULL THEN TRUE ELSE FALSE END as "ContaAtiva" FROM Clientes C ORDER BY C.nome`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/clientes', verificarToken, verificarPermissao('clientes_criar'), verificarCamposCliente, async (req, res) => {
    const { Nome, Email, Telefone, PI, NUIT, Password } = req.body;

    if (!Nome) return res.status(400).json({ error: 'O nome é obrigatório.' });

    try {
        if (Email) {
            const checkDup = await pool.query('SELECT COUNT(*) as total FROM Clientes WHERE LOWER(email) = LOWER($1)', [Email]);
            if (Number(checkDup.rows[0].total) > 0) return res.status(400).json({ error: 'Este email já está registado.' });

            const checkStaff = await pool.query('SELECT COUNT(*) as total FROM Usuarios WHERE LOWER(email) = LOWER($1)', [Email]);
            if (Number(checkStaff.rows[0].total) > 0) return res.status(400).json({ error: 'Este email já está registado como funcionário.' });
        }

        const passwordFinal = Password && Password.length >= 6 ? Password : '123456';
        const hash = Email ? await bcrypt.hash(passwordFinal, 10) : null;

        const insertResult = await pool.query(
            'INSERT INTO Clientes (nome, email, telefone, pi, nuit, passwordhash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [Nome, Email || null, Telefone || null, PI || null, NUIT || null, hash]
        );

        res.status(201). json({
            message: Email
                ? `Cliente cadastrado! Password inicial: ${passwordFinal} (o leitor deve alterá-la no portal).`
                : 'Cliente cadastrado (sem conta de portal porque não tem email).',
            clienteId: insertResult.rows[0].id
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/clientes/:id', verificarToken, verificarPermissao('clientes_editar'), verificarCamposCliente, async (req, res) => {
    const { Nome, Email, Telefone, PI, NUIT } = req.body;
    try {
        const current = await pool.query('SELECT nome, email, telefone, pi, nuit FROM Clientes WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
        const old = current.rows[0];
        const novoNome = Nome !== undefined ? Nome : old.nome;
        const novoEmail = Email !== undefined ? Email : old.email;
        const novoTelefone = Telefone !== undefined ? Telefone : old.telefone;
        const novoPI = PI !== undefined ? PI : old.pi;
        const novoNUIT = NUIT !== undefined ? NUIT : old.nuit;

        await pool.query('UPDATE Clientes SET nome = $1, email = $2, telefone = $3, pi = $4, nuit = $5 WHERE id = $6', [novoNome, novoEmail, novoTelefone, novoPI, novoNUIT, req.params.id]);
        res.json({ message: 'Cliente atualizado!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/clientes/:id/reset-password', verificarToken, apenasAdmin, async (req, res) => {
    const { NovaPassword } = req.body;
    if (!NovaPassword || NovaPassword.length < 6) return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres.' });
    try {
        const hash = await bcrypt.hash(NovaPassword, 10);
        await pool.query('UPDATE Clientes SET passwordhash = $1 WHERE id = $2', [hash, req.params.id]);
        res.json({ message: 'Password do leitor redefinida com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/clientes/:id', verificarToken, verificarPermissao('clientes_apagar'), async (req, res) => {
    try {
        const checkAtivos = await pool.query("SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1 AND status = 'ATIVO'", [req.params.id]);
        if (Number(checkAtivos.rows[0].total) > 0) return res.status(400).json({ error: `Cliente tem empréstimo ativo.` });
        const checkHist = await pool.query('SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1', [req.params.id]);
        if (Number(checkHist.rows[0].total) > 0) return res.status(400).json({ error: `Cliente tem histórico.` });
        
        await pool.query('DELETE FROM Clientes WHERE id = $1', [req.params.id]);
        res.json({ message: 'Cliente removido.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id/historico', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT E.id as "Id", O.titulo as "Obra", A.nome as "Autor", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao", TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao", CASE WHEN E.status = 'ATIVO' AND E.dataprevistadevolucao < CURRENT_DATE THEN (CURRENT_DATE - E.dataprevistadevolucao::date) ELSE 0 END as "DiasAtraso", E.status as "Status" FROM Emprestimos E INNER JOIN Obras O ON E.obraid = O.id LEFT JOIN Autores A ON O.autorid = A.id WHERE E.clienteid = $1 ORDER BY E.dataemprestimo DESC`, [req.params.id]);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id/reservas', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT R.id as "Id", O.id as "ObraId", O.titulo as "Obra", O.status as "ObraStatus", TO_CHAR(R.datareserva, 'DD/MM/YYYY') as "DataReserva", R.tipo as "Tipo" FROM Reservas R INNER JOIN Obras O ON R.obraid = O.id WHERE R.clienteid = $1 AND R.status = 'PENDENTE' ORDER BY R.datareserva DESC`, [req.params.id]);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id', verificarToken, async (req, res) => {
    try {
        const cliente = await pool.query('SELECT id as "Id", nome as "Nome", email as "Email", telefone as "Telefone", pi as "PI", nuit as "NUIT" FROM Clientes WHERE id = $1', [req.params.id]);
        if (cliente.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
        const totEmp = await pool.query('SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1', [req.params.id]);
        const empAtiv = await pool.query("SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1 AND status = 'ATIVO'", [req.params.id]);
        const empAtr = await pool.query("SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1 AND status = 'ATIVO' AND dataprevistadevolucao < CURRENT_DATE", [req.params.id]);
        const totRes = await pool.query("SELECT COUNT(*) as total FROM Reservas WHERE clienteid = $1 AND status = 'PENDENTE'", [req.params.id]);
        res.json({ cliente: cliente.rows[0], estatisticas: { totalEmprestimos: Number(totEmp.rows[0].total), emprestimosAtivos: Number(empAtiv.rows[0].total), emprestimosAtrasados: Number(empAtr.rows[0].total), totalReservas: Number(totRes.rows[0].total) } });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ EDITORAS ============
app.get('/api/editoras', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT E.id as "Id", E.nome as "Nome", E.endereco as "Endereco", E.telefone as "Telefone", E.email as "Email", E.website as "Website", E.paisorigem as "PaisOrigem", (SELECT COUNT(*) FROM Obras WHERE editoraid = E.id) as "TotalObras" FROM Editoras E ORDER BY E.nome`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/editoras', verificarToken, verificarPermissao('editoras_criar'), verificarCamposEditora, async (req, res) => {
    const { Nome, Endereco, Telefone, Email, Website, PaisOrigem } = req.body;
    try {
        const insertResult = await pool.query('INSERT INTO Editoras (nome, endereco, telefone, email, website, paisorigem) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [Nome, Endereco || null, Telefone || null, Email || null, Website || null, PaisOrigem || null]);
        res.status(201).json({ message: 'Editora cadastrada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/editoras/:id', verificarToken, verificarPermissao('editoras_editar'), verificarCamposEditora, async (req, res) => {
    const { Nome, Endereco, Telefone, Email, Website, PaisOrigem } = req.body;
    try {
        const current = await pool.query('SELECT nome, endereco, telefone, email, website, paisorigem FROM Editoras WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Editora não encontrada.' });
        const old = current.rows[0];
        const novoNome = Nome !== undefined ? Nome : old.nome;
        const novoEndereco = Endereco !== undefined ? Endereco : old.endereco;
        const novoTelefone = Telefone !== undefined ? Telefone : old.telefone;
        const novoEmail = Email !== undefined ? Email : old.email;
        const novoWebsite = Website !== undefined ? Website : old.website;
        const novoPais = PaisOrigem !== undefined ? PaisOrigem : old.paisorigem;

        await pool.query('UPDATE Editoras SET nome = $1, endereco = $2, telefone = $3, email = $4, website = $5, paisorigem = $6 WHERE id = $7', [novoNome, novoEndereco, novoTelefone, novoEmail, novoWebsite, novoPais, req.params.id]);
        res.json({ message: 'Editora atualizada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/editoras/:id', verificarToken, verificarPermissao('editoras_apagar'), async (req, res) => {
    try {
        const check = await pool.query('SELECT COUNT(*) as total FROM Obras WHERE editoraid = $1', [req.params.id]);
        if (Number(check.rows[0].total) > 0) return res.status(400).json({ error: `Editora tem obra(s) associada(s).` });
        
        await pool.query('DELETE FROM Editoras WHERE id = $1', [req.params.id]);
        res.json({ message: 'Editora removida.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ RESERVAS (Fila de Espera + Requisições de Levantamento) ============
app.get('/api/reservas', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT R.id as "Id", O.id as "ObraId", O.titulo as "Obra", O.status as "ObraStatus", 
                   C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone", 
                   TO_CHAR(R.datareserva, 'DD/MM/YYYY') as "DataReserva", 
                   R.status as "Status", R.tipo as "Tipo"
            FROM Reservas R 
            INNER JOIN Obras O ON R.obraid = O.id 
            INNER JOIN Clientes C ON R.clienteid = C.id 
            WHERE R.status = 'PENDENTE' 
            ORDER BY R.datareserva ASC
        `);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/reservas', verificarToken, verificarPermissao('reservas_criar'), async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    if (!ObraId || !ClienteId) return res.status(400).json({ error: 'Obra e Cliente são obrigatórios.' });

    try {
        const checkObra = await pool.query('SELECT titulo, status FROM Obras WHERE id = $1', [ObraId]);
        if (checkObra.rows.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (checkObra.rows[0].status === 'DISPONIVEL') return res.status(400).json({ error: 'Esta obra está disponível. Pode requisitá-la diretamente.' });

        const check = await pool.query("SELECT COUNT(*) as total FROM Reservas WHERE obraid = $1 AND clienteid = $2 AND status = 'PENDENTE'", [ObraId, ClienteId]);
        if (Number(check.rows[0].total) > 0) return res.status(400).json({ error: 'Já tens reserva pendente.' });

        const insertResult = await pool.query(
            "INSERT INTO Reservas (obraid, clienteid, datareserva, status, tipo) VALUES ($1, $2, NOW(), 'PENDENTE', 'FILA_ESPERA') RETURNING id",
            [ObraId, ClienteId]
        );
        const novaReservaId = insertResult.rows[0].id;
        
        const info = await pool.query('SELECT O.titulo as obra, C.nome as cliente FROM Obras O, Clientes C WHERE O.id = $1 AND C.id = $2', [ObraId, ClienteId]);
        
        if (info.rows.length > 0) {
            await criarNotificacao('📌 Nova Reserva', `${info.rows[0].cliente} reservou "${info.rows[0].obra}".`, 'RESERVA', '/reservas');
        }
        
        res.status(201).json({ message: 'Reserva criada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/reservas/:id', verificarToken, verificarPermissao('reservas_cancelar'), async (req, res) => {
    try {
        await pool.query("UPDATE Reservas SET status = 'CANCELADA' WHERE id = $1", [req.params.id]);
        res.json({ message: 'Reserva cancelada.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ EMPRÉSTIMOS ============
app.get('/api/emprestimos', verificarToken, async (req, res) => {
    try {
        const valorMulta = await obterConfig('ValorMultaDia', 40);
        const result = await pool.query(`SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao", CASE WHEN E.dataprevistadevolucao < CURRENT_DATE THEN (CURRENT_DATE - E.dataprevistadevolucao::date) ELSE 0 END as "DiasAtraso", E.status as "Status" FROM Emprestimos E INNER JOIN Obras O ON E.obraid = O.id INNER JOIN Clientes C ON E.clienteid = C.id WHERE E.status = 'ATIVO' ORDER BY "DiasAtraso" DESC, E.dataemprestimo DESC`);
        const dados = result.rows.map((e: any) => ({ ...e, ValorMulta: Number(e.DiasAtraso) > 0 ? Number(e.DiasAtraso) * valorMulta : 0 }));
        res.json(dados);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/atrasados', verificarToken, async (req, res) => {
    try {
        const valorMulta = await obterConfig('ValorMultaDia', 40);
        const result = await pool.query(`SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao", (CURRENT_DATE - E.dataprevistadevolucao::date) as "DiasAtraso" FROM Emprestimos E INNER JOIN Obras O ON E.obraid = O.id INNER JOIN Clientes C ON E.clienteid = C.id WHERE E.status = 'ATIVO' AND E.dataprevistadevolucao < CURRENT_DATE ORDER BY "DiasAtraso" DESC`);
        const dados = result.rows.map((e: any) => ({ ...e, ValorMulta: Number(e.DiasAtraso) * valorMulta }));
        res.json(dados);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/historico', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao", TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao", E.status as "Status" FROM Emprestimos E INNER JOIN Obras O ON E.obraid = O.id INNER JOIN Clientes C ON E.clienteid = C.id ORDER BY E.dataemprestimo DESC`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/:id/comprovativo', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT E.id as "Id", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao", TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao", E.status as "Status", C.id as "ClienteId", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone", O.id as "ObraId", O.titulo as "Obra", O.ano as "ObraAno", A.nome as "Autor", Ed.nome as "Editora" FROM Emprestimos E INNER JOIN Clientes C ON E.clienteid = C.id INNER JOIN Obras O ON E.obraid = O.id LEFT JOIN Autores A ON O.autorid = A.id LEFT JOIN Editoras Ed ON O.editoraid = Ed.id WHERE E.id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrado.' });
        res.json(result.rows[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ CONFIRMAR REQUISIÇÃO DO PORTAL ============
app.post('/api/emprestimos/confirmar-requisicao/:reservaId', verificarToken, verificarPermissao('emprestimos_criar'), async (req, res) => {
    const reservaId = req.params.reservaId;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    const valorMultaDia = await obterConfig('ValorMultaDia', 40);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const resInfo = await client.query(
            'SELECT obraid, clienteid, tipo as "Tipo" FROM Reservas WHERE id = $1 AND status = $2',
            [reservaId, 'PENDENTE']
        );
        if (resInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Requisição não encontrada ou já processada.' });
        }

        const { obraid: obraId, clienteid: clienteId, Tipo } = resInfo.rows[0];

        if (Tipo !== 'LEVANTAMENTO') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Esta reserva não é uma requisição de levantamento.' });
        }

        const checkObra = await client.query("SELECT status FROM Obras WHERE id = $1", [obraId]);
        if (checkObra.rows[0].status !== 'DISPONIVEL') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Obra já não está disponível.' });
        }

        const insertResult = await client.query(
            `INSERT INTO Emprestimos (obraid, clienteid, dataemprestimo, dataprevistadevolucao, status) 
             VALUES ($1, $2, NOW(), NOW() + INTERVAL '${diasEmprestimo} days', 'ATIVO') RETURNING id`,
            [obraId, clienteId]
        );
        const novoEmprestimoId = insertResult.rows[0].id;

        await client.query("UPDATE Obras SET status = 'EMPRESTADO' WHERE id = $1", [obraId]);
        await client.query("UPDATE Reservas SET status = 'ATENDIDA' WHERE id = $1", [reservaId]);

        await client.query('COMMIT');

        const detalhes = await pool.query(
            `SELECT C.nome as "ClienteNome", C.email as "ClienteEmail", O.titulo as "ObraTitulo", 
                    A.nome as "ObraAutor", Ed.nome as "ObraEditora", 
                    TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", 
                    TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao" 
             FROM Emprestimos E 
             INNER JOIN Clientes C ON E.clienteid = C.id 
             INNER JOIN Obras O ON E.obraid = O.id 
             LEFT JOIN Autores A ON O.autorid = A.id 
             LEFT JOIN Editoras Ed ON O.editoraid = Ed.id 
             WHERE E.id = $1`,
            [novoEmprestimoId]
        );

        if (detalhes.rows.length > 0) {
            const d = detalhes.rows[0];
            await criarNotificacao(
                '📤 Empréstimo Confirmado',
                `${d.ClienteNome} levantou "${d.ObraTitulo}".`,
                'EMPRESTIMO',
                '/emprestimos'
            );
            enviarEmailEmprestimo({
                clienteNome: d.ClienteNome,
                clienteEmail: d.ClienteEmail,
                obraTitulo: d.ObraTitulo,
                obraAutor: d.ObraAutor,
                obraEditora: d.ObraEditora,
                dataEmprestimo: d.DataEmprestimo,
                dataPrevistaDevolucao: d.DataPrevistaDevolucao,
                diasEmprestimo,
                valorMultaDia
            }).catch((err) => console.error('Erro ao enviar email:', err));
        }

        res.status(201).json({ message: 'Empréstimo confirmado!', emprestimoId: novoEmprestimoId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Erro ao confirmar requisição:', error);
        res.status(500).json({ error: 'Erro ao confirmar empréstimo.' });
    } finally {
        client.release();
    }
});

app.post('/api/emprestimos', verificarToken, verificarPermissao('emprestimos_criar'), async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    const valorMultaDia = await obterConfig('ValorMultaDia', 40);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertResult = await client.query(`INSERT INTO Emprestimos (obraid, clienteid, dataemprestimo, dataprevistadevolucao, status) VALUES ($1, $2, NOW(), NOW() + INTERVAL '${diasEmprestimo} days', 'ATIVO') RETURNING id`, [ObraId, ClienteId]);
        const novoEmprestimoId = insertResult.rows[0].id;
        await client.query("UPDATE Obras SET status = 'EMPRESTADO' WHERE id = $1", [ObraId]);
        await client.query("UPDATE Reservas SET status = 'ATENDIDA' WHERE obraid = $1 AND clienteid = $2 AND status = 'PENDENTE'", [ObraId, ClienteId]);
        await client.query('COMMIT');

        const detalhes = await pool.query(`SELECT C.nome as "ClienteNome", C.email as "ClienteEmail", O.titulo as "ObraTitulo", A.nome as "ObraAutor", Ed.nome as "ObraEditora", TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo", TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao" FROM Emprestimos E INNER JOIN Clientes C ON E.clienteid = C.id INNER JOIN Obras O ON E.obraid = O.id LEFT JOIN Autores A ON O.autorid = A.id LEFT JOIN Editoras Ed ON O.editoraid = Ed.id WHERE E.id = $1`, [novoEmprestimoId]);

        if (detalhes.rows.length > 0) {
            const d = detalhes.rows[0];
            await criarNotificacao('📤 Novo Empréstimo', `${d.ClienteNome} requisitou "${d.ObraTitulo}".`, 'EMPRESTIMO', '/emprestimos');
            enviarEmailEmprestimo({ clienteNome: d.ClienteNome, clienteEmail: d.ClienteEmail, obraTitulo: d.ObraTitulo, obraAutor: d.ObraAutor, obraEditora: d.ObraEditora, dataEmprestimo: d.DataEmprestimo, dataPrevistaDevolucao: d.DataPrevistaDevolucao, diasEmprestimo, valorMultaDia }).catch((err) => console.error(err));
        }
        res.status(201).json({ message: 'Empréstimo realizado!', emprestimoId: novoEmprestimoId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erro ao realizar empréstimo.' });
    } finally { client.release(); }
});

app.put('/api/emprestimos/:id/devolver', verificarToken, verificarPermissao('emprestimos_devolver'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`SELECT E.obraid, O.titulo as "Obra", C.nome as "Cliente" FROM Emprestimos E INNER JOIN Obras O ON E.obraid = O.id INNER JOIN Clientes C ON E.clienteid = C.id WHERE E.id = $1`, [req.params.id]);
        if (result.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Não encontrado.' }); }
        const { obraid: obraId, Obra: obraTitulo, Cliente: clienteNome } = result.rows[0];
        await client.query("UPDATE Emprestimos SET status = 'DEVOLVIDO', datadevolucao = NOW() WHERE id = $1", [req.params.id]);
        await client.query("UPDATE Obras SET status = 'DISPONIVEL' WHERE id = $1", [obraId]);
        await client.query('COMMIT');
        
        await criarNotificacao('✅ Devolução', `${clienteNome} devolveu "${obraTitulo}".`, 'DEVOLUCAO', '/historico');
        
        const reserva = await pool.query(`
            SELECT C.nome as "ClienteNome", C.email as "ClienteEmail"
            FROM Reservas R
            INNER JOIN Clientes C ON R.clienteid = C.id
            WHERE R.obraid = $1 AND R.status = 'PENDENTE' AND R.tipo = 'FILA_ESPERA'
            ORDER BY R.datareserva ASC LIMIT 1
        `, [obraId]);

        if (reserva.rows.length > 0 && reserva.rows[0].ClienteEmail) {
            await enviarEmailReservaDisponivel({
                clienteNome: reserva.rows[0].ClienteNome,
                clienteEmail: reserva.rows[0].ClienteEmail,
                obraTitulo: obraTitulo
            });
            await criarNotificacao('🎉 Reserva Disponível', `A obra "${obraTitulo}" está disponível para ${reserva.rows[0].ClienteNome}.`, 'RESERVA', '/reservas');
        }

        res.json({ message: 'Devolução realizada!' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erro ao devolver.' });
    } finally { client.release(); }
});

app.put('/api/emprestimos/:id/renovar', verificarToken, verificarPermissao('emprestimos_renovar'), async (req, res) => {
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    try {
        await pool.query(`UPDATE Emprestimos SET dataprevistadevolucao = dataprevistadevolucao + INTERVAL '${diasEmprestimo} days' WHERE id = $1 AND status = 'ATIVO'`, [req.params.id]);
        res.json({ message: `Empréstimo renovado por mais ${diasEmprestimo} dias!` });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ NOTIFICAÇÕES ============
app.get('/api/notificacoes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT id as "Id", titulo as "Titulo", mensagem as "Mensagem", tipo as "Tipo", lida as "Lida", link as "Link", TO_CHAR(datacriacao, 'DD/MM/YYYY') as "Data", TO_CHAR(datacriacao, 'HH24:MI') as "Hora" FROM Notificacoes ORDER BY datacriacao DESC LIMIT 30`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/notificacoes/contagem', verificarToken, async (req, res) => {
    try { const result = await pool.query('SELECT COUNT(*) as total FROM Notificacoes WHERE lida = FALSE'); res.json({ naoLidas: Number(result.rows[0].total) }); } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notificacoes/:id/ler', verificarToken, async (req, res) => {
    try { await pool.query('UPDATE Notificacoes SET lida = TRUE WHERE id = $1', [req.params.id]); res.json({ message: 'Lida.' }); } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notificacoes/ler-todas', verificarToken, async (req, res) => {
    try { await pool.query('UPDATE Notificacoes SET lida = TRUE WHERE lida = FALSE'); res.json({ message: 'Lidas.' }); } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/notificacoes/:id', verificarToken, async (req, res) => {
    try { await pool.query('DELETE FROM Notificacoes WHERE id = $1', [req.params.id]); res.json({ message: 'Removida.' }); } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/notificacoes', verificarToken, apenasAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM Notificacoes WHERE lida = TRUE'); res.json({ message: 'Removidas.' }); } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ ESTATÍSTICAS ============
app.get('/api/estatisticas', verificarToken, async (req, res) => {
    try {
        const totalObras = await pool.query('SELECT COUNT(*) as total FROM Obras');
        const disponiveis = await pool.query("SELECT COUNT(*) as total FROM Obras WHERE status = 'DISPONIVEL'");
        const emprestimosAtivos = await pool.query("SELECT COUNT(*) as total FROM Emprestimos WHERE status = 'ATIVO'");
        const reservasPendentes = await pool.query("SELECT COUNT(*) as total FROM Reservas WHERE status = 'PENDENTE'");
        const emprestimosAtrasados = await pool.query("SELECT COUNT(*) as total FROM Emprestimos WHERE status = 'ATIVO' AND dataprevistadevolucao < CURRENT_DATE");
        res.json({ totalObras: Number(totalObras.rows[0].total), disponiveis: Number(disponiveis.rows[0].total), emprestimosAtivos: Number(emprestimosAtivos.rows[0].total), reservasPendentes: Number(reservasPendentes.rows[0].total), emprestimosAtrasados: Number(emprestimosAtrasados.rows[0].total) });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/estatisticas/hoje', verificarToken, async (req, res) => {
    try {
        const emprestimosHoje = await pool.query('SELECT COUNT(*) as total FROM Emprestimos WHERE dataemprestimo::date = CURRENT_DATE');
        const devolucoesHoje = await pool.query('SELECT COUNT(*) as total FROM Emprestimos WHERE datadevolucao::date = CURRENT_DATE');
        const clientesHoje = await pool.query('SELECT COUNT(*) as total FROM Clientes');
        res.json({ emprestimosHoje: Number(emprestimosHoje.rows[0].total), devolucoesHoje: Number(devolucoesHoje.rows[0].total), clientesTotal: Number(clientesHoje.rows[0].total) });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/estatisticas/graficos', verificarToken, async (req, res) => {
    try {
        const emprestimosPorMes = await pool.query(`SELECT TO_CHAR(dataemprestimo, 'YYYY-MM') as "Mes", COUNT(*) as "Total" FROM Emprestimos WHERE dataemprestimo >= NOW() - INTERVAL '6 months' GROUP BY TO_CHAR(dataemprestimo, 'YYYY-MM') ORDER BY "Mes"`);
        const obrasPorStatus = await pool.query(`SELECT status as name, COUNT(*) as value FROM Obras GROUP BY status`);
        res.json({ emprestimosPorMes: emprestimosPorMes.rows, obrasPorStatus: obrasPorStatus.rows });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/dashboard/top-obras', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT O.id as "Id", O.titulo as "Titulo", A.nome as "Autor", COUNT(E.id) as "TotalEmprestimos" FROM Obras O LEFT JOIN Emprestimos E ON E.obraid = O.id LEFT JOIN Autores A ON O.autorid = A.id GROUP BY O.id, O.titulo, A.nome ORDER BY COUNT(E.id) DESC, O.titulo ASC LIMIT 5`);
        res.json(result.rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

const PORT = Number(process.env.PORT) || 3006;
app.listen(PORT, () => { console.log(`🚀 Servidor Backend PostgreSQL a correr na porta ${PORT}`); });