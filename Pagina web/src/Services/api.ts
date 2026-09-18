const API_URL = 'http://localhost:3005';

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