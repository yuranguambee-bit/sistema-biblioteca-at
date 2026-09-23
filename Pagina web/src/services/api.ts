// A URL da API é lida da variável de ambiente VITE_API_URL
// Em desenvolvimento: http://localhost:3005 (do ficheiro .env)
// Em produção: será o URL do backend online
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('@biblioteca:token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Se o token expirou ou é inválido, faz logout
  if (response.status === 401) {
    localStorage.removeItem('@biblioteca:token');
    localStorage.removeItem('@biblioteca:user');
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return response;
}