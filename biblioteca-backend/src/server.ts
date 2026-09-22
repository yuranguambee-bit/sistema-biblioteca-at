import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'AT_Mocambique_Biblioteca_2024_ChaveSecreta';

const dbConfig: sql.config = {
    user: 'biblioteca_user',
    password: 'Biblioteca@2024',
    server: 'localhost\\SQLEXPRESS',
    database: 'BibliotecaWeb',
    options: { encrypt: false, trustServerCertificate: true }
};

sql.connect(dbConfig).then(pool => {
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
                .input('Nome', sql.NVarChar, 'Maurício Guambe')
                .input('Email', sql.NVarChar, 'admin@at.gov.mz')
                .input('PasswordHash', sql.NVarChar, hash)
                .input('Role', sql.NVarChar, 'Admin')
                .query('INSERT INTO Usuarios (Nome, Email, PasswordHash, Role) VALUES (@Nome, @Email, @PasswordHash, @Role)');
            console.log('🌱 Utilizador Admin criado: admin@at.gov.mz / admin123');
        }
    } catch (error) { console.error('Erro ao criar admin:', error); }
}

// ============ MIDDLEWARES ============
function verificarToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado. Sem token.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) { res.status(401).json({ error: 'Token inválido ou expirado.' }); }
}

function apenasAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    next();
}

// ============ AUTENTICAÇÃO ============
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { Email, Password } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT Id, Nome, Email, PasswordHash, Role FROM Usuarios WHERE Email = @Email');

        if (result.recordset.length === 0) return res.status(401).json({ error: 'Email ou password incorretos.' });

        const user = result.recordset[0];
        const passwordOk = await bcrypt.compare(Password, user.PasswordHash);
        if (!passwordOk) return res.status(401).json({ error: 'Email ou password incorretos.' });

        const token = jwt.sign(
            { id: user.Id, nome: user.Nome, email: user.Email, role: user.Role },
            JWT_SECRET, { expiresIn: '8h' }
        );

        res.json({ token, user: { id: user.Id, nome: user.Nome, email: user.Email, role: user.Role } });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ GESTÃO DE UTILIZADORES ============
