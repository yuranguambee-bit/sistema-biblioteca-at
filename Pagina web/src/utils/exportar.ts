// Função para exportar uma lista de objetos para CSV (abre no Excel)
export function exportarParaCSV(dados: any[], colunas: { chave: string; titulo: string }[], nomeFicheiro: string) {
  if (dados.length === 0) {
    alert('Não há dados para exportar.');
    return;
  }

  // Cabeçalho
  const cabecalho = colunas.map((c) => c.titulo).join(';');

  // Linhas
  const linhas = dados.map((item) =>
    colunas
      .map((col) => {
        let valor = item[col.chave];
        if (valor === null || valor === undefined) valor = '';
        // Escapar aspas e envolver em aspas duplas se tiver ponto e vírgula ou quebra de linha
        valor = String(valor).replace(/"/g, '""');
        if (valor.includes(';') || valor.includes('\n') || valor.includes('"')) {
          valor = `"${valor}"`;
        }
        return valor;
      })
      .join(';')
  );

  // Juntar tudo com quebra de linha + BOM UTF-8 (para o Excel ler acentos corretamente)
  const conteudo = '\uFEFF' + [cabecalho, ...linhas].join('\n');

  // Criar o ficheiro e forçar o download
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${nomeFicheiro}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}