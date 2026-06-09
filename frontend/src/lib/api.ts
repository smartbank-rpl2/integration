import { useAuthStore } from '@/store/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

type ApiErrorPayload = {
  error?: string | { message?: string };
  message?: string;
};

function getHttpErrorMessage(status: number, serverMsg?: string): string {
  if (serverMsg && serverMsg.length > 0 && serverMsg !== 'Internal server error') {
    return serverMsg;
  }
  switch (status) {
    case 400: return 'Permintaan tidak valid. Periksa kembali data yang Anda masukkan.';
    case 401: return 'Sesi Anda telah berakhir atau kredensial tidak valid. Silakan login kembali.';
    case 403: return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
    case 404: return 'Data yang diminta tidak ditemukan.';
    case 409: return 'Data sudah ada atau terjadi konflik. Silakan coba lagi dengan data berbeda.';
    case 422: return 'Format data tidak sesuai. Periksa kembali isian Anda.';
    case 429: return 'Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.';
    case 500: return 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
    case 502: return 'Server tidak dapat dijangkau saat ini. Pastikan semua layanan berjalan.';
    case 503: return 'Layanan sedang tidak tersedia. Silakan coba lagi dalam beberapa menit.';
    case 504: return 'Server membutuhkan waktu terlalu lama untuk merespons (Gateway Timeout). Pastikan semua server backend sudah berjalan, lalu coba lagi.';
    default: return `Terjadi kesalahan (${status}). Silakan coba lagi.`;
  }
}

function readServerMessage(data: ApiErrorPayload): string {
  if (typeof data.error === 'string') return data.error;
  return data.error?.message || data.message || '';
}

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan semua layanan backend sudah berjalan dan coba lagi.');
  }

  let data: ApiErrorPayload | Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    // Body may be empty, especially on gateway timeout responses.
  }

  if (response.status === 401) {
    logout();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.href = '/login';
    }
    throw new Error(readServerMessage(data as ApiErrorPayload) || 'Email atau password yang Anda masukkan salah.');
  }

  if (!response.ok) {
    throw new Error(getHttpErrorMessage(response.status, readServerMessage(data as ApiErrorPayload)));
  }

  return data as T;
}
