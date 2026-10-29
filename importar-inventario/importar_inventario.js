require('dotenv').config();
const fs = require('fs');
const { createReadStream } = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');

const CSV_PATH = process.argv[2];
const COMMIT = process.argv.includes('--commit');
const LIMPAR = process.argv.includes('--limpar');

const DEFAULT_EDITORA = 'Editora Desconhecida';
const STATUS_PADRAO = 'Disponivel';

function extrairAno(dataStr) {
  if (!dataStr) return null;
  const s = String(dataStr).trim();
  if (!s) return null;
  const m4 = s.match(/\b(19|20)\d{2}\b/);
  if (m4) return parseInt(m4[0], 10);
  const partes = s.split(/[\/\-\s]+/).filter(Boolean);
  const ultimo = partes[partes.length - 1];
  if (ultimo && /^\d{2}$/.test(ultimo)) {
    const y = parseInt(ultimo, 10);
    return y < 50 ? 2000 + y : 1900 + y;
  }
  return null;
}

function extrairAutores(autoresStr) {
  if (!autoresStr) return [];
  return autoresStr.split('/').map(s => s.trim()).filter(Boolean);
}

function dividirNome(fullName) {
  const partes = fullName.trim().split(/\s+/);
  if (partes.length === 1) return { nome: partes[0], sobrenome: '' };
  const sobrenome = partes.pop();
  const nome = partes.join(' ');
  return { nome, sobrenome };
}

function normalizar(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  if (!CSV_PATH) {
    console.error('Uso: node importar_inventario.js <inventario.csv> [--commit] [--limpar]');
    process.exit(1);
  }

  const rows = [];
  await new Promise((resolve, reject) => {
    createReadStream(CSV_PATH)
      .pipe(csv({ 
        separator: ';', 
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim() 
      }))
      .on('data', row => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  const registos = rows.filter(r => (r.TITULO || r['TÍTULO'] || '').trim() !== '');
  console.log(`Linhas lidas: ${registos.length}`);

  const grupos = new Map();

  for (const r of registos) {
    const titulo = (r.TITULO || r['TÍTULO'] || '').trim();
    const autoresRaw = (r.AUTORES || '').trim();
    const ano = extrairAno(r.DATA);
    const local = (r['LOCALIZAÇÃO'] || r.LOCALIZACAO || '').trim();
    const codigo = (r['CÓDIGO'] || r.CODIGO || '').trim();
    const area = (r['ÁREA DE CONHECIMENTO'] || r['AREA DE CONHECIMENTO'] || '').trim();
    const ordem = parseInt(r.ORDEM || r.Ordem || '0', 10) || null;

    const chave = `${normalizar(titulo)}|${normalizar(autoresRaw)}|${ano}|${normalizar(local)}`;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        titulo, autoresRaw, ano, local, area, ordem,
        codigos: []
      });
    }
    if (codigo) grupos.get(chave).codigos.push(codigo);
  }

  console.log(`Agrupamento concluído: ${grupos.size} livros únicos (de ${registos.length} linhas).\n`);

  if (!COMMIT) {
    console.log('Pré-visualização do agrupamento (primeiros 3):');
    let i = 0;
    for (const [chave, g] of grupos) {
      if (i++ >= 3) break;
      console.log(`- ${g.titulo} (${g.autoresRaw}) -> ${g.codigos.length} cópias. Códigos: ${g.codigos.join(', ')}`);
    }
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  
  await client.connect();
  await client.query('BEGIN');

  try {
    if (LIMPAR) {
      console.log('A limpar dados antigos...');
      // MUDANÇA AQUI: nomes em minúsculo e sem aspas
      await client.query('TRUNCATE TABLE obras RESTART IDENTITY CASCADE');
      await client.query('TRUNCATE TABLE autores RESTART IDENTITY CASCADE');
    }

    let editoraId;
    const edSel = await client.query('SELECT id FROM editoras WHERE LOWER(nome) = LOWER($1) LIMIT 1', [DEFAULT_EDITORA]);
    if (edSel.rows.length > 0) {
      editoraId = edSel.rows[0].id;
    } else {
      const edIns = await client.query('INSERT INTO editoras (nome) VALUES ($1) RETURNING id', [DEFAULT_EDITORA]);
      editoraId = edIns.rows[0].id;
    }
    console.log(`Editora Padrão ID: ${editoraId}`);

    const autorCache = new Map();
    const autExistentes = await client.query('SELECT id, nome, sobrenome FROM autores');
    for (const a of autExistentes.rows) {
      autorCache.set(normalizar(`${a.nome} ${a.sobrenome || ''}`), a.id);
    }

    let inseridos = 0;

    for (const [chave, g] of grupos) {
      const nomes = extrairAutores(g.autoresRaw);
      let autorPrincipalId = null;

      for (const nomeCompleto of nomes) {
        if (/^\d+$/.test(nomeCompleto)) continue;
        const key = normalizar(nomeCompleto);
        if (autorCache.has(key)) {
          if (!autorPrincipalId) autorPrincipalId = autorCache.get(key);
        } else {
          const { nome, sobrenome } = dividirNome(nomeCompleto);
          const ins = await client.query('INSERT INTO autores (nome, sobrenome) VALUES ($1, $2) RETURNING id', [nome, sobrenome]);
          autorCache.set(key, ins.rows[0].id);
          if (!autorPrincipalId) autorPrincipalId = ins.rows[0].id;
        }
      }

      const codigosJuntos = g.codigos.join(', ');
      const quantidade = g.codigos.length;

      // MUDANÇA AQUI: INSERT INTO obras (tudo minúsculo)
      await client.query(
        `INSERT INTO obras 
          (titulo, ano, autorid, editoraid, numeroedicao, nacionalidadelivro, isbn, status, codigo, area_conhecimento, localizacao, ordem_excel, quantidade) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          g.titulo, g.ano, autorPrincipalId, editoraId, 
          null, null, null, STATUS_PADRAO, 
          codigosJuntos || null, g.area || null, g.local || null, g.ordem, quantidade
        ]
      );

      inseridos++;
      if (inseridos % 100 === 0) {
        console.log(`... ${inseridos} livros únicos inseridos.`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ SUCESSO! ${inseridos} livros agrupados foram importados.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERRO! Nada foi gravado.', err);
  } finally {
    await client.end();
  }
}

main();