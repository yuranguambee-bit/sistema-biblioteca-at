import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { enviarEmailEmprestimo, enviarEmailBackup } from './utils/email';

dotenv.config();

const app = express();

// ============ CORS RESTRITO (só origens autorizadas) ============
const allowedOrigins = [
    'https://sistema-biblioteca-at.vercel.app',  // produção (Vercel)
    'http://localhost:5173',                     // desenvolvimento local (Vite)
    'http://localhost:4173',                     // preview local (Vite preview)
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

// ============ RATE LIMITING (proteção contra abuso) ============

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Demasiados pedidos. Tenta novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiadas tentativas de login. Tenta novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

app.use(generalLimiter);

// ============ JWT SECRET (via variável de ambiente) ============
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
    console.error('❌ ERRO CRÍTICO: JWT_SECRET não está definido!');
    console.error('   Adiciona JWT_SECRET ao .env ou às variáveis de ambiente do Render.');
    process.exit(1);
}

// ============ POOL POSTGRESQL ============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Teste de ligação inicial
pool.query('SELECT NOW()')
    .then(() => {
        console.log('✅ Ligação à Base de Dados PostgreSQL (Neon) bem-sucedida!');
        seedAdmin();
    })
    .catch((err) => {
        console.error('❌ FALHA NA LIGAÇÃO À BASE DE DADOS:', err.message);
    });

// ============ UTILITÁRIOS ============
function parsePermissoes(valor: any): any {
    if (!valor) return {};
    try {
        return typeof valor === 'string' ? JSON.parse(valor) : valor;
    } catch {
        return {};
    }
}

async function obterConfig(chave: string, fallback: number): Promise<number> {
    try {
        const result = await pool.query(
            'SELECT Valor FROM Configuracoes WHERE Chave = $1',
            [chave]
        );
        if (result.rows.length === 0) return fallback;
        const valor = Number(result.rows[0].valor || result.rows[0].Valor);
        return isNaN(valor) ? fallback : valor;
    } catch {
        return fallback;
    }
}

async function criarNotificacao(titulo: string, mensagem: string, tipo: string, link: string | null = null) {
    try {
        await pool.query(
            'INSERT INTO Notificacoes (Titulo, Mensagem, Tipo, Link) VALUES ($1, $2, $3, $4)',
            [titulo, mensagem, tipo, link]
        );
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
    }
}

async function seedAdmin() {
    try {
        const check = await pool.query('SELECT COUNT(*) as total FROM Usuarios');
        if (Number(check.rows[0].total) === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO Usuarios (Nome, Email, PasswordHash, Role, Permissoes) VALUES ($1, $2, $3, $4, $5)',
                ['Maurício Guambe', 'admin@at.gov.mz', hash, 'Admin', '{}']
            );
            console.log('🌱 Utilizador Admin criado: admin@at.gov.mz / admin123');
        }
    } catch (error) {
        console.error('Erro ao criar admin:', error);
    }
}

// ============ MIDDLEWARES ============
function verificarToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado. Sem token.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

function apenasAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    next();
}

function verificarPermissao(chave: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ error: 'Não autenticado.' });
        if (user.role === 'Admin') return next();
        const permissoes = parsePermissoes(user.permissoes);
        if (permissoes[chave] === true) return next();
        return res.status(403).json({ error: 'Não tens permissão para esta ação.' });
    };
}

// ============ AUTENTICAÇÃO ============
app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
    const { Email, Password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", passwordhash as "PasswordHash", role as "Role", permissoes as "Permissoes" FROM Usuarios WHERE email = $1',
            [Email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email ou password incorretos.' });
        }

        const user = result.rows[0];
        const passwordOk = await bcrypt.compare(Password, user.PasswordHash);
        if (!passwordOk) {
            return res.status(401).json({ error: 'Email ou password incorretos.' });
        }

        const permissoes = parsePermissoes(user.Permissoes);

        const token = jwt.sign(
            { id: user.Id, nome: user.Nome, email: user.Email, role: user.Role, permissoes },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.Id,
                nome: user.Nome,
                email: user.Email,
                role: user.Role,
                permissoes,
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ BACKUP AUTOMÁTICO ============
// Endpoint protegido por BACKUP_SECRET (header x-backup-secret).
// Deve ser chamado por um serviço externo (ex: cron-job.org) uma vez por semana.
app.post('/api/backup/executar', async (req: Request, res: Response) => {
    const secretHeader = req.headers['x-backup-secret'];
    const secretEsperado = process.env.BACKUP_SECRET;

    if (!secretEsperado) {
        console.error('❌ BACKUP_SECRET não está definido no ambiente.');
        return res.status(500).json({ error: 'Backup não configurado no servidor.' });
    }

    if (!secretHeader || secretHeader !== secretEsperado) {
        console.warn('🚫 Tentativa de acesso não autorizado ao endpoint de backup.');
        return res.status(401).json({ error: 'Não autorizado.' });
    }

    console.log('💾 A iniciar backup automático...');

    try {
        const tabelas = [
            'usuarios',
            'autores',
            'editoras',
            'obras',
            'clientes',
            'emprestimos',
            'reservas',
            'notificacoes',
            'configuracoes',
        ];

        const dadosBackup: any = {
            dataBackup: new Date().toISOString(),
            versao: '1.0',
            sistema: 'Sistema de Gestão de Biblioteca - AT Moçambique',
            tabelas: {},
        };

        for (const tabela of tabelas) {
            try {
                const result = await pool.query(`SELECT * FROM ${tabela}`);
                dadosBackup.tabelas[tabela] = result.rows;
            } catch (err: any) {
                console.warn(`⚠️ Não foi possível exportar a tabela "${tabela}":`, err.message);
                dadosBackup.tabelas[tabela] = [];
            }
        }

        const destinatario = process.env.BACKUP_EMAIL || process.env.EMAIL_USER || '';
        const dataFormatada = new Date().toLocaleString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        const enviado = await enviarEmailBackup({
            destinatario,
            dataBackup: dataFormatada,
            conteudo: dadosBackup,
        });

        if (!enviado) {
            console.error('❌ Falha ao enviar email de backup.');
            return res.status(500).json({ error: 'Backup gerado mas falhou o envio do email.' });
        }

        const totalRegistos = Object.values(dadosBackup.tabelas).reduce(
            (acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0),
            0
        );

        console.log(`✅ Backup concluído com sucesso (${totalRegistos} registos).`);

        res.json({
            message: 'Backup realizado com sucesso!',
            data: dataFormatada,
            destinatario,
            totalRegistos,
            tabelas: Object.fromEntries(
                Object.entries(dadosBackup.tabelas).map(([k, v]: [string, any]) => [k, Array.isArray(v) ? v.length : 0])
            ),
        });
    } catch (error: any) {
        console.error('❌ Erro no backup:', error);
        res.status(500).json({ error: 'Erro ao executar backup: ' + error.message });
    }
});

// ============ CONFIGURAÇÕES ============
app.get('/api/configuracoes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT chave, valor FROM Configuracoes');
        const config: any = {};
        result.rows.forEach((r: any) => {
            config[r.chave] = r.valor;
        });
        res.json({
            diasEmprestimo: Number(config.DiasEmprestimo) || 15,
            valorMultaDia: Number(config.ValorMultaDia) || 40,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/configuracoes', verificarToken, apenasAdmin, async (req, res) => {
    const { diasEmprestimo, valorMultaDia } = req.body;
    if (!diasEmprestimo || !valorMultaDia || diasEmprestimo < 1 || valorMultaDia < 0) {
        return res.status(400).json({ error: 'Valores inválidos.' });
    }
    try {
        await pool.query("UPDATE Configuracoes SET valor = $1 WHERE chave = 'DiasEmprestimo'", [String(diasEmprestimo)]);
        await pool.query("UPDATE Configuracoes SET valor = $1 WHERE chave = 'ValorMultaDia'", [String(valorMultaDia)]);
        res.json({ message: 'Configurações atualizadas com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PERFIL ============
app.get('/api/perfil', verificarToken, async (req, res) => {
    const userId = (req as any).user.id;
    try {
        const result = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", role as "Role", permissoes as "Permissoes" FROM Usuarios WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }
        const u = result.rows[0];
        res.json({
            Id: u.Id,
            Nome: u.Nome,
            Email: u.Email,
            Role: u.Role,
            permissoes: parsePermissoes(u.Permissoes),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/perfil/password', verificarToken, async (req, res) => {
    const userId = (req as any).user.id;
    const { PasswordAtual, PasswordNova } = req.body;
    if (!PasswordAtual || !PasswordNova) {
        return res.status(400).json({ error: 'Preenche todos os campos.' });
    }
    if (PasswordNova.length < 6) {
        return res.status(400).json({ error: 'A nova password deve ter pelo menos 6 caracteres.' });
    }
    try {
        const userResult = await pool.query('SELECT passwordhash FROM Usuarios WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }
        const passwordOk = await bcrypt.compare(PasswordAtual, userResult.rows[0].passwordhash);
        if (!passwordOk) {
            return res.status(400).json({ error: 'A password atual está incorreta.' });
        }
        const novoHash = await bcrypt.hash(PasswordNova, 10);
        await pool.query('UPDATE Usuarios SET passwordhash = $1 WHERE id = $2', [novoHash, userId]);
        res.json({ message: 'Password alterada com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/perfil/atividade', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente",
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "Data",
                   E.status as "Status"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            INNER JOIN Clientes C ON E.clienteid = C.id
            ORDER BY E.dataemprestimo DESC
            LIMIT 5
        `);
        res.json({ emprestimosRecentes: result.rows });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ UTILIZADORES ============
app.get('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", role as "Role", permissoes as "Permissoes" FROM Usuarios ORDER BY nome'
        );
        const usuarios = result.rows.map((u: any) => ({
            Id: u.Id,
            Nome: u.Nome,
            Email: u.Email,
            Role: u.Role,
            permissoes: parsePermissoes(u.Permissoes),
        }));
        res.json(usuarios);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    const { Nome, Email, Password, Role } = req.body;
    try {
        const hash = await bcrypt.hash(Password, 10);
        await pool.query(
            'INSERT INTO Usuarios (nome, email, passwordhash, role, permissoes) VALUES ($1, $2, $3, $4, $5)',
            [Nome, Email, hash, Role || 'Bibliotecario', '{}']
        );
        await criarNotificacao(
            '👤 Novo Utilizador',
            `O utilizador ${Nome} (${Role}) foi criado no sistema.`,
            'UTILIZADOR',
            '/utilizadores'
        );
        res.status(201).json({ message: 'Utilizador criado com sucesso!' });
    } catch (error: any) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            return res.status(400).json({ error: 'Este email já está registado.' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/usuarios/:id/permissoes', verificarToken, apenasAdmin, async (req, res) => {
    const id = req.params.id;
    const { permissoes } = req.body;
    if (!permissoes || typeof permissoes !== 'object') {
        return res.status(400).json({ error: 'Permissões inválidas.' });
    }
    try {
        await pool.query('UPDATE Usuarios SET permissoes = $1 WHERE id = $2', [JSON.stringify(permissoes), id]);
        res.json({ message: 'Permissões atualizadas com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/usuarios/:id/password', verificarToken, apenasAdmin, async (req, res) => {
    const id = req.params.id;
    const { NovaPassword } = req.body;
    if (!NovaPassword || NovaPassword.length < 6) {
        return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres.' });
    }
    try {
        const hash = await bcrypt.hash(NovaPassword, 10);
        await pool.query('UPDATE Usuarios SET passwordhash = $1 WHERE id = $2', [hash, id]);
        res.json({ message: 'Password redefinida com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/usuarios/:id', verificarToken, apenasAdmin, async (req, res) => {
    const id = req.params.id;
    const currentUser = (req as any).user;
    if (Number(id) === currentUser.id) {
        return res.status(400).json({ error: 'Não podes apagar a tua própria conta.' });
    }
    try {
        await pool.query('DELETE FROM Usuarios WHERE id = $1', [id]);
        res.json({ message: 'Utilizador removido.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBRAS ============
app.get('/api/obras', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT O.id as "Id", O.titulo as "Titulo", A.nome as "Autor", E.nome as "Editora",
                   O.ano as "Ano", O.status as "Status"
            FROM Obras O
            LEFT JOIN Autores A ON O.autorid = A.id
            LEFT JOIN Editoras E ON O.editoraid = E.id
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/obras/disponiveis', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT O.id as "Id", O.titulo as "Titulo", A.nome as "Autor"
            FROM Obras O
            LEFT JOIN Autores A ON O.autorid = A.id
            WHERE O.status = 'DISPONIVEL'
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/obras/:id/reservas', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY R.datareserva ASC) as "Posicao",
                R.id as "Id", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone",
                TO_CHAR(R.datareserva, 'DD/MM/YYYY') as "DataReserva"
            FROM Reservas R
            INNER JOIN Clientes C ON R.clienteid = C.id
            WHERE R.obraid = $1 AND R.status = 'PENDENTE'
            ORDER BY R.datareserva ASC
        `, [id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/obras/:id/historico', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(`
            SELECT E.id as "Id", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone",
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                   TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao",
                   E.status as "Status"
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.clienteid = C.id
            WHERE E.obraid = $1
            ORDER BY E.dataemprestimo DESC
        `, [id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/obras/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(`
            SELECT O.id as "Id", O.titulo as "Titulo", O.ano as "Ano", O.status as "Status",
                   A.nome as "Autor", A.nacionalidade as "Nacionalidade",
                   E.nome as "Editora", E.telefone as "EditoraContacto"
            FROM Obras O
            LEFT JOIN Autores A ON O.autorid = A.id
            LEFT JOIN Editoras E ON O.editoraid = E.id
            WHERE O.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Obra não encontrada.' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/obras', verificarToken, verificarPermissao('obras'), async (req, res) => {
    const { Titulo, Ano, AutorId, EditoraId } = req.body;
    try {
        await pool.query(
            "INSERT INTO Obras (titulo, ano, autorid, editoraid, status) VALUES ($1, $2, $3, $4, 'DISPONIVEL')",
            [Titulo, Ano, AutorId, EditoraId]
        );
        await criarNotificacao(
            '📚 Nova Obra',
            `A obra "${Titulo}" foi adicionada ao acervo.`,
            'OBRA',
            '/acervo'
        );
        res.status(201).json({ message: 'Obra cadastrada!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/obras/:id', verificarToken, verificarPermissao('obras'), async (req, res) => {
    try {
        await pool.query('DELETE FROM Obras WHERE id = $1', [req.params.id]);
        res.json({ message: 'Obra removida.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ AUTORES ============
app.get('/api/autores', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                A.id as "Id", A.nome as "Nome", A.sobrenome as "Sobrenome", A.nacionalidade as "Nacionalidade",
                TO_CHAR(A.datanascimento, 'DD/MM/YYYY') as "DataNascimento",
                A.biografia as "Biografia",
                (SELECT COUNT(*) FROM Obras WHERE autorid = A.id) as "TotalObras"
            FROM Autores A
            ORDER BY A.nome
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/autores', verificarToken, verificarPermissao('autores'), async (req, res) => {
    const { Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia } = req.body;
    try {
        await pool.query(
            'INSERT INTO Autores (nome, sobrenome, nacionalidade, datanascimento, biografia) VALUES ($1, $2, $3, $4, $5)',
            [Nome, Sobrenome || null, Nacionalidade || null, DataNascimento || null, Biografia || null]
        );
        res.status(201).json({ message: 'Autor cadastrado!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/autores/:id', verificarToken, verificarPermissao('autores'), async (req, res) => {
    const id = req.params.id;
    const { Nome, Sobrenome, Nacionalidade, DataNascimento, Biografia } = req.body;
    try {
        await pool.query(
            'UPDATE Autores SET nome = $1, sobrenome = $2, nacionalidade = $3, datanascimento = $4, biografia = $5 WHERE id = $6',
            [Nome, Sobrenome || null, Nacionalidade || null, DataNascimento || null, Biografia || null, id]
        );
        res.json({ message: 'Autor atualizado com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/autores/:id', verificarToken, verificarPermissao('autores'), async (req, res) => {
    const id = req.params.id;
    try {
        const check = await pool.query('SELECT COUNT(*) as total FROM Obras WHERE autorid = $1', [id]);
        if (Number(check.rows[0].total) > 0) {
            return res.status(400).json({
                error: `Este autor tem ${check.rows[0].total} obra(s) associada(s) e não pode ser eliminado.`,
            });
        }
        await pool.query('DELETE FROM Autores WHERE id = $1', [id]);
        res.json({ message: 'Autor removido com sucesso.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ CLIENTES ============
app.get('/api/clientes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                C.id as "Id", C.nome as "Nome", C.email as "Email", C.telefone as "Telefone",
                (SELECT COUNT(*) FROM Emprestimos WHERE clienteid = C.id) as "TotalEmprestimos",
                (SELECT COUNT(*) FROM Emprestimos WHERE clienteid = C.id AND status = 'ATIVO') as "EmprestimosAtivos"
            FROM Clientes C
            ORDER BY C.nome
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/clientes', verificarToken, verificarPermissao('clientes'), async (req, res) => {
    const { Nome, Email, Telefone } = req.body;
    try {
        await pool.query(
            'INSERT INTO Clientes (nome, email, telefone) VALUES ($1, $2, $3)',
            [Nome, Email || null, Telefone || null]
        );
        res.status(201).json({ message: 'Cliente cadastrado!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clientes/:id', verificarToken, verificarPermissao('clientes'), async (req, res) => {
    const id = req.params.id;
    const { Nome, Email, Telefone } = req.body;
    try {
        await pool.query(
            'UPDATE Clientes SET nome = $1, email = $2, telefone = $3 WHERE id = $4',
            [Nome, Email || null, Telefone || null, id]
        );
        res.json({ message: 'Cliente atualizado com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/clientes/:id', verificarToken, verificarPermissao('clientes'), async (req, res) => {
    const id = req.params.id;
    try {
        const checkAtivos = await pool.query(
            "SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1 AND status = 'ATIVO'",
            [id]
        );
        if (Number(checkAtivos.rows[0].total) > 0) {
            return res.status(400).json({
                error: `Este cliente tem ${checkAtivos.rows[0].total} empréstimo(s) ativo(s) e não pode ser eliminado.`,
            });
        }
        const checkHistorico = await pool.query('SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1', [id]);
        if (Number(checkHistorico.rows[0].total) > 0) {
            return res.status(400).json({
                error: `Este cliente tem ${checkHistorico.rows[0].total} empréstimo(s) no histórico e não pode ser eliminado.`,
            });
        }
        await pool.query('DELETE FROM Clientes WHERE id = $1', [id]);
        res.json({ message: 'Cliente removido com sucesso.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes/:id/historico', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", A.nome as "Autor",
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                   TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao",
                   CASE 
                       WHEN E.status = 'ATIVO' AND E.dataprevistadevolucao < CURRENT_DATE
                       THEN (CURRENT_DATE - E.dataprevistadevolucao::date)
                       ELSE 0 
                   END as "DiasAtraso",
                   E.status as "Status"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            LEFT JOIN Autores A ON O.autorid = A.id
            WHERE E.clienteid = $1
            ORDER BY E.dataemprestimo DESC
        `, [id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes/:id/reservas', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(`
            SELECT R.id as "Id", O.id as "ObraId", O.titulo as "Obra", O.status as "ObraStatus",
                   TO_CHAR(R.datareserva, 'DD/MM/YYYY') as "DataReserva"
            FROM Reservas R
            INNER JOIN Obras O ON R.obraid = O.id
            WHERE R.clienteid = $1 AND R.status = 'PENDENTE'
            ORDER BY R.datareserva DESC
        `, [id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const cliente = await pool.query(
            'SELECT id as "Id", nome as "Nome", email as "Email", telefone as "Telefone" FROM Clientes WHERE id = $1',
            [id]
        );
        if (cliente.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        const totalEmprestimos = await pool.query('SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1', [id]);
        const emprestimosAtivos = await pool.query(
            "SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1 AND status = 'ATIVO'",
            [id]
        );
        const emprestimosAtrasados = await pool.query(
            "SELECT COUNT(*) as total FROM Emprestimos WHERE clienteid = $1 AND status = 'ATIVO' AND dataprevistadevolucao < CURRENT_DATE",
            [id]
        );
        const totalReservas = await pool.query(
            "SELECT COUNT(*) as total FROM Reservas WHERE clienteid = $1 AND status = 'PENDENTE'",
            [id]
        );

        res.json({
            cliente: cliente.rows[0],
            estatisticas: {
                totalEmprestimos: Number(totalEmprestimos.rows[0].total),
                emprestimosAtivos: Number(emprestimosAtivos.rows[0].total),
                emprestimosAtrasados: Number(emprestimosAtrasados.rows[0].total),
                totalReservas: Number(totalReservas.rows[0].total),
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ EDITORAS ============
app.get('/api/editoras', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                E.id as "Id", E.nome as "Nome", E.endereco as "Endereco", 
                E.telefone as "Telefone", E.email as "Email", E.website as "Website",
                (SELECT COUNT(*) FROM Obras WHERE editoraid = E.id) as "TotalObras"
            FROM Editoras E
            ORDER BY E.nome
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/editoras', verificarToken, verificarPermissao('editoras'), async (req, res) => {
    const { Nome, Endereco, Telefone, Email, Website } = req.body;
    try {
        await pool.query(
            'INSERT INTO Editoras (nome, endereco, telefone, email, website) VALUES ($1, $2, $3, $4, $5)',
            [Nome, Endereco || null, Telefone || null, Email || null, Website || null]
        );
        res.status(201).json({ message: 'Editora cadastrada!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/editoras/:id', verificarToken, verificarPermissao('editoras'), async (req, res) => {
    const id = req.params.id;
    const { Nome, Endereco, Telefone, Email, Website } = req.body;
    try {
        await pool.query(
            'UPDATE Editoras SET nome = $1, endereco = $2, telefone = $3, email = $4, website = $5 WHERE id = $6',
            [Nome, Endereco || null, Telefone || null, Email || null, Website || null, id]
        );
        res.json({ message: 'Editora atualizada com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/editoras/:id', verificarToken, verificarPermissao('editoras'), async (req, res) => {
    const id = req.params.id;
    try {
        const check = await pool.query('SELECT COUNT(*) as total FROM Obras WHERE editoraid = $1', [id]);
        if (Number(check.rows[0].total) > 0) {
            return res.status(400).json({
                error: `Esta editora tem ${check.rows[0].total} obra(s) associada(s) e não pode ser eliminada.`,
            });
        }
        await pool.query('DELETE FROM Editoras WHERE id = $1', [id]);
        res.json({ message: 'Editora removida com sucesso.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ RESERVAS ============
app.get('/api/reservas', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT R.id as "Id", 
                   O.id as "ObraId", O.titulo as "Obra", O.status as "ObraStatus",
                   C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone",
                   TO_CHAR(R.datareserva, 'DD/MM/YYYY') as "DataReserva",
                   R.status as "Status"
            FROM Reservas R
            INNER JOIN Obras O ON R.obraid = O.id
            INNER JOIN Clientes C ON R.clienteid = C.id
            WHERE R.status = 'PENDENTE'
            ORDER BY R.datareserva ASC
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reservas', verificarToken, verificarPermissao('reservas'), async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    try {
        const check = await pool.query(
            "SELECT COUNT(*) as total FROM Reservas WHERE obraid = $1 AND clienteid = $2 AND status = 'PENDENTE'",
            [ObraId, ClienteId]
        );
        if (Number(check.rows[0].total) > 0) {
            return res.status(400).json({ error: 'Já tens uma reserva pendente para esta obra.' });
        }

        await pool.query(
            "INSERT INTO Reservas (obraid, clienteid, datareserva, status) VALUES ($1, $2, NOW(), 'PENDENTE')",
            [ObraId, ClienteId]
        );

        const info = await pool.query(
            'SELECT O.titulo as obra, C.nome as cliente FROM Obras O, Clientes C WHERE O.id = $1 AND C.id = $2',
            [ObraId, ClienteId]
        );
        if (info.rows.length > 0) {
            await criarNotificacao(
                '📌 Nova Reserva',
                `${info.rows[0].cliente} reservou "${info.rows[0].obra}".`,
                'RESERVA',
                '/reservas'
            );
        }

        res.status(201).json({ message: 'Reserva criada com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/reservas/:id', verificarToken, verificarPermissao('reservas'), async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query("UPDATE Reservas SET status = 'CANCELADA' WHERE id = $1", [id]);
        res.json({ message: 'Reserva cancelada.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ EMPRÉSTIMOS ============
app.get('/api/emprestimos', verificarToken, async (req, res) => {
    try {
        const valorMulta = await obterConfig('ValorMultaDia', 40);
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente",
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                   CASE 
                       WHEN E.dataprevistadevolucao < CURRENT_DATE
                       THEN (CURRENT_DATE - E.dataprevistadevolucao::date)
                       ELSE 0 
                   END as "DiasAtraso",
                   E.status as "Status"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            INNER JOIN Clientes C ON E.clienteid = C.id
            WHERE E.status = 'ATIVO'
            ORDER BY "DiasAtraso" DESC, E.dataemprestimo DESC
        `);

        const dados = result.rows.map((e: any) => ({
            ...e,
            ValorMulta: Number(e.DiasAtraso) > 0 ? Number(e.DiasAtraso) * valorMulta : 0,
        }));
        res.json(dados);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/emprestimos/atrasados', verificarToken, async (req, res) => {
    try {
        const valorMulta = await obterConfig('ValorMultaDia', 40);
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente",
                   C.email as "ClienteEmail", C.telefone as "ClienteTelefone",
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                   (CURRENT_DATE - E.dataprevistadevolucao::date) as "DiasAtraso"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            INNER JOIN Clientes C ON E.clienteid = C.id
            WHERE E.status = 'ATIVO' AND E.dataprevistadevolucao < CURRENT_DATE
            ORDER BY "DiasAtraso" DESC
        `);

        const dados = result.rows.map((e: any) => ({
            ...e,
            ValorMulta: Number(e.DiasAtraso) * valorMulta,
        }));
        res.json(dados);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/emprestimos/historico', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT E.id as "Id", O.titulo as "Obra", C.nome as "Cliente",
                   TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                   TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                   TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao",
                   E.status as "Status"
            FROM Emprestimos E
            INNER JOIN Obras O ON E.obraid = O.id
            INNER JOIN Clientes C ON E.clienteid = C.id
            ORDER BY E.dataemprestimo DESC
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/emprestimos/:id/comprovativo', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(`
            SELECT 
                E.id as "Id",
                TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao",
                TO_CHAR(E.datadevolucao, 'DD/MM/YYYY') as "DataDevolucao",
                E.status as "Status",
                C.id as "ClienteId", C.nome as "Cliente", C.email as "ClienteEmail", C.telefone as "ClienteTelefone",
                O.id as "ObraId", O.titulo as "Obra", O.ano as "ObraAno",
                A.nome as "Autor",
                Ed.nome as "Editora"
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.clienteid = C.id
            INNER JOIN Obras O ON E.obraid = O.id
            LEFT JOIN Autores A ON O.autorid = A.id
            LEFT JOIN Editoras Ed ON O.editoraid = Ed.id
            WHERE E.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/emprestimos', verificarToken, verificarPermissao('emprestimos'), async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    const valorMultaDia = await obterConfig('ValorMultaDia', 40);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const insertResult = await client.query(
            `INSERT INTO Emprestimos (obraid, clienteid, dataemprestimo, dataprevistadevolucao, status) 
             VALUES ($1, $2, NOW(), NOW() + INTERVAL '${diasEmprestimo} days', 'ATIVO') 
             RETURNING id`,
            [ObraId, ClienteId]
        );
        const novoEmprestimoId = insertResult.rows[0].id;

        await client.query("UPDATE Obras SET status = 'EMPRESTADO' WHERE id = $1", [ObraId]);
        await client.query(
            "UPDATE Reservas SET status = 'ATENDIDA' WHERE obraid = $1 AND clienteid = $2 AND status = 'PENDENTE'",
            [ObraId, ClienteId]
        );

        await client.query('COMMIT');

        const detalhes = await pool.query(`
            SELECT 
                C.nome as "ClienteNome", C.email as "ClienteEmail",
                O.titulo as "ObraTitulo",
                A.nome as "ObraAutor",
                Ed.nome as "ObraEditora",
                TO_CHAR(E.dataemprestimo, 'DD/MM/YYYY') as "DataEmprestimo",
                TO_CHAR(E.dataprevistadevolucao, 'DD/MM/YYYY') as "DataPrevistaDevolucao"
            FROM Emprestimos E
            INNER JOIN Clientes C ON E.clienteid = C.id
            INNER JOIN Obras O ON E.obraid = O.id
            LEFT JOIN Autores A ON O.autorid = A.id
            LEFT JOIN Editoras Ed ON O.editoraid = Ed.id
            WHERE E.id = $1
        `, [novoEmprestimoId]);

        if (detalhes.rows.length > 0) {
            const d = detalhes.rows[0];
            await criarNotificacao(
                '📤 Novo Empréstimo',
                `${d.ClienteNome} requisitou "${d.ObraTitulo}". Devolução: ${d.DataPrevistaDevolucao}.`,
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
                valorMultaDia,
            }).catch((err) => console.error('Erro ao enviar email:', err));
        }

        res.status(201).json({ message: 'Empréstimo realizado!', emprestimoId: novoEmprestimoId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Erro ao realizar empréstimo:', error);
        res.status(500).json({ error: 'Erro ao realizar empréstimo.' });
    } finally {
        client.release();
    }
});

app.put('/api/emprestimos/:id/devolver', verificarToken, verificarPermissao('emprestimos'), async (req, res) => {
    const emprestimoId = req.params.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `SELECT E.obraid, O.titulo as "Obra", C.nome as "Cliente"
             FROM Emprestimos E
             INNER JOIN Obras O ON E.obraid = O.id
             INNER JOIN Clientes C ON E.clienteid = C.id
             WHERE E.id = $1`,
            [emprestimoId]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        const obraId = result.rows[0].obraid;
        const obraTitulo = result.rows[0].Obra;
        const clienteNome = result.rows[0].Cliente;

        await client.query(
            "UPDATE Emprestimos SET status = 'DEVOLVIDO', datadevolucao = NOW() WHERE id = $1",
            [emprestimoId]
        );
        await client.query("UPDATE Obras SET status = 'DISPONIVEL' WHERE id = $1", [obraId]);

        await client.query('COMMIT');

        await criarNotificacao(
            '✅ Devolução',
            `${clienteNome} devolveu "${obraTitulo}".`,
            'DEVOLUCAO',
            '/historico'
        );

        res.json({ message: 'Devolução realizada!' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erro ao realizar devolução.' });
    } finally {
        client.release();
    }
});

app.put('/api/emprestimos/:id/renovar', verificarToken, verificarPermissao('emprestimos'), async (req, res) => {
    const emprestimoId = req.params.id;
    const diasEmprestimo = await obterConfig('DiasEmprestimo', 15);
    try {
        await pool.query(
            `UPDATE Emprestimos 
             SET dataprevistadevolucao = dataprevistadevolucao + INTERVAL '${diasEmprestimo} days' 
             WHERE id = $1 AND status = 'ATIVO'`,
            [emprestimoId]
        );
        res.json({ message: `Empréstimo renovado por mais ${diasEmprestimo} dias!` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ NOTIFICAÇÕES ============
app.get('/api/notificacoes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id as "Id", titulo as "Titulo", mensagem as "Mensagem", 
                   tipo as "Tipo", lida as "Lida", link as "Link",
                   TO_CHAR(datacriacao, 'DD/MM/YYYY') as "Data",
                   TO_CHAR(datacriacao, 'HH24:MI') as "Hora"
            FROM Notificacoes 
            ORDER BY datacriacao DESC
            LIMIT 30
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/notificacoes/contagem', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM Notificacoes WHERE lida = FALSE');
        res.json({ naoLidas: Number(result.rows[0].total) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notificacoes/:id/ler', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('UPDATE Notificacoes SET lida = TRUE WHERE id = $1', [id]);
        res.json({ message: 'Notificação marcada como lida.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notificacoes/ler-todas', verificarToken, async (req, res) => {
    try {
        await pool.query('UPDATE Notificacoes SET lida = TRUE WHERE lida = FALSE');
        res.json({ message: 'Todas as notificações marcadas como lidas.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notificacoes/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM Notificacoes WHERE id = $1', [id]);
        res.json({ message: 'Notificação removida.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notificacoes', verificarToken, apenasAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM Notificacoes WHERE lida = TRUE');
        res.json({ message: 'Notificações lidas removidas.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ESTATÍSTICAS ============
app.get('/api/estatisticas', verificarToken, async (req, res) => {
    try {
        const totalObras = await pool.query('SELECT COUNT(*) as total FROM Obras');
        const disponiveis = await pool.query("SELECT COUNT(*) as total FROM Obras WHERE status = 'DISPONIVEL'");
        const emprestimosAtivos = await pool.query("SELECT COUNT(*) as total FROM Emprestimos WHERE status = 'ATIVO'");
        const reservasPendentes = await pool.query("SELECT COUNT(*) as total FROM Reservas WHERE status = 'PENDENTE'");
        const emprestimosAtrasados = await pool.query(
            "SELECT COUNT(*) as total FROM Emprestimos WHERE status = 'ATIVO' AND dataprevistadevolucao < CURRENT_DATE"
        );
        res.json({
            totalObras: Number(totalObras.rows[0].total),
            disponiveis: Number(disponiveis.rows[0].total),
            emprestimosAtivos: Number(emprestimosAtivos.rows[0].total),
            reservasPendentes: Number(reservasPendentes.rows[0].total),
            emprestimosAtrasados: Number(emprestimosAtrasados.rows[0].total),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/estatisticas/hoje', verificarToken, async (req, res) => {
    try {
        const emprestimosHoje = await pool.query(
            'SELECT COUNT(*) as total FROM Emprestimos WHERE dataemprestimo::date = CURRENT_DATE'
        );
        const devolucoesHoje = await pool.query(
            'SELECT COUNT(*) as total FROM Emprestimos WHERE datadevolucao::date = CURRENT_DATE'
        );
        const clientesHoje = await pool.query('SELECT COUNT(*) as total FROM Clientes');
        res.json({
            emprestimosHoje: Number(emprestimosHoje.rows[0].total),
            devolucoesHoje: Number(devolucoesHoje.rows[0].total),
            clientesTotal: Number(clientesHoje.rows[0].total),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/estatisticas/graficos', verificarToken, async (req, res) => {
    try {
        const emprestimosPorMes = await pool.query(`
            SELECT TO_CHAR(dataemprestimo, 'YYYY-MM') as "Mes", COUNT(*) as "Total"
            FROM Emprestimos
            WHERE dataemprestimo >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(dataemprestimo, 'YYYY-MM')
            ORDER BY "Mes"
        `);

        const obrasPorStatus = await pool.query(`
            SELECT status as name, COUNT(*) as value 
            FROM Obras 
            GROUP BY status
        `);

        res.json({
            emprestimosPorMes: emprestimosPorMes.rows,
            obrasPorStatus: obrasPorStatus.rows,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/top-obras', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT O.id as "Id", O.titulo as "Titulo", A.nome as "Autor",
                   COUNT(E.id) as "TotalEmprestimos"
            FROM Obras O
            LEFT JOIN Emprestimos E ON E.obraid = O.id
            LEFT JOIN Autores A ON O.autorid = A.id
            GROUP BY O.id, O.titulo, A.nome
            ORDER BY COUNT(E.id) DESC, O.titulo ASC
            LIMIT 5
        `);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ARRANQUE ============
const PORT = Number(process.env.PORT) || 3006;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend PostgreSQL a correr na porta ${PORT}`);
});