app.get('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT Id, Nome, Email, Role FROM Usuarios ORDER BY Nome');
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, async (req, res) => {
    const { Nome, Email, Password, Role } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const hash = await bcrypt.hash(Password, 10);
        await pool.request()
            .input('Nome', sql.NVarChar, Nome)
            .input('Email', sql.NVarChar, Email)
            .input('PasswordHash', sql.NVarChar, hash)
            .input('Role', sql.NVarChar, Role || 'Bibliotecario')
            .query('INSERT INTO Usuarios (Nome, Email, PasswordHash, Role) VALUES (@Nome, @Email, @PasswordHash, @Role)');
        res.status(201).json({ message: 'Utilizador criado com sucesso!' });
    } catch (error: any) {
        if (error.message.includes('UNIQUE')) return res.status(400).json({ error: 'Este email já está registado.' });
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
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM Usuarios WHERE Id = @Id');
        res.json({ message: 'Utilizador removido.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ OBRAS ============
app.get('/api/obras', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT O.Id, O.Titulo, A.Nome as Autor, E.Nome as Editora, O.Ano, O.Status 
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
        const result = await pool.request().query(`
            SELECT O.Id, O.Titulo, A.Nome as Autor FROM Obras O
            LEFT JOIN Autores A ON O.AutorId = A.Id WHERE O.Status = 'DISPONIVEL'
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id/reservas', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ObraId', sql.Int, id)
            .query(`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY R.DataReserva ASC) as Posicao,
                    R.Id, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone,
                    CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva
                FROM Reservas R
                INNER JOIN Clientes C ON R.ClienteId = C.Id
                WHERE R.ObraId = @ObraId AND R.Status = 'PENDENTE'
                ORDER BY R.DataReserva ASC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id/historico', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ObraId', sql.Int, id)
            .query(`
                SELECT E.Id, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone,
                       CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo,
                       CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                       CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao,
                       E.Status
                FROM Emprestimos E
                INNER JOIN Clientes C ON E.ClienteId = C.Id
                WHERE E.ObraId = @ObraId
                ORDER BY E.DataEmprestimo DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/obras/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT O.Id, O.Titulo, O.Ano, O.Status,
                       A.Nome as Autor, A.Nacionalidade,
                       E.Nome as Editora, E.Contacto as EditoraContacto
                FROM Obras O
                LEFT JOIN Autores A ON O.AutorId = A.Id
                LEFT JOIN Editoras E ON O.EditoraId = E.Id
                WHERE O.Id = @Id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Obra não encontrada.' });
        }
        
        res.json(result.recordset[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/obras', verificarToken, async (req, res) => {
    const { Titulo, Ano, AutorId, EditoraId } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Titulo', sql.NVarChar, Titulo).input('Ano', sql.Int, Ano)
            .input('AutorId', sql.Int, AutorId).input('EditoraId', sql.Int, EditoraId)
            .query(`INSERT INTO Obras (Titulo, Ano, AutorId, EditoraId, Status) VALUES (@Titulo, @Ano, @AutorId, @EditoraId, 'DISPONIVEL')`);
        res.status(201).json({ message: 'Obra cadastrada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/obras/:id', verificarToken, apenasAdmin, async (req, res) => {
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
        const result = await pool.request().query('SELECT Id, Nome, Nacionalidade FROM Autores ORDER BY Nome');
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/autores', verificarToken, async (req, res) => {
    const { Nome, Nacionalidade } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Nome', sql.NVarChar, Nome).input('Nacionalidade', sql.NVarChar, Nacionalidade)
            .query('INSERT INTO Autores (Nome, Nacionalidade) VALUES (@Nome, @Nacionalidade)');
        res.status(201).json({ message: 'Autor cadastrado!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ CLIENTES ============
app.get('/api/clientes', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT Id, Nome, Email, Telefone FROM Clientes ORDER BY Nome');
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/clientes', verificarToken, async (req, res) => {
    const { Nome, Email, Telefone } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Nome', sql.NVarChar, Nome).input('Email', sql.NVarChar, Email).input('Telefone', sql.NVarChar, Telefone)
            .query('INSERT INTO Clientes (Nome, Email, Telefone) VALUES (@Nome, @Email, @Telefone)');
        res.status(201).json({ message: 'Cliente cadastrado!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id/historico', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ClienteId', sql.Int, id)
            .query(`
                SELECT E.Id, O.Titulo as Obra, A.Nome as Autor,
                       CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo,
                       CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                       CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao,
                       CASE 
                           WHEN E.Status = 'ATIVO' AND E.DataPrevistaDevolucao < CAST(GETDATE() AS DATE)
                           THEN DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE())
                           ELSE 0 
                       END as DiasAtraso,
                       E.Status
                FROM Emprestimos E
                INNER JOIN Obras O ON E.ObraId = O.Id
                LEFT JOIN Autores A ON O.AutorId = A.Id
                WHERE E.ClienteId = @ClienteId
                ORDER BY E.DataEmprestimo DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id/reservas', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ClienteId', sql.Int, id)
            .query(`
                SELECT R.Id, O.Id as ObraId, O.Titulo as Obra, O.Status as ObraStatus,
                       CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva
                FROM Reservas R
                INNER JOIN Obras O ON R.ObraId = O.Id
                WHERE R.ClienteId = @ClienteId AND R.Status = 'PENDENTE'
                ORDER BY R.DataReserva DESC
            `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/clientes/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        
        const cliente = await pool.request()
            .input('Id', sql.Int, id)
            .query('SELECT Id, Nome, Email, Telefone FROM Clientes WHERE Id = @Id');
        
        if (cliente.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        
        const totalEmprestimos = await pool.request()
            .input('ClienteId', sql.Int, id)
            .query('SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @ClienteId');
        
        const emprestimosAtivos = await pool.request()
            .input('ClienteId', sql.Int, id)
            .query("SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @ClienteId AND Status = 'ATIVO'");
        
        const emprestimosAtrasados = await pool.request()
            .input('ClienteId', sql.Int, id)
            .query("SELECT COUNT(*) as total FROM Emprestimos WHERE ClienteId = @ClienteId AND Status = 'ATIVO' AND DataPrevistaDevolucao < CAST(GETDATE() AS DATE)");
        
        const totalReservas = await pool.request()
            .input('ClienteId', sql.Int, id)
            .query("SELECT COUNT(*) as total FROM Reservas WHERE ClienteId = @ClienteId AND Status = 'PENDENTE'");
        
        res.json({
            cliente: cliente.recordset[0],
            estatisticas: {
                totalEmprestimos: totalEmprestimos.recordset[0].total,
                emprestimosAtivos: emprestimosAtivos.recordset[0].total,
                emprestimosAtrasados: emprestimosAtrasados.recordset[0].total,
                totalReservas: totalReservas.recordset[0].total
            }
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ EDITORAS ============
app.get('/api/editoras', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT Id, Nome, Contacto FROM Editoras ORDER BY Nome');
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/editoras', verificarToken, async (req, res) => {
    const { Nome, Contacto } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('Nome', sql.NVarChar, Nome).input('Contacto', sql.NVarChar, Contacto)
            .query('INSERT INTO Editoras (Nome, Contacto) VALUES (@Nome, @Contacto)');
        res.status(201).json({ message: 'Editora cadastrada!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ RESERVAS ============
app.get('/api/reservas', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT R.Id, 
                   O.Id as ObraId, O.Titulo as Obra, O.Status as ObraStatus,
                   C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone,
                   CONVERT(VARCHAR(10), R.DataReserva, 103) as DataReserva,
                   R.Status
            FROM Reservas R
            INNER JOIN Obras O ON R.ObraId = O.Id
            INNER JOIN Clientes C ON R.ClienteId = C.Id
            WHERE R.Status = 'PENDENTE'
            ORDER BY R.DataReserva ASC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/reservas', verificarToken, async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const check = await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .input('ClienteId', sql.Int, ClienteId)
            .query(`SELECT COUNT(*) as total FROM Reservas WHERE ObraId = @ObraId AND ClienteId = @ClienteId AND Status = 'PENDENTE'`);
        
        if (check.recordset[0].total > 0) {
            return res.status(400).json({ error: 'Já tens uma reserva pendente para esta obra.' });
        }
        
        await pool.request()
            .input('ObraId', sql.Int, ObraId)
            .input('ClienteId', sql.Int, ClienteId)
            .query(`INSERT INTO Reservas (ObraId, ClienteId, DataReserva, Status) VALUES (@ObraId, @ClienteId, GETDATE(), 'PENDENTE')`);
        
        res.status(201).json({ message: 'Reserva criada com sucesso!' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/reservas/:id', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Id', sql.Int, id)
            .query(`UPDATE Reservas SET Status = 'CANCELADA' WHERE Id = @Id`);
        res.json({ message: 'Reserva cancelada.' });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ============ EMPRÉSTIMOS ============
app.get('/api/emprestimos', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, O.Titulo as Obra, C.Nome as Cliente, 
                   CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, 
                   CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                   DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE()) as DiasAtraso,
                   E.Status
            FROM Emprestimos E
            INNER JOIN Obras O ON E.ObraId = O.Id
            INNER JOIN Clientes C ON E.ClienteId = C.Id
            WHERE E.Status = 'ATIVO'
            ORDER BY DiasAtraso DESC, E.DataEmprestimo DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/atrasados', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, O.Titulo as Obra, C.Nome as Cliente,
                   C.Email as ClienteEmail, C.Telefone as ClienteTelefone,
                   CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo,
                   CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                   DATEDIFF(DAY, E.DataPrevistaDevolucao, GETDATE()) as DiasAtraso
            FROM Emprestimos E
            INNER JOIN Obras O ON E.ObraId = O.Id
            INNER JOIN Clientes C ON E.ClienteId = C.Id
            WHERE E.Status = 'ATIVO' AND E.DataPrevistaDevolucao < CAST(GETDATE() AS DATE)
            ORDER BY DiasAtraso DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/emprestimos/historico', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT E.Id, O.Titulo as Obra, C.Nome as Cliente, 
                   CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo, 
                   CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                   CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao,
                   E.Status
            FROM Emprestimos E
            INNER JOIN Obras O ON E.ObraId = O.Id
            INNER JOIN Clientes C ON E.ClienteId = C.Id
            ORDER BY E.DataEmprestimo DESC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// COMPROVATIVO DE EMPRÉSTIMO
app.get('/api/emprestimos/:id/comprovativo', verificarToken, async (req, res) => {
    const id = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT 
                    E.Id,
                    CONVERT(VARCHAR(10), E.DataEmprestimo, 103) as DataEmprestimo,
                    CONVERT(VARCHAR(10), E.DataPrevistaDevolucao, 103) as DataPrevistaDevolucao,
                    CONVERT(VARCHAR(10), E.DataDevolucao, 103) as DataDevolucao,
                    E.Status,
                    C.Id as ClienteId, C.Nome as Cliente, C.Email as ClienteEmail, C.Telefone as ClienteTelefone,
                    O.Id as ObraId, O.Titulo as Obra, O.Ano as ObraAno,
                    A.Nome as Autor,
                    Ed.Nome as Editora
                FROM Emprestimos E
                INNER JOIN Clientes C ON E.ClienteId = C.Id
                INNER JOIN Obras O ON E.ObraId = O.Id
                LEFT JOIN Autores A ON O.AutorId = A.Id
                LEFT JOIN Editoras Ed ON O.EditoraId = Ed.Id
                WHERE E.Id = @Id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        
        res.json(result.recordset[0]);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/emprestimos', verificarToken, async (req, res) => {
    const { ObraId, ClienteId } = req.body;
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const r1 = new sql.Request(transaction);
        const insertResult = await r1.input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId)
            .query(`INSERT INTO Emprestimos (ObraId, ClienteId, DataEmprestimo, DataPrevistaDevolucao, Status) 
                    OUTPUT INSERTED.Id
                    VALUES (@ObraId, @ClienteId, GETDATE(), DATEADD(DAY, 15, GETDATE()), 'ATIVO')`);
        
        const novoEmprestimoId = insertResult.recordset[0].Id;
        
        const r2 = new sql.Request(transaction);
        await r2.input('ObraId', sql.Int, ObraId).query(`UPDATE Obras SET Status = 'EMPRESTADO' WHERE Id = @ObraId`);
        
        const r3 = new sql.Request(transaction);
        await r3.input('ObraId', sql.Int, ObraId).input('ClienteId', sql.Int, ClienteId)
            .query(`UPDATE Reservas SET Status = 'ATENDIDA' WHERE ObraId = @ObraId AND ClienteId = @ClienteId AND Status = 'PENDENTE'`);
        
        await transaction.commit();
        res.status(201).json({ message: 'Empréstimo realizado!', emprestimoId: novoEmprestimoId });
    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ error: 'Erro ao realizar empréstimo.' });
    }
});

app.put('/api/emprestimos/:id/devolver', verificarToken, async (req, res) => {
    const emprestimoId = req.params.id;
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const r1 = new sql.Request(transaction);
        const result = await r1.input('Id', sql.Int, emprestimoId).query(`SELECT ObraId FROM Emprestimos WHERE Id = @Id`);
        const obraId = result.recordset[0].ObraId;
        const r2 = new sql.Request(transaction);
        await r2.input('Id', sql.Int, emprestimoId).query(`UPDATE Emprestimos SET Status = 'DEVOLVIDO', DataDevolucao = GETDATE() WHERE Id = @Id`);
        const r3 = new sql.Request(transaction);
        await r3.input('ObraId', sql.Int, obraId).query(`UPDATE Obras SET Status = 'DISPONIVEL' WHERE Id = @ObraId`);
        await transaction.commit();
        res.json({ message: 'Devolução realizada!' });
    } catch (error: any) {
        await transaction.rollback();
        res.status(500).json({ error: 'Erro ao realizar devolução.' });
    }
});

app.put('/api/emprestimos/:id/renovar', verificarToken, async (req, res) => {
    const emprestimoId = req.params.id;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Id', sql.Int, emprestimoId)
            .query(`UPDATE Emprestimos 
                    SET DataPrevistaDevolucao = DATEADD(DAY, 15, DataPrevistaDevolucao) 
                    WHERE Id = @Id AND Status = 'ATIVO'`);
        res.json({ message: 'Empréstimo renovado por mais 15 dias!' });
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
        const emprestimosAtrasados = await pool.request().query(
            "SELECT COUNT(*) as total FROM Emprestimos WHERE Status = 'ATIVO' AND DataPrevistaDevolucao < CAST(GETDATE() AS DATE)"
        );
        res.json({
            totalObras: totalObras.recordset[0].total,
            disponiveis: disponiveis.recordset[0].total,
            emprestimosAtivos: emprestimosAtivos.recordset[0].total,
            reservasPendentes: reservasPendentes.recordset[0].total,
            emprestimosAtrasados: emprestimosAtrasados.recordset[0].total
        });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/estatisticas/graficos', verificarToken, async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const emprestimosPorMes = await pool.request().query(`
            SELECT 
                CONVERT(VARCHAR(7), DataEmprestimo, 120) as Mes,
                COUNT(*) as Total
            FROM Emprestimos
            WHERE DataEmprestimo >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY CONVERT(VARCHAR(7), DataEmprestimo, 120)
            ORDER BY Mes
        `);

        const obrasPorStatus = await pool.request().query(`
            SELECT Status as name, COUNT(*) as value 
            FROM Obras 
            GROUP BY Status
        `);

        res.json({
            emprestimosPorMes: emprestimosPorMes.recordset,
            obrasPorStatus: obrasPorStatus.recordset
        });
    } catch (error: any) { 
        res.status(500).json({ error: error.message }); 
    }
});

const PORT = 3005;
app.listen(PORT, () => { console.log(`Servidor Backend a correr na porta ${PORT}`); });