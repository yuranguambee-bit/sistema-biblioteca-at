export interface Obra {
  Id: number;
  Titulo: string;
  Autor: string;
  Editora: string | null;
  Ano: number;
  Status: 'DISPONIVEL' | 'EMPRESTADO';
}