import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { 
    enviarEmailEmprestimo, 
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

const dbConfig: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
};

function parsePermissoes(valor: any): any {
    if (!valor) return {};
    try { return typeof valor === 'string' ? JSON.parse(valor) : valor; } catch { return {}; }
}

async function obterConfig(chave: string, fallback: number): Promise<number> {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Chave', sql.NVarChar, chave).query('SELECT Valor FROM Configuracoes WHERE Chave = @Chave');
        if (result.recordset.length === 0) return fallback;
        const valor = Number(result.recordset[0].Valor);
        return isNaN(valor) ? fallback : valor;
    } catch { return fallback; }
}

async function criarNotificacao(titulo: string, mensagem: string, tipo: string, link: string | null = null, clienteId: number | null = null) {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Titulo', sql.NVarChar, titulo).input('Mensagem', sql.NVarChar, mensagem)
            .input('Tipo', sql.NVarChar, tipo).input('Link', sql.NVarChar, link).input('ClienteId', sql.Int, clienteId)
            .query('INSERT INTO Notificacoes (Titulo, Mensagem, Tipo, Link, ClienteId) VALUES (@Titulo, @Mensagem, @Tipo, @Link, @ClienteId)');
    } catch (error) { console.error('Erro ao criar notificação:', error); }
}

sql.connect(dbConfig).then(() => {
    console.log('✅ Ligação à Base de Dados SQL Server bem-sucedida!');
    seedAdmin();
}).catch(err => {
    console.error('❌ FALHA NA LIGAÇÃO À BASE DE DADOS:', err.message);
});

async function seedAdmin() {
    try {
        const pool = await sql.connect(dbConfig);
        const check = await pool.request().query("SELECT COUNT(*) as total FROM Usuarios");
        if (check.recordset[0].total === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.request()
                .input('Nome', sql.NVarChar, 'Maurício Guambe').input('Email', sql.NVarChar, 'admin@at.gov.mz')
                .input('PasswordHash', sql.NVarChar, hash).input('Role', sql.NVarChar, 'Admin')
                .query("INSERT INTO Usuarios (Nome, Email, PasswordHash, Role, Permissoes) VALUES (@Nome, @Email, @PasswordHash, @Role, '{}')");
            console.log('🌱 Utilizador Admin criado: admin@at.gov.mz / admin123');
        }
    } catch (error) { console.error('Erro ao criar admin:', error); }
}

// ============ CRON JOB: NOTIFICAÇÕES AUTOMÁTICAS ============
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ A executar rotina de notificações automáticas...');
    const valorMulta = await obterConfig('ValorMultaDia', 40);

    try {
        const pool = await sql.connect(dbConfig);

        const lembretes = await pool.request().query(`
            SELECT E.Id, E.ClienteId, C.Nome as ClienteNome, C.Email as ClienteEmail, O.Titulo as ObraTitulo, 
                   CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevista
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.ClienteId = C.Id
            INNER JOIN Obras O ON E.ObraId = O.Id
            WHERE E.Status = 'ATIVO' AND CAST(E.DataPrevistaDevolucao AS DATE) = DATEADD(day, 2, CAST(GETDATE() AS DATE))
        `);

        for (const row of lembretes.recordset) {
            await criarNotificacao('⏰ Lembrete de Devolução', `A obra "${row.ObraTitulo}" de ${row.ClienteNome} vence em 2 dias.`, 'LEMBRETE', '/emprestimos', null);
            await criarNotificacao('⏰ Lembrete de Devolução', `A obra "${row.ObraTitulo}" deve ser devolvida em 2 dias.`, 'LEMBRETE', '/meus-emprestimos', row.ClienteId);

            if (row.ClienteEmail) {
                await enviarEmailLembrete({
                    clienteNome: row.ClienteNome,
                    clienteEmail: row.ClienteEmail,
                    obraTitulo: row.ObraTitulo,
                    dataPrevista: row.DataPrevista
                });
            }
        }

        const atrasados = await pool.request().query(`
            SELECT E.Id, E.ClienteId, C.Nome as ClienteNome, C.Email as ClienteEmail, O.Titulo as ObraTitulo, 
                   CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevista, 
                   DATEDIFF(day, E.DataPrevistaDevolucao, GETDATE()) as DiasAtraso
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.ClienteId = C.Id
            INNER JOIN Obras O ON E.ObraId = O.Id
            WHERE E.Status = 'ATIVO' AND CAST(E.DataPrevistaDevolucao AS DATE) = DATEADD(day, -1, CAST(GETDATE() AS DATE))
        `);

        for (const row of atrasados.recordset) {
            await criarNotificacao('🚨 Aviso de Atraso', `A obra "${row.ObraTitulo}" de ${row.ClienteNome} está em atraso.`, 'ATRASO', '/emprestimos', null);
            await criarNotificacao('🚨 Aviso de Atraso', `A obra "${row.ObraTitulo}" está em atraso (${row.DiasAtraso} dia(s)). Por favor, devolve.`, 'ATRASO', '/meus-emprestimos', row.ClienteId);

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

// ============ LOGIN UNIFICADO ============
app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
    const { Email, Password } = req.body;
    try {
        const pool = await sql.connect(dbConfig);

        const resultUser = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT Id, Nome, Email, PasswordHash, Role, Permissoes FROM Usuarios WHERE Email = @Email');

        if (resultUser.recordset.length > 0) {
            const user = resultUser.recordset[0];
            const passwordOk = await bcrypt.compare(Password, user.PasswordHash);
            if (!passwordOk) return res.status(401).json({ error: 'Email ou password incorretos.' });

            const permissoes = parsePermissoes(user.Permissoes);
            const token = jwt.sign({ id: user.Id, nome: user.Nome, email: user.Email, role: user.Role, permissoes }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, user: { id: user.Id, nome: user.Nome, email: user.Email, role: user.Role, permissoes } });
        }

        const resultCliente = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT Id, Nome, Email, PasswordHash FROM Clientes WHERE Email = @Email');

        if (resultCliente.recordset.length > 0) {
            const cliente = resultCliente.recordset[0];
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

// ============ NOTIFICAÇÕES ============
app.get('/api/notificacoes', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const user = (req as any).user;
        const isCliente = user.role === 'Cliente';

        const query = isCliente
            ? `SELECT TOP 30 Id, Titulo, Mensagem, Tipo, Lida, Link, CONVERT(VARCHAR(10), DataCriacao, 103) as Data, CONVERT(VARCHAR(5), DataCriacao, 108) as Hora FROM Notificacoes WHERE ClienteId = @ClienteId ORDER BY DataCriacao DESC`
            : `SELECT TOP 30 Id, Titulo, Mensagem, Tipo, Lida, Link, CONVERT(VARCHAR(10), DataCriacao, 103) as Data, CONVERT(VARCHAR(5), DataCriacao, 108) as Hora FROM Notificacoes WHERE ClienteId IS NULL ORDER BY DataCriacao DESC`;
        
        const reqDb = pool.request();
        if (isCliente) reqDb.input('ClienteId', sql.Int, user.id);
        
        const result = await reqDb.query(query);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/notificacoes/contagem', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const user = (req as any).user;
        const isCliente = user.role === 'Cliente';

        const query = isCliente
            ? `SELECT COUNT(*) as total FROM Notificacoes WHERE Lida = 0 AND ClienteId = @ClienteId`
            : `SELECT COUNT(*) as total FROM Notificacoes WHERE Lida = 0 AND ClienteId IS NULL`;
        
        const reqDb = pool.request();
        if (isCliente) reqDb.input('ClienteId', sql.Int, user.id);

        const result = await reqDb.query(query);
        res.json({ naoLidas: result.recordset[0].total });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notificacoes/:id/ler', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, req.params.id).query('UPDATE Notificacoes SET Lida = 1 WHERE Id = @Id');
        res.json({ message: 'Notificação marcada como lida.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notificacoes/ler-todas', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const user = (req as any).user;
        const isCliente = user.role === 'Cliente';

        const query = isCliente
            ? `UPDATE Notificacoes SET Lida = 1 WHERE Lida = 0 AND ClienteId = @ClienteId`
            : `UPDATE Notificacoes SET Lida = 1 WHERE Lida = 0 AND ClienteId IS NULL`;
        
        const reqDb = pool.request();
        if (isCliente) reqDb.input('ClienteId', sql.Int, user.id);

        await reqDb.query(query);
        res.json({ message: 'Todas as notificações marcadas como lidas.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/notificacoes/:id', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Notificacoes WHERE Id = @Id');
        res.json({ message: 'Notificação removida.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/notificacoes', verificarToken, apenasAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().query('DELETE FROM Notificacoes WHERE Lida = 1 AND ClienteId IS NULL');
        res.json({ message: 'Notificações lidas removidas.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ PORTAL DO LEITOR ============
app.get('/api/portal/perfil', verificarToken, apenasCliente, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, (req as any).user.id)
            .query('SELECT Id, Nome, Email, Telefone, PI, NUIT FROM Clientes WHERE Id = @Id');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Leitor não encontrado.' });
        res.json(result.recordset[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/portal/meus-emprestimos', verificarToken, apenasCliente, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ClienteId', sql.Int, (req as any).user.id)
            .query(`
                SELECT E.Id, O.Id as ObraId, O.Titulo as Obra, 
                       (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor, 
                       CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, 
                       CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                       CASE WHEN E.DataPrevistaDevolucao < CAST(GETDATE() AS DATE) THEN DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE()) ELSE 0 END as DiasAtraso,
                       ISNULL(E.RenovacaoPendente, 0) as RenovacaoPendente
                FROM Emprestimos E
                INNER JOIN Obras O ON E.ObraId = O.Id
                LEFT JOIN Autores A ON O.AutorId = A.Id
                WHERE E.ClienteId = @ClienteId AND E.Status = 'ATIVO'
                ORDER BY E.DataEmprestimo DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/portal/minhas-requisicoes', verificarToken, apenasCliente, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ClienteId', sql.Int, (req as any).user.id)
            .query(`
                SELECT R.Id, O.Id as ObraId, O.Titulo as Obra, 
                       (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor, 
                       CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva, R.Tipo as Tipo
                FROM Reservas R
                INNER JOIN Obras O ON R.ObraId = O.Id
                LEFT JOIN Autores A ON O.AutorId = A.Id
                WHERE R.ClienteId = @ClienteId AND R.Status = 'PENDENTE'
                ORDER BY R.DataReserva DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/portal/meu-historico', verificarToken, apenasCliente, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ClienteId', sql.Int, (req as any).user.id)
            .query(`
                SELECT E.Id, O.Titulo as Obra, 
                       (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor, 
                       CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, 
                       CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao
                FROM Emprestimos E
                INNER JOIN Obras O ON E.ObraId = O.Id
                LEFT JOIN Autores A ON O.AutorId = A.Id
                WHERE E.ClienteId = @ClienteId AND E.Status = 'DEVOLVIDO'
                ORDER BY E.DataEmprestimo DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ NOVAS ROTAS: FAVORITOS ============
app.get('/api/portal/favoritos', verificarToken, apenasCliente, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ClienteId', sql.Int, (req as any).user.id)
            .query(`
                SELECT O.Id, O.Titulo, 
                       (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor,
                       E.Nome as Editora, O.Ano, O.Status
                FROM Favoritos F
                INNER JOIN Obras O ON F.ObraId = O.Id
                LEFT JOIN Autores A ON O.AutorId = A.Id
                LEFT JOIN Editoras E ON O.EditoraId = E.Id
                WHERE F.ClienteId = @ClienteId
                ORDER BY F.DataCriacao DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/portal/favoritos', verificarToken, apenasCliente, async (req, res) => {
    const { ObraId } = req.body;
    const ClienteId = (req as any).user.id;

    if (!ObraId) return res.status(400).json({ error: 'Indica a obra a favoritar.' });

    try {
        const pool = await sql.connect(dbConfig);
        const checkObra = await pool.request().input('Id', sql.Int, ObraId).query('SELECT Id FROM Obras WHERE Id = @Id');
        if (checkObra.recordset.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });

        await pool.request()
            .input('ClienteId', sql.Int, ClienteId)
            .input('ObraId', sql.Int, ObraId)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM Favoritos WHERE ClienteId = @ClienteId AND ObraId = @ObraId)
                BEGIN
                    INSERT INTO Favoritos (ClienteId, ObraId) VALUES (@ClienteId, @ObraId)
                END
            `);

        res.status(201).json({ message: 'Adicionado aos favoritos!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/portal/favoritos/:obraid', verificarToken, apenasCliente, async (req, res) => {
    const ObraId = req.params.obraid;
    const ClienteId = (req as any).user.id;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('ClienteId', sql.Int, ClienteId)
            .input('ObraId', sql.Int, ObraId)
            .query('DELETE FROM Favoritos WHERE ClienteId = @ClienteId AND ObraId = @ObraId');
        res.json({ message: 'Removido dos favoritos.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ RESERVAS ============
app.post('/api/portal/requisitar', verificarToken, apenasCliente, async (req, res) => {
    const { ObraId } = req.body;
    const ClienteId = (req as any).user.id;

    if (!ObraId) return res.status(400).json({ error: 'Indica a obra a requisitar.' });

    try {
        const pool = await sql.connect(dbConfig);

        const checkObra = await pool.request()
            .input('Id', sql.Int, ObraId)
            .query('SELECT Titulo, Status FROM Obras WHERE Id = @Id');
        if (checkObra.recordset.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (checkObra.recordset[0].Status !== 'DISPONIVEL') {
            return res.status(400).json({ error: 'Obra indisponível para requisição. Já está emprestada.' });
        }

        const checkPedido = await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .input('ClienteId', sql.Int, ClienteId)
            .query("SELECT COUNT(*) as total FROM Reservas WHERE ObraId = @ObraId AND ClienteId = @ClienteId AND Status = 'PENDENTE'");
        if (checkPedido.recordset[0].total > 0) {
            return res.status(400).json({ error: 'Já tens uma requisição ou reserva pendente para esta obra.' });
        }

        const insertResult = await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .input('ClienteId', sql.Int, ClienteId)
            .query("INSERT INTO Reservas (ObraId, ClienteId, DataReserva, Status, Tipo) OUTPUT INSERTED.Id VALUES (@ObraId, @ClienteId, GETDATE(), 'PENDENTE', 'LEVANTAMENTO')");

        const clienteInfo = await pool.request()
            .input('Id', sql.Int, ClienteId)
            .query('SELECT Nome FROM Clientes WHERE Id = @Id');
        const nomeCliente = clienteInfo.recordset[0].Nome;

        await criarNotificacao(
            '🔔 Nova Requisição',
            `O leitor ${nomeCliente} requisitou "${checkObra.recordset[0].Titulo}" para levantamento.`,
            'RESERVA',
            '/reservas',
            null
        );

        await criarNotificacao(
            '📌 Requisição Efetuada',
            `A tua requisição de "${checkObra.recordset[0].Titulo}" foi enviada. Aguarda a confirmação na biblioteca.`,
            'RESERVA',
            '/meus-emprestimos',
            ClienteId
        );

        res.status(201).json({
            message: 'Requisição efetuada! Dirige-te à biblioteca para levantares o livro.',
            reservaId: insertResult.recordset[0].Id
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/portal/reservar', verificarToken, apenasCliente, async (req, res) => {
    const { ObraId } = req.body;
    const ClienteId = (req as any).user.id;

    if (!ObraId) return res.status(400).json({ error: 'Indica a obra a reservar.' });

    try {
        const pool = await sql.connect(dbConfig);
        const checkObra = await pool.request().input('Id', sql.Int, ObraId).query('SELECT Titulo, Status FROM Obras WHERE Id = @Id');
        if (checkObra.recordset.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (checkObra.recordset[0].Status === 'DISPONIVEL') {
            return res.status(400).json({ error: 'Esta obra está disponível. Podes requisitá-la diretamente.' });
        }

        const checkPedido = await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .input('ClienteId', sql.Int, ClienteId)
            .query("SELECT COUNT(*) as total FROM Reservas WHERE ObraId = @ObraId AND ClienteId = @ClienteId AND Status = 'PENDENTE'");
        if (checkPedido.recordset[0].total > 0) {
            return res.status(400).json({ error: 'Já tens uma requisição ou reserva pendente para esta obra.' });
        }

        const insertResult = await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .input('ClienteId', sql.Int, ClienteId)
            .query("INSERT INTO Reservas (ObraId, ClienteId, DataReserva, Status, Tipo) OUTPUT INSERTED.Id VALUES (@ObraId, @ClienteId, GETDATE(), 'PENDENTE', 'FILA_ESPERA')");

        const queueInfo = await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .query("SELECT COUNT(*) as posicao FROM Reservas WHERE ObraId = @ObraId AND Status = 'PENDENTE' AND Tipo = 'FILA_ESPERA'");
        const posicao = queueInfo.recordset[0].posicao;

        const clienteInfo = await pool.request().input('Id', sql.Int, ClienteId).query('SELECT Nome FROM Clientes WHERE Id = @Id');
        const nomeCliente = clienteInfo.recordset[0].Nome;

        await criarNotificacao(
            '📌 Nova Reserva (Fila de Espera)',
            `O leitor ${nomeCliente} entrou na fila de espera para "${checkObra.recordset[0].Titulo}". Posição: ${posicao}º`,
            'RESERVA',
            '/reservas',
            null
        );
        
        await criarNotificacao(
            '⏳ Reserva em Fila de Espera',
            `Entraste na fila de espera para "${checkObra.recordset[0].Titulo}". A tua posição é ${posicao}º.`,
            'RESERVA',
            '/meus-emprestimos',
            ClienteId
        );

        res.status(201).json({
            message: `Reserva efetuada! Estás na posição ${posicao}º da fila de espera.`,
            reservaId: insertResult.recordset[0].Id,
            posicao
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ ROTA CLIENTE: SOLICITAR RENOVAÇÃO (só pede, NÃO altera data) ============
app.put('/api/portal/emprestimos/:id/renovar', verificarToken, apenasCliente, async (req, res) => {
    const emprestimoId = req.params.id;
    const ClienteId = (req as any).user.id;

    try {
        const pool = await sql.connect(dbConfig);

        const empRes = await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .input('ClienteId', sql.Int, ClienteId)
            .query(`
                SELECT E.Id, E.ObraId, E.DataPrevistaDevolucao, ISNULL(E.RenovacaoPendente, 0) as RenovacaoPendente,
                       O.Titulo as ObraTitulo, C.Nome as ClienteNome, C.Email as ClienteEmail
                FROM Emprestimos E
                INNER JOIN Obras O ON E.ObraId = O.Id
                INNER JOIN Clientes C ON E.ClienteId = C.Id
                WHERE E.Id = @Id AND E.ClienteId = @ClienteId AND E.Status = 'ATIVO'
            `);

        if (empRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado ou não está ativo.' });
        }

        const emp = empRes.recordset[0];

        if (emp.RenovacaoPendente === true || emp.RenovacaoPendente === 1) {
            return res.status(400).json({ error: 'Já tens um pedido de renovação em análise para este empréstimo.' });
        }

        const hoje = new Date();
        const dataPrevista = new Date(emp.DataPrevistaDevolucao);
        if (dataPrevista < hoje) {
            return res.status(400).json({ error: 'Não é possível pedir renovação de um empréstimo em atraso. Deves devolvê-lo na biblioteca.' });
        }

        const resRes = await pool.request()
            .input('ObraId', sql.Int, emp.ObraId)
            .query("SELECT COUNT(*) as total FROM Reservas WHERE ObraId = @ObraId AND Status = 'PENDENTE'");

        if (resRes.recordset[0].total > 0) {
            return res.status(400).json({ error: 'Não é possível pedir renovação. Há leitores à espera deste livro na fila de espera.' });
        }

        await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .query("UPDATE Emprestimos SET RenovacaoPendente = 1, RenovacaoSolicitadaEm = GETDATE() WHERE Id = @Id");

        await criarNotificacao(
            '🔄 Pedido de Renovação',
            `${emp.ClienteNome} pediu para renovar "${emp.ObraTitulo}".`,
            'RENOVACAO',
            '/emprestimos',
            null
        );

        await criarNotificacao(
            '⏳ Pedido de Renovação Enviado',
            `O teu pedido de renovação de "${emp.ObraTitulo}" foi enviado. Aguarda aprovação da biblioteca.`,
            'RENOVACAO',
            '/meus-emprestimos',
            ClienteId
        );

        res.json({ message: 'Pedido de renovação enviado! Aguarda aprovação da biblioteca.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/portal/password', verificarToken, apenasCliente, async (req, res) => {
    const { PasswordAtual, PasswordNova } = req.body;
    if (!PasswordAtual || !PasswordNova) return res.status(400).json({ error: 'Preenche todos os campos.' });
    if (PasswordNova.length < 6) return res.status(400).json({ error: 'A password nova deve ter pelo menos 6 caracteres.' });

    try {
        const pool = await sql.connect(dbConfig);
        const userResult = await pool.request()
            .input('Id', sql.Int, (req as any).user.id)
            .query('SELECT PasswordHash FROM Clientes WHERE Id = @Id');

        if (!userResult.recordset[0].PasswordHash) {
            const novoHash = await bcrypt.hash(PasswordNova, 10);
            await pool.request().input('Id', sql.Int, (req as any).user.id).input('PasswordHash', sql.NVarChar, novoHash)
                .query('UPDATE Clientes SET PasswordHash = @PasswordHash WHERE Id = @Id');
            return res.json({ message: 'Password definida com sucesso!' });
        }

        if (!await bcrypt.compare(PasswordAtual, userResult.recordset[0].PasswordHash)) {
            return res.status(400).json({ error: 'Password atual incorreta.' });
        }

        const novoHash = await bcrypt.hash(PasswordNova, 10);
        await pool.request().input('Id', sql.Int, (req as any).user.id).input('PasswordHash', sql.NVarChar, novoHash)
            .query('UPDATE Clientes SET PasswordHash = @PasswordHash WHERE Id = @Id');
        res.json({ message: 'Password alterada com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ RENOVAÇÕES (ADMIN) ============
app.get('/api/renovacoes/pendentes', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, 
                   O.Titulo as Obra, 
                   (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor,
                   C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone,
                   CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo,
                   CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                   CONVERT(VARCHAR(16), E.RenovacaoSolicitadaEm, 103) + ' ' + CONVERT(VARCHAR(5), E.RenovacaoSolicitadaEm, 108) as SolicitadoEm
            FROM Emprestimos E
            INNER JOIN Obras O ON E.ObraId = O.Id
            INNER JOIN Clientes C ON E.ClienteId = C.Id
            LEFT JOIN Autores A ON O.AutorId = A.Id
            WHERE E.Status = 'ATIVO' AND ISNULL(E.RenovacaoPendente, 0) = 1
            ORDER BY E.RenovacaoSolicitadaEm ASC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/renovacoes/:id/aprovar', verificarToken, verificarPermissao('emprestimos_renovar'), async (req, res) => {
    const emprestimoId = req.params.id;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);

    try {
        const pool = await sql.connect(dbConfig);

        const empRes = await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .query(`
                SELECT E.Id, E.ObraId, E.ClienteId, O.Titulo as ObraTitulo, C.Nome as ClienteNome
                FROM Emprestimos E
                INNER JOIN Obras O ON E.ObraId = O.Id
                INNER JOIN Clientes C ON E.ClienteId = C.Id
                WHERE E.Id = @Id AND E.Status = 'ATIVO' AND ISNULL(E.RenovacaoPendente, 0) = 1
            `);

        if (empRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido de renovação não encontrado ou já processado.' });
        }

        const emp = empRes.recordset[0];

        await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .input('Dias', sql.Int, diasEmprestimo)
            .query(`
                UPDATE Emprestimos
                SET DataPrevistaDevolucao = DATEADD(DAY, @Dias, DataPrevistaDevolucao),
                    RenovacaoPendente = 0,
                    RenovacaoSolicitadaEm = NULL
                WHERE Id = @Id
            `);

        const novaData = await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .query("SELECT CONVERT(VARCHAR(10), DataPrevistaDevolucao, 103) as NovaData FROM Emprestimos WHERE Id = @Id");
        const dataFormatada = novaData.recordset[0].NovaData;

        await criarNotificacao(
            '✅ Renovação Aprovada',
            `Renovação de "${emp.ObraTitulo}" para ${emp.ClienteNome} aprovada. Nova data: ${dataFormatada}.`,
            'RENOVACAO',
            '/emprestimos',
            null
        );

        await criarNotificacao(
            '✅ Renovação Aprovada',
            `O teu pedido de renovação de "${emp.ObraTitulo}" foi aprovado! Nova data de devolução: ${dataFormatada}.`,
            'RENOVACAO',
            '/meus-emprestimos',
            emp.ClienteId
        );

        res.json({ message: `Renovação aprovada! Nova data: ${dataFormatada}.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/renovacoes/:id/rejeitar', verificarToken, verificarPermissao('emprestimos_renovar'), async (req, res) => {
    const emprestimoId = req.params.id;

    try {
        const pool = await sql.connect(dbConfig);

        const empRes = await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .query(`
                SELECT E.Id, E.ObraId, E.ClienteId, O.Titulo as ObraTitulo, C.Nome as ClienteNome
                FROM Emprestimos E
                INNER JOIN Obras O ON E.ObraId = O.Id
                INNER JOIN Clientes C ON E.ClienteId = C.Id
                WHERE E.Id = @Id AND E.Status = 'ATIVO' AND ISNULL(E.RenovacaoPendente, 0) = 1
            `);

        if (empRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido de renovação não encontrado ou já processado.' });
        }

        const emp = empRes.recordset[0];

        await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .query("UPDATE Emprestimos SET RenovacaoPendente = 0, RenovacaoSolicitadaEm = NULL WHERE Id = @Id");

        await criarNotificacao(
            '❌ Renovação Rejeitada',
            `Pedido de renovação de "${emp.ObraTitulo}" (${emp.ClienteNome}) foi rejeitado.`,
            'RENOVACAO',
            '/emprestimos',
            null
        );

        await criarNotificacao(
            '❌ Renovação Rejeitada',
            `O teu pedido de renovação de "${emp.ObraTitulo}" foi rejeitado. O prazo original mantém-se. Dirige-te à biblioteca para mais informações.`,
            'RENOVACAO',
            '/meus-emprestimos',
            emp.ClienteId
        );

        res.json({ message: 'Pedido de renovação rejeitado.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ CONFIGURAÇÕES ============
app.get('/api/configuracoes', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT Chave, Valor FROM Configuracoes');
        const config: any = {};
        result.recordset.forEach((r: any) => { config[r.Chave] = r.Valor; });
        res.json({ diasEmprestimo: Number(config.DiasEmprestimo) || 15, valorMultaDia: Number(config.ValorMultaDia) || 40 });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/configuracoes', verificarToken, apenasAdmin, async (req, res) => {
    const { diasEmprestimo, valorMultaDia } = req.body;
    if (!diasEmprestimo || !valorMultaDia || diasEmprestimo < 1 || valorMultaDia < 0) return res.status(400).json({ error: 'Valores inválidos.' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('V1', sql.NVarChar, String(diasEmprestimo)).query("UPDATE Configuracoes SET Valor = @V1 WHERE Chave = 'DiasEmprestimo'");
        await pool.request().input('V2', sql.NVarChar, String(valorMultaDia)).query("UPDATE Configuracoes SET Valor = @V2 WHERE Chave = 'ValorMultaDia'");
        res.json({ message: 'Configurações atualizadas com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ PERFIL ============
app.get('/api/perfil', verificarToken, async (req, res) => {
    const userId = (req as any).user.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Id', sql.Int, userId).query('SELECT Id, Nome, Email, Role, Permissoes FROM Usuarios WHERE Id = @Id');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado.' });
        const u = result.recordset[0];
        res.json({ Id: u.Id, Nome: u.Nome, Email: u.Email, Role: u.Role, permissoes: parsePermissoes(u.Permissoes) });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/perfil/password', verificarToken, async (req, res) => {
    const userId = (req as any).user.id;
    const { PasswordAtual, PasswordNova } = req.body;
    if (!PasswordAtual || !PasswordNova) return res.status(400).json({ error: 'Preenche todos os campos.' });
    if (PasswordNova.length < 6) return res.status(400).json({ error: 'A nova password deve ter pelo menos 6 caracteres.' });
    try {
        const pool = await sql.connect(dbConfig);
        const userResult = await pool.request().input('Id', sql.Int, userId).query('SELECT PasswordHash FROM Usuarios WHERE Id = @Id');
        if (userResult.recordset.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado.' });
        const passwordOk = await bcrypt.compare(PasswordAtual, userResult.recordset[0].PasswordHash);
        if (!passwordOk) return res.status(400).json({ error: 'A password atual está incorreta.' });
        const novoHash = await bcrypt.hash(PasswordNova, 10);
        await pool.request().input('Id', sql.Int, userId).input('PasswordHash', sql.NVarChar, novoHash).query('UPDATE Usuarios SET PasswordHash = @PasswordHash WHERE Id = @Id');
        res.json({ message: 'Password alterada com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/perfil/atividade', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT TOP 5 E.Id, O.Titulo as Obra, C.Nome as Cliente, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as Data, E.Status
            FROM Emprestimos E INNER JOIN Obras O ON E.ObraId = O.Id INNER JOIN Clientes C ON E.ClienteId = C.Id ORDER BY E.DataEmprestimo DESC
        `);
        res.json({ emprestimosRecentes: result.recordset });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ UTILIZADORES ============
app.get('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT Id, Nome, Email, Role, Permissoes FROM Usuarios ORDER BY Nome');
        const usuarios = result.recordset.map((u: any) => ({ Id: u.Id, Nome: u.Nome, Email: u.Email, Role: u.Role, permissoes: parsePermissoes(u.Permissoes) }));
        res.json(usuarios);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    const { Nome, Email, Password, Role } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const hash = await bcrypt.hash(Password, 10);
        await pool.request()
            .input('Nome', sql.NVarChar, Nome).input('Email', sql.NVarChar, Email).input('PasswordHash', sql.NVarChar, hash).input('Role', sql.NVarChar, Role || 'Bibliotecario').input('Permissoes', sql.NVarChar, '{}')
            .query('INSERT INTO Usuarios (Nome, Email, PasswordHash, Role, Permissoes) VALUES (@Nome, @Email, @PasswordHash, @Role, @Permissoes)');
        await criarNotificacao('👤 Novo Utilizador', `O utilizador ${Nome} (${Role}) foi criado no sistema.`, 'UTILIZADOR', '/utilizadores', null);
        res.status(201).json({ message: 'Utilizador criado com sucesso!' });
    } catch (error: any) {
        if (error.message.includes('UNIQUE')) return res.status(400).json({ error: 'Este email já está registado.' });
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/usuarios/:id/permissoes', verificarToken, apenasAdmin, async (req, res) => {
    const { permissoes } = req.body;
    if (!permissoes || typeof permissoes !== 'object') return res.status(400).json({ error: 'Permissões inválidas.' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, req.params.id).input('Permissoes', sql.NVarChar, JSON.stringify(permissoes)).query('UPDATE Usuarios SET Permissoes = @Permissoes WHERE Id = @Id');
        res.json({ message: 'Permissões atualizadas com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/usuarios/:id/password', verificarToken, apenasAdmin, async (req, res) => {
    const { NovaPassword } = req.body;
    if (!NovaPassword || NovaPassword.length < 6) return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres.' });
    try {
        const pool = await sql.connect(dbConfig);
        const hash = await bcrypt.hash(NovaPassword, 10);
        await pool.request().input('Id', sql.Int, req.params.id).input('PasswordHash', sql.NVarChar, hash).query('UPDATE Usuarios SET PasswordHash = @PasswordHash WHERE Id = @Id');
        res.json({ message: 'Password redefinida com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/usuarios/:id', verificarToken, apenasAdmin, async (req, res) => {
    if (Number(req.params.id) === (req as any).user.id) return res.status(400).json({ error: 'Não podes apagar a tua própria conta.' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Usuarios WHERE Id = @Id');
        res.json({ message: 'Utilizador removido.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ OBRAS ============
app.get('/api/obras', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT O.Id, O.Titulo, (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor, E.Nome as Editora, O.Ano, O.NumeroEdicao, O.NacionalidadeLivro, O.ISBN, O.Codigo, O.AreaConhecimento, O.Localizacao, O.OrdemExcel, O.Status,
                   (SELECT COUNT(*) FROM Emprestimos WHERE ObraId = O.Id) as TotalEmprestimos
            FROM Obras O 
            LEFT JOIN Autores A ON O.AutorId = A.Id 
            LEFT JOIN Editoras E ON O.EditoraId = E.Id
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/disponiveis', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`SELECT O.Id, O.Titulo, (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor FROM Obras O LEFT JOIN Autores A ON O.AutorId = A.Id WHERE O.Status = 'DISPONIVEL'`);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id/reservas', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('ObraId', sql.Int, req.params.id).query(`
            SELECT ROW_NUMBER() OVER (ORDER BY R.DataReserva ASC) as Posicao, R.Id, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone, CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva, R.Tipo as Tipo
            FROM Reservas R INNER JOIN Clientes C ON R.ClienteId = C.Id WHERE R.ObraId = @ObraId AND R.Status = 'PENDENTE' ORDER BY R.DataReserva ASC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id/historico', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('ObraId', sql.Int, req.params.id).query(`
            SELECT E.Id, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao, CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao, E.Status
            FROM Emprestimos E INNER JOIN Clientes C ON E.ClienteId = C.Id WHERE E.ObraId = @ObraId ORDER BY E.DataEmprestimo DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ ROTA: BUSCAR ISBN ============
app.get('/api/obras/buscar-isbn/:isbn', verificarToken, async (req, res) => {
    const { isbn } = req.params;
    try {
        const keyParam = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${keyParam}`;
        const response = await fetch(url);
        const data: any = await response.json();

        console.log('Resposta Google Books:', JSON.stringify(data));

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
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Id', sql.Int, req.params.id).query(`
            SELECT O.Id, O.Titulo, O.Ano, O.NumeroEdicao, O.NacionalidadeLivro, O.ISBN, O.Codigo, O.AreaConhecimento, O.Localizacao, O.OrdemExcel, O.Status, A.Nome as Autor, A.Nacionalidade, E.Nome as Editora, E.Contacto as EditoraContacto
            FROM Obras O LEFT JOIN Autores A ON O.AutorId = A.Id LEFT JOIN Editoras E ON O.EditoraId = E.Id WHERE O.Id = @Id
        `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        res.json(result.recordset[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/obras', verificarToken, verificarPermissao('obras_criar'), verificarCamposObra, async (req, res) => {
    const { Titulo, Ano, AutorId, EditoraId, NumeroEdicao, NacionalidadeLivro, ISBN, Codigo, AreaConhecimento, Localizacao, OrdemExcel } = req.body;

    if (!EditoraId) return res.status(400).json({ error: 'A editora é obrigatória.' });

    try {
        const pool = await sql.connect(dbConfig);
        const insertResult = await pool.request()
            .input('Titulo', sql.NVarChar, Titulo).input('Ano', sql.Int, Ano).input('AutorId', sql.Int, AutorId).input('EditoraId', sql.Int, EditoraId)
            .input('NumeroEdicao', sql.NVarChar, NumeroEdicao || null).input('NacionalidadeLivro', sql.NVarChar, NacionalidadeLivro || null)
            .input('ISBN', sql.NVarChar, ISBN || null).input('Codigo', sql.NVarChar, Codigo || null)
            .input('AreaConhecimento', sql.NVarChar, AreaConhecimento || null).input('Localizacao', sql.NVarChar, Localizacao || null)
            .input('OrdemExcel', sql.Int, OrdemExcel || null)
            .query(`INSERT INTO Obras (Titulo, Ano, AutorId, EditoraId, NumeroEdicao, NacionalidadeLivro, ISBN, Codigo, AreaConhecimento, Localizacao, OrdemExcel, Status) OUTPUT INSERTED.Id VALUES (@Titulo, @Ano, @AutorId, @EditoraId, @NumeroEdicao, @NacionalidadeLivro, @ISBN, @Codigo, @AreaConhecimento, @Localizacao, @OrdemExcel, 'DISPONIVEL')`);

        const novaObraId = insertResult.recordset[0].Id;

        await criarNotificacao('📚 Nova Obra', `A obra "${Titulo}" foi adicionada ao acervo.`, 'OBRA', '/acervo', null);

        res.status(201).json({ message: 'Obra cadastrada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/obras/:id', verificarToken, verificarPermissao('obras_apagar'), async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Obras WHERE Id = @Id');
        res.json({ message: 'Obra removida.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ AUTORES ============
app.get('/api/autores', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT A.Id, A.Nome, A.Sobrenome, A.Nacionalidade, CONVERT(VARCHAR(10), A.DataNascimento, 103) as DataNascimento, A.Biografia, A.Sexo, A.TiposLivros,
            (SELECT COUNT(*) FROM Obras WHERE AutorId = A.Id) as TotalObras FROM Autores A ORDER BY A.Nome
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/autores', verificarToken, verificarPermissao('autores_criar'), verificarCamposAutor, async (req, res) => {
    const { Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia, Sexo, TiposLivros } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Nome', sql.NVarChar, Nome).input('Sobrenome', sql.NVarChar, Sobrenome || null).input('Nacionalidade', sql.NVarChar, Nacionalidade || null)
            .input('DataNascimento', sql.Date, DataNascimento || null).input('Biografia', sql.NVarChar, Biografia || null)
            .input('Sexo', sql.NVarChar, Sexo || null).input('TiposLivros', sql.NVarChar, TiposLivros || null)
            .query(`INSERT INTO Autores (Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia, Sexo, TiposLivros) OUTPUT INSERTED.Id VALUES (@Nome, @Sobrenome, @Nacionalidade, @DataNascimento, @Biografia, @Sexo, @TiposLivros)`);
        res.status(201).json({ message: 'Autor cadastrado!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/autores/:id', verificarToken, verificarPermissao('autores_editar'), verificarCamposAutor, async (req, res) => {
    const { Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia, Sexo, TiposLivros } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const current = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia, Sexo, TiposLivros FROM Autores WHERE Id = @Id');
        if (current.recordset.length === 0) return res.status(404).json({ error: 'Autor não encontrado.' });
        const old = current.recordset[0];

        const novoNome = Nome !== undefined ? Nome : old.Nome;
        const novoSobrenome = Sobrenome !== undefined ? Sobrenome : old.Sobrenome;
        const novaNacionalidade = Nacionalidade !== undefined ? Nacionalidade : old.Nacionalidade;
        const novaData = DataNascimento !== undefined ? DataNascimento : old.DataNascimento;
        const novaBio = Biografia !== undefined ? Biografia : old.Biografia;
        const novoSexo = Sexo !== undefined ? Sexo : old.Sexo;
        const novosTipos = TiposLivros !== undefined ? TiposLivros : old.TiposLivros;

        await pool.request()
            .input('Id', sql.Int, req.params.id).input('Nome', sql.NVarChar, novoNome).input('Sobrenome', sql.NVarChar, novoSobrenome)
            .input('Nacionalidade', sql.NVarChar, novaNacionalidade).input('DataNascimento', sql.Date, novaData)
            .input('Biografia', sql.NVarChar, novaBio).input('Sexo', sql.NVarChar, novoSexo).input('TiposLivros', sql.NVarChar, novosTipos)
            .query(`UPDATE Autores SET Nome = @Nome, Sobrenome = @Sobrenome, Nacionalidade = @Nacionalidade, DataNascimento = @DataNascimento, Biografia = @Biografia, Sexo = @Sexo, TiposLivros = @TiposLivros WHERE Id = @Id`);

        res.json({ message: 'Autor atualizado com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/autores/:id', verificarToken, verificarPermissao('autores_apagar'), async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const check = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT COUNT(*) as total FROM Obras WHERE AutorId = @Id');
        if (check.recordset[0].total > 0) return res.status(400).json({ error: `Este autor tem ${check.recordset[0].total} obra(s) associada(s) e não pode ser eliminado.` });

        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Autores WHERE Id = @Id');
        res.json({ message: 'Autor removido com sucesso.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ CLIENTES ============
app.get('/api/clientes', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT C.Id, C.Nome, C.Email, C.Telefone, C.PI, C.NUIT, 
                   (SELECT COUNT(*) FROM Emprestimos WHERE ClienteId = C.Id) as TotalEmprestimos, 
                   (SELECT COUNT(*) FROM Emprestimos WHERE ClienteId = C.Id AND Status = 'ATIVO') as EmprestimosAtivos,
                   CASE WHEN C.PasswordHash IS NOT NULL THEN 1 ELSE 0 END as ContaAtiva
            FROM Clientes C ORDER BY C.Nome
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/clientes', verificarToken, verificarPermissao('clientes_criar'), verificarCamposCliente, async (req, res) => {
    const { Nome, Email, Telefone, PI, NUIT, Password } = req.body;

    if (!Nome) return res.status(400).json({ error: 'O nome é obrigatório.' });

    try {
        const pool = await sql.connect(dbConfig);

        if (Email) {
            const checkDup = await pool.request().input('Email', sql.NVarChar, Email).query("SELECT COUNT(*) as total FROM Clientes WHERE LOWER(Email) = LOWER(@Email)");
            if (checkDup.recordset[0].total > 0) return res.status(400).json({ error: 'Este email já está registado.' });

            const checkStaff = await pool.request().input('Email', sql.NVarChar, Email).query("SELECT COUNT(*) as total FROM Usuarios WHERE LOWER(Email) = LOWER(@Email)");
            if (checkStaff.recordset[0].total > 0) return res.status(400).json({ error: 'Este email já está registado como funcionário.' });
        }

        const passwordFinal = Password && Password.length >= 6 ? Password : '123456';
        const hash = Email ? await bcrypt.hash(passwordFinal, 10) : null;

        const insertResult = await pool.request()
            .input('Nome', sql.NVarChar, Nome)
            .input('Email', sql.NVarChar, Email || null)
            .input('Telefone', sql.NVarChar, Telefone || null)
            .input('PI', sql.NVarChar, PI || null)
            .input('NUIT', sql.NVarChar, NUIT || null)
            .input('PasswordHash', sql.NVarChar, hash)
            .query('INSERT INTO Clientes (Nome, Email, Telefone, PI, NUIT, PasswordHash) OUTPUT INSERTED.Id VALUES (@Nome, @Email, @Telefone, @PI, @NUIT, @PasswordHash)');

        res.status(201).json({
            message: Email
                ? `Cliente cadastrado! Password inicial: ${passwordFinal} (o leitor deve alterá-la no portal).`
                : 'Cliente cadastrado (sem conta de portal porque não tem email).',
            clienteId: insertResult.recordset[0].Id
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/clientes/:id', verificarToken, verificarPermissao('clientes_editar'), verificarCamposCliente, async (req, res) => {
    const { Nome, Email, Telefone, PI, NUIT } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const current = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT Nome, Email, Telefone, PI, NUIT FROM Clientes WHERE Id = @Id');
        if (current.recordset.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
        const old = current.recordset[0];

        const novoNome = Nome !== undefined ? Nome : old.Nome;
        const novoEmail = Email !== undefined ? Email : old.Email;
        const novoTelefone = Telefone !== undefined ? Telefone : old.Telefone;
        const novoPI = PI !== undefined ? PI : old.PI;
        const novoNUIT = NUIT !== undefined ? NUIT : old.NUIT;

        await pool.request().input('Id', sql.Int, req.params.id).input('Nome', sql.NVarChar, novoNome).input('Email', sql.NVarChar, novoEmail).input('Telefone', sql.NVarChar, novoTelefone).input('PI', sql.NVarChar, novoPI).input('NUIT', sql.NVarChar, novoNUIT)
            .query(`UPDATE Clientes SET Nome = @Nome, Email = @Email, Telefone = @Telefone, PI = @PI, NUIT = @NUIT WHERE Id = @Id`);

        res.json({ message: 'Cliente atualizado com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/clientes/:id/reset-password', verificarToken, apenasAdmin, async (req, res) => {
    const { NovaPassword } = req.body;
    if (!NovaPassword || NovaPassword.length < 6) return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres.' });
    try {
        const pool = await sql.connect(dbConfig);
        const hash = await bcrypt.hash(NovaPassword, 10);
        await pool.request().input('Id', sql.Int, req.params.id).input('PasswordHash', sql.NVarChar, hash).query('UPDATE Clientes SET PasswordHash = @PasswordHash WHERE Id = @Id');
        res.json({ message: 'Password do leitor redefinida com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/clientes/:id', verificarToken, verificarPermissao('clientes_apagar'), async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const checkAtivos = await pool.request().input('Id', sql.Int, req.params.id).query("SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @Id AND Status = 'ATIVO'");
        if (checkAtivos.recordset[0].total > 0) return res.status(400).json({ error: `Este cliente tem ${checkAtivos.recordset[0].total} empréstimo(s) ativo(s) e não pode ser eliminado.` });
        const checkHistorico = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @Id');
        if (checkHistorico.recordset[0].total > 0) return res.status(400).json({ error: `Este cliente tem ${checkHistorico.recordset[0].total} empréstimo(s) no histórico e não pode ser eliminado.` });

        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Clientes WHERE Id = @Id');
        res.json({ message: 'Cliente removido com sucesso.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id/historico', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('ClienteId', sql.Int, req.params.id).query(`
            SELECT E.Id, O.Titulo as Obra, (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao, CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao,
            CASE WHEN E.Status = 'ATIVO' AND E.DataPrevistaDevolucao < CAST(GETDATE() AS DATE) THEN DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE()) ELSE 0 END as DiasAtraso, E.Status
            FROM Emprestimos E INNER JOIN Obras O ON E.ObraId = O.Id LEFT JOIN Autores A ON O.AutorId = A.Id WHERE E.ClienteId = @ClienteId ORDER BY E.DataEmprestimo DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id/reservas', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('ClienteId', sql.Int, req.params.id).query(`
            SELECT R.Id, O.Id as ObraId, O.Titulo as Obra, O.Status as ObraStatus, CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva, R.Tipo as Tipo FROM Reservas R INNER JOIN Obras O ON R.ObraId = O.Id WHERE R.ClienteId = @ClienteId AND R.Status = 'PENDENTE' ORDER BY R.DataReserva DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const cliente = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT Id, Nome, Email, Telefone, PI, NUIT FROM Clientes WHERE Id = @Id');
        if (cliente.recordset.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
        const totalEmprestimos = await pool.request().input('ClienteId', sql.Int, req.params.id).query('SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @ClienteId');
        const emprestimosAtivos = await pool.request().input('ClienteId', sql.Int, req.params.id).query("SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @ClienteId AND Status = 'ATIVO'");
        const emprestimosAtrasados = await pool.request().input('ClienteId', sql.Int, req.params.id).query("SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @ClienteId AND Status = 'ATIVO' AND DataPrevistaDevolucao < CAST(GETDATE() AS DATE)");
        const totalReservas = await pool.request().input('ClienteId', sql.Int, req.params.id).query("SELECT COUNT(*) as total FROM Reservas WHERE ClienteId = @ClienteId AND Status = 'PENDENTE'");
        res.json({
            cliente: cliente.recordset[0],
            estatisticas: {
                totalEmprestimos: totalEmprestimos.recordset[0].total, emprestimosAtivos: emprestimosAtivos.recordset[0].total, emprestimosAtrasados: emprestimosAtrasados.recordset[0].total, totalReservas: totalReservas.recordset[0].total
            }
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ EDITORAS ============
app.get('/api/editoras', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`SELECT E.Id, E.Nome, E.Endereco, E.Telefone, E.Email, E.Website, E.PaisOrigem, (SELECT COUNT(*) FROM Obras WHERE EditoraId = E.Id) as TotalObras FROM Editoras E ORDER BY E.Nome`);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/editoras', verificarToken, verificarPermissao('editoras_criar'), verificarCamposEditora, async (req, res) => {
    const { Nome, Endereco, Telefone, Email, Website, PaisOrigem } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const insertResult = await pool.request().input('Nome', sql.NVarChar, Nome).input('Endereco', sql.NVarChar, Endereco || null).input('Telefone', sql.NVarChar, Telefone || null).input('Email', sql.NVarChar, Email || null).input('Website', sql.NVarChar, Website || null).input('PaisOrigem', sql.NVarChar, PaisOrigem || null)
            .query(`INSERT INTO Editoras (Nome, Endereco, Telefone, Email, Website, PaisOrigem) OUTPUT INSERTED.Id VALUES (@Nome, @Endereco, @Telefone, @Email, @Website, @PaisOrigem)`);

        res.status(201).json({ message: 'Editora cadastrada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/editoras/:id', verificarToken, verificarPermissao('editoras_editar'), verificarCamposEditora, async (req, res) => {
    const { Nome, Endereco, Telefone, Email, Website, PaisOrigem } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const current = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT Nome, Endereco, Telefone, Email, Website, PaisOrigem FROM Editoras WHERE Id = @Id');
        if (current.recordset.length === 0) return res.status(404).json({ error: 'Editora não encontrada.' });
        const old = current.recordset[0];

        const novoNome = Nome !== undefined ? Nome : old.Nome;
        const novoEndereco = Endereco !== undefined ? Endereco : old.Endereco;
        const novoTelefone = Telefone !== undefined ? Telefone : old.Telefone;
        const novoEmail = Email !== undefined ? Email : old.Email;
        const novoWebsite = Website !== undefined ? Website : old.Website;
        const novoPais = PaisOrigem !== undefined ? PaisOrigem : old.PaisOrigem;

        await pool.request().input('Id', sql.Int, req.params.id).input('Nome', sql.NVarChar, novoNome).input('Endereco', sql.NVarChar, novoEndereco).input('Telefone', sql.NVarChar, novoTelefone).input('Email', sql.NVarChar, novoEmail).input('Website', sql.NVarChar, novoWebsite).input('PaisOrigem', sql.NVarChar, novoPais)
            .query(`UPDATE Editoras SET Nome = @Nome, Endereco = @Endereco, Telefone = @Telefone, Email = @Email, Website = @Website, PaisOrigem = @PaisOrigem WHERE Id = @Id`);

        res.json({ message: 'Editora atualizada com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/editoras/:id', verificarToken, verificarPermissao('editoras_apagar'), async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const check = await pool.request().input('Id', sql.Int, req.params.id).query('SELECT COUNT(*) as total FROM Obras WHERE EditoraId = @Id');
        if (check.recordset[0].total > 0) return res.status(400).json({ error: `Esta editora tem ${check.recordset[0].total} obra(s) associada(s) e não pode ser eliminada.` });

        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Editoras WHERE Id = @Id');
        res.json({ message: 'Editora removida com sucesso.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ RESERVAS ============
app.get('/api/reservas', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT R.Id, O.Id as ObraId, O.Titulo as Obra, O.Status as ObraStatus, 
                   C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone, 
                   CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva, 
                   R.Status, R.Tipo
            FROM Reservas R INNER JOIN Obras O ON R.ObraId = O.Id INNER JOIN Clientes C ON R.ClienteId = C.Id 
            WHERE R.Status = 'PENDENTE' ORDER BY R.DataReserva ASC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/reservas', verificarToken, verificarPermissao('reservas_criar'), async (req, res) => {
    const { ObraId, ClienteId } = req.body;

    if (!ObraId || !ClienteId) return res.status(400).json({ error: 'Obra e Cliente são obrigatórios.' });

    try {
        const pool = await sql.connect(dbConfig);
        const checkObra = await pool.request().input('Id', sql.Int, ObraId).query('SELECT Titulo, Status FROM Obras WHERE Id = @Id');
        if (checkObra.recordset.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (checkObra.recordset[0].Status === 'DISPONIVEL') return res.status(400).json({ error: 'Esta obra está disponível. Pode requisitá-la diretamente.' });

        const check = await pool.request().input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId).query(`SELECT COUNT(*) as total FROM Reservas WHERE ObraId = @ObraId AND ClienteId = @ClienteId AND Status = 'PENDENTE'`);
        if (check.recordset[0].total > 0) return res.status(400).json({ error: 'Já tens uma reserva pendente para esta obra.' });

        const insertResult = await pool.request().input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId).query(`INSERT INTO Reservas (ObraId, ClienteId, DataReserva, Status, Tipo) OUTPUT INSERTED.Id VALUES (@ObraId, @ClienteId, GETDATE(), 'PENDENTE', 'FILA_ESPERA')`);
        const novaReservaId = insertResult.recordset[0].Id;

        const info = await pool.request().input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId).query(`SELECT O.Titulo as Obra, C.Nome as Cliente FROM Obras O, Clientes C WHERE O.Id = @ObraId AND C.Id = @ClienteId`);

        if (info.recordset.length > 0) {
            await criarNotificacao('📌 Nova Reserva', `${info.recordset[0].Cliente} reservou "${info.recordset[0].Obra}".`, 'RESERVA', '/reservas', null);
        }

        res.status(201).json({ message: 'Reserva criada com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/reservas/:id', verificarToken, verificarPermissao('reservas_cancelar'), async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, req.params.id).query(`UPDATE Reservas SET Status = 'CANCELADA' WHERE Id = @Id`);
        res.json({ message: 'Reserva cancelada.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ EMPRÉSTIMOS ============
app.get('/api/emprestimos', verificarToken, async (req, res) => {
    try {
        const valorMulta = await obterConfig('ValorMultaDia', 40);
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, O.Titulo as Obra, C.Nome as Cliente, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
            CASE WHEN E.DataPrevistaDevolucao < CAST(GETDATE() AS DATE) THEN DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE()) ELSE 0 END as DiasAtraso, E.Status,
            ISNULL(E.RenovacaoPendente, 0) as RenovacaoPendente
            FROM Emprestimos E INNER JOIN Obras O ON E.ObraId = O.Id INNER JOIN Clientes C ON E.ClienteId = C.Id WHERE E.Status = 'ATIVO' ORDER BY DiasAtraso DESC, E.DataEmprestimo DESC
        `);
        const dados = result.recordset.map((e: any) => ({ ...e, ValorMulta: e.DiasAtraso > 0 ? e.DiasAtraso * valorMulta : 0 }));
        res.json(dados);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/atrasados', verificarToken, async (req, res) => {
    try {
        const valorMulta = await obterConfig('ValorMultaDia', 40);
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, O.Titulo as Obra, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao, DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE()) as DiasAtraso
            FROM Emprestimos E INNER JOIN Obras O ON E.ObraId = O.Id INNER JOIN Clientes C ON E.ClienteId = C.Id WHERE E.Status = 'ATIVO' AND E.DataPrevistaDevolucao < CAST(GETDATE() AS DATE) ORDER BY DiasAtraso DESC
        `);
        const dados = result.recordset.map((e: any) => ({ ...e, ValorMulta: e.DiasAtraso * valorMulta }));
        res.json(dados);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/historico', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, O.Titulo as Obra, C.Nome as Cliente, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao, CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao, E.Status
            FROM Emprestimos E INNER JOIN Obras O ON E.ObraId = O.Id INNER JOIN Clientes C ON E.ClienteId = C.Id ORDER BY E.DataEmprestimo DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/:id/comprovativo', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Id', sql.Int, req.params.id).query(`
            SELECT E.Id, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao, CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao, E.Status,
            C.Id as ClienteId, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone, O.Id as ObraId, O.Titulo as Obra, O.Ano as ObraAno, A.Nome as Autor, Ed.Nome as Editora
            FROM Emprestimos E INNER JOIN Clientes C ON E.ClienteId = C.Id INNER JOIN Obras O ON E.ObraId = O.Id LEFT JOIN Autores A ON O.AutorId = A.Id LEFT JOIN Editoras Ed ON O.EditoraId = Ed.Id WHERE E.Id = @Id
        `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        res.json(result.recordset[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ CONFIRMAR REQUISIÇÃO DO PORTAL ============
app.post('/api/emprestimos/confirmar-requisicao/:reservaId', verificarToken, verificarPermissao('emprestimos_criar'), async (req, res) => {
    const reservaId = req.params.reservaId;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    const valorMultaDia = await obterConfig('ValorMultaDia', 40);

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        const r1 = new sql.Request(transaction);
        const resInfo = await r1.input('Id', sql.Int, reservaId).query("SELECT ObraId, ClienteId, Tipo FROM Reservas WHERE Id = @Id AND Status = 'PENDENTE'");
        if (resInfo.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Requisição não encontrada ou já processada.' });
        }

        const { ObraId: obraId, ClienteId: clienteId, Tipo } = resInfo.recordset[0];

        if (Tipo !== 'LEVANTAMENTO') {
            await transaction.rollback();
            return res.status(400).json({ error: 'Esta reserva não é uma requisição de levantamento.' });
        }

        const r2 = new sql.Request(transaction);
        const checkObra = await r2.input('Id', sql.Int, obraId).query("SELECT Status FROM Obras WHERE Id = @Id");
        if (checkObra.recordset[0].Status !== 'DISPONIVEL') {
            await transaction.rollback();
            return res.status(400).json({ error: 'Obra já não está disponível.' });
        }

        const r3 = new sql.Request(transaction);
        const insertResult = await r3.input('ObraId', sql.Int, obraId).input('ClienteId', sql.Int, clienteId).input('Dias', sql.Int, diasEmprestimo)
            .query(`INSERT INTO Emprestimos (ObraId, ClienteId, DataEmprestimo, DataPrevistaDevolucao, Status) OUTPUT INSERTED.Id VALUES (@ObraId, @ClienteId, GETDATE(), DATEADD(DAY, @Dias, GETDATE()), 'ATIVO')`);
        const novoEmprestimoId = insertResult.recordset[0].Id;

        const r4 = new sql.Request(transaction);
        await r4.input('Id', sql.Int, obraId).query("UPDATE Obras SET Status = 'EMPRESTADO' WHERE Id = @Id");

        const r5 = new sql.Request(transaction);
        await r5.input('Id', sql.Int, reservaId).query("UPDATE Reservas SET Status = 'ATENDIDA' WHERE Id = @Id");

        await transaction.commit();

        const detalhes = await pool.request().input('Id', sql.Int, novoEmprestimoId).query(`
            SELECT C.Nome as ClienteNome, C.Email as ClienteEmail, O.Titulo as ObraTitulo, A.Nome as ObraAutor, Ed.Nome as ObraEditora, 
                   CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao
            FROM Emprestimos E INNER JOIN Clientes C ON E.ClienteId = C.Id INNER JOIN Obras O ON E.ObraId = O.Id LEFT JOIN Autores A ON O.AutorId = A.Id LEFT JOIN Editoras Ed ON O.EditoraId = Ed.Id WHERE E.Id = @Id
        `);

        if (detalhes.recordset.length > 0) {
            const d = detalhes.recordset[0];
            await criarNotificacao('📤 Empréstimo Confirmado', `${d.ClienteNome} levantou "${d.ObraTitulo}".`, 'EMPRESTIMO', '/emprestimos', null);
            await criarNotificacao('✅ Empréstimo Confirmado', `O teu empréstimo de "${d.ObraTitulo}" foi confirmado. Devolve até ${d.DataPrevistaDevolucao}.`, 'EMPRESTIMO', '/meus-emprestimos', clienteId);
            
            enviarEmailEmprestimo({ clienteNome: d.ClienteNome, clienteEmail: d.ClienteEmail, obraTitulo: d.ObraTitulo, obraAutor: d.ObraAutor, obraEditora: d.ObraEditora, dataEmprestimo: d.DataEmprestimo, dataPrevistaDevolucao: d.DataPrevistaDevolucao, diasEmprestimo, valorMultaDia }).catch((err) => console.error('Erro ao enviar email:', err));
        }

        res.status(201).json({ message: 'Empréstimo confirmado!', emprestimoId: novoEmprestimoId });
    } catch (error: any) {
        await transaction.rollback();
        console.error('Erro ao confirmar requisição:', error);
        res.status(500).json({ error: 'Erro ao confirmar empréstimo.' });
    }
});

app.post('/api/emprestimos', verificarToken, verificarPermissao('emprestimos_criar'), async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    const valorMultaDia = await obterConfig('ValorMultaDia', 40);
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const r1 = new sql.Request(transaction);
        const insertResult = await r1.input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId).input('Dias', sql.Int, diasEmprestimo)
            .query(`INSERT INTO Emprestimos (ObraId, ClienteId, DataEmprestimo, DataPrevistaDevolucao, Status) OUTPUT INSERTED.Id VALUES (@ObraId, @ClienteId, GETDATE(), DATEADD(DAY, @Dias, GETDATE()), 'ATIVO')`);
        const novoEmprestimoId = insertResult.recordset[0].Id;
        const r2 = new sql.Request(transaction);
        await r2.input('ObraId', sql.Int, ObraId).query(`UPDATE Obras SET Status = 'EMPRESTADO' WHERE Id = @ObraId`);
        const r3 = new sql.Request(transaction);
        await r3.input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId).query(`UPDATE Reservas SET Status = 'ATENDIDA' WHERE ObraId = @ObraId AND ClienteId = @ClienteId AND Status = 'PENDENTE'`);
        await transaction.commit();

        const detalhes = await pool.request().input('Id', sql.Int, novoEmprestimoId).query(`
            SELECT C.Nome as ClienteNome, C.Email as ClienteEmail, O.Titulo as ObraTitulo, A.Nome as ObraAutor, Ed.Nome as ObraEditora, CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao
            FROM Emprestimos E INNER JOIN Clientes C ON E.ClienteId = C.Id INNER JOIN Obras O ON E.ObraId = O.Id LEFT JOIN Autores A ON O.AutorId = A.Id LEFT JOIN Editoras Ed ON O.EditoraId = Ed.Id WHERE E.Id = @Id
        `);

        if (detalhes.recordset.length > 0) {
            const d = detalhes.recordset[0];
            await criarNotificacao('📤 Novo Empréstimo', `${d.ClienteNome} requisitou "${d.ObraTitulo}".`, 'EMPRESTIMO', '/emprestimos', null);
            enviarEmailEmprestimo({ clienteNome: d.ClienteNome, clienteEmail: d.ClienteEmail, obraTitulo: d.ObraTitulo, obraAutor: d.ObraAutor, obraEditora: d.ObraEditora, dataEmprestimo: d.DataEmprestimo, dataPrevistaDevolucao: d.DataPrevistaDevolucao, diasEmprestimo, valorMultaDia }).catch((err) => console.error('Erro ao enviar email:', err));
        }
        res.status(201).json({ message: 'Empréstimo realizado!', emprestimoId: novoEmprestimoId });
    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ error: 'Erro ao realizar empréstimo.' });
    }
});

app.put('/api/emprestimos/:id/devolver', verificarToken, verificarPermissao('emprestimos_devolver'), async (req, res) => {
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const r1 = new sql.Request(transaction);
        const result = await r1.input('Id', sql.Int, req.params.id).query(`SELECT E.ObraId, E.ClienteId, O.Titulo as Obra, C.Nome as Cliente FROM Emprestimos E INNER JOIN Obras O ON E.ObraId = O.Id INNER JOIN Clientes C ON E.ClienteId = C.Id WHERE E.Id = @Id`);
        if (result.recordset.length === 0) { await transaction.rollback(); return res.status(404).json({ error: 'Não encontrado.' }); }
        const { ObraId: obraId, ClienteId: clienteId, Obra: obraTitulo, Cliente: clienteNome } = result.recordset[0];
        const r2 = new sql.Request(transaction);
        await r2.input('Id', sql.Int, req.params.id).query(`UPDATE Emprestimos SET Status = 'DEVOLVIDO', DataDevolucao = GETDATE(), RenovacaoPendente = 0, RenovacaoSolicitadaEm = NULL WHERE Id = @Id`);
        const r3 = new sql.Request(transaction);
        await r3.input('Id', sql.Int, obraId).query(`UPDATE Obras SET Status = 'DISPONIVEL' WHERE Id = @Id`);
        await transaction.commit();

        await criarNotificacao('✅ Devolução', `${clienteNome} devolveu "${obraTitulo}".`, 'DEVOLUCAO', '/historico', null);
        await criarNotificacao('✅ Devolução Confirmada', `Devolveste a obra "${obraTitulo}".`, 'DEVOLUCAO', '/meu-historico', clienteId);

        const reserva = await pool.request().input('Id', sql.Int, obraId).query(`
            SELECT TOP 1 C.Nome as ClienteNome, C.Email as ClienteEmail, C.Id as ClienteId
            FROM Reservas R
            INNER JOIN Clientes C ON R.ClienteId = C.Id
            WHERE R.ObraId = @Id AND R.Status = 'PENDENTE' AND R.Tipo = 'FILA_ESPERA'
            ORDER BY R.DataReserva ASC
        `);

        if (reserva.recordset.length > 0 && reserva.recordset[0].ClienteEmail) {
            const r = reserva.recordset[0];
            await enviarEmailReservaDisponivel({
                clienteNome: r.ClienteNome,
                clienteEmail: r.ClienteEmail,
                obraTitulo: obraTitulo
            });
            await criarNotificacao('🎉 Reserva Disponível', `A obra "${obraTitulo}" está disponível para ${r.ClienteNome}.`, 'RESERVA', '/reservas', null);
            await criarNotificacao('🎉 O Teu Livro Está Disponível', `A obra "${obraTitulo}" que reservaste está disponível. Passa na biblioteca!`, 'RESERVA', '/meu-historico', r.ClienteId);
        }

        res.json({ message: 'Devolução realizada!' });
    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ error: 'Erro ao realizar devolução.' });
    }
});

app.put('/api/emprestimos/:id/renovar', verificarToken, verificarPermissao('emprestimos_renovar'), async (req, res) => {
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Id', sql.Int, req.params.id)
            .input('Dias', sql.Int, diasEmprestimo)
            .query(`UPDATE Emprestimos SET DataPrevistaDevolucao = DATEADD(DAY, @Dias, DataPrevistaDevolucao), RenovacaoPendente = 0, RenovacaoSolicitadaEm = NULL WHERE Id = @Id AND Status = 'ATIVO'`);
        res.json({ message: `Empréstimo renovado por mais ${diasEmprestimo} dias!` });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ ESTATÍSTICAS ============
app.get('/api/estatisticas', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const totalObras = await pool.request().query("SELECT COUNT(*) as total FROM Obras");
        const disponiveis = await pool.request().query("SELECT COUNT(*) as total FROM Obras WHERE Status = 'DISPONIVEL'");
        const emprestimosAtivos = await pool.request().query("SELECT COUNT(*) as total FROM Emprestimos WHERE Status = 'ATIVO'");
        const reservasPendentes = await pool.request().query("SELECT COUNT(*) as total FROM Reservas WHERE Status = 'PENDENTE'");
        const emprestimosAtrasados = await pool.request().query("SELECT COUNT(*) as total FROM Emprestimos WHERE Status = 'ATIVO' AND DataPrevistaDevolucao < CAST(GETDATE() AS DATE)");
        const renovacoesPendentes = await pool.request().query("SELECT COUNT(*) as total FROM Emprestimos WHERE Status = 'ATIVO' AND ISNULL(RenovacaoPendente, 0) = 1");
        res.json({ 
            totalObras: totalObras.recordset[0].total, 
            disponiveis: disponiveis.recordset[0].total, 
            emprestimosAtivos: emprestimosAtivos.recordset[0].total, 
            reservasPendentes: reservasPendentes.recordset[0].total, 
            emprestimosAtrasados: emprestimosAtrasados.recordset[0].total,
            renovacoesPendentes: renovacoesPendentes.recordset[0].total
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/estatisticas/hoje', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const emprestimosHoje = await pool.request().query("SELECT COUNT(*) as total FROM Emprestimos WHERE CAST(DataEmprestimo AS DATE) = CAST(GETDATE() AS DATE)");
        const devolucoesHoje = await pool.request().query("SELECT COUNT(*) as total FROM Emprestimos WHERE CAST(DataDevolucao AS DATE) = CAST(GETDATE() AS DATE)");
        const clientesHoje = await pool.request().query("SELECT COUNT(*) as total FROM Clientes");
        res.json({ emprestimosHoje: emprestimosHoje.recordset[0].total, devolucoesHoje: devolucoesHoje.recordset[0].total, clientesTotal: clientesHoje.recordset[0].total });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/estatisticas/graficos', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const emprestimosPorMes = await pool.request().query(`SELECT CONVERT(VARCHAR(7), DataEmprestimo, 120) as Mes, COUNT(*) as Total FROM Emprestimos WHERE DataEmprestimo >= DATEADD(MONTH, -6, GETDATE()) GROUP BY CONVERT(VARCHAR(7), DataEmprestimo, 120) ORDER BY Mes`);
        const obrasPorStatus = await pool.request().query(`SELECT Status as name, COUNT(*) as value FROM Obras GROUP BY Status`);
        res.json({ emprestimosPorMes: emprestimosPorMes.recordset, obrasPorStatus: obrasPorStatus.recordset });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/dashboard/top-obras', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`SELECT TOP 5 O.Id, O.Titulo, (A.Nome + ' ' + ISNULL(A.Sobrenome, '')) as Autor, COUNT(E.Id) as TotalEmprestimos FROM Obras O LEFT JOIN Emprestimos E ON E.ObraId = O.Id LEFT JOIN Autores A ON O.AutorId = A.Id GROUP BY O.Id, O.Titulo, A.Nome, A.Sobrenome ORDER BY COUNT(E.Id) DESC, O.Titulo ASC`);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

const PORT = Number(process.env.PORT) || 3005;
app.listen(PORT, () => { console.log(`Servidor Backend a correr na porta ${PORT}`); });