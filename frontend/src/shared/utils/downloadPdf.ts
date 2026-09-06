import { api } from '../lib/axios';

/**
 * Downloads a PDF file reliably:
 * 1. Attempts an Axios binary blob request (attaches auth tokens & respects baseURL).
 * 2. Creates a blob URL and initiates browser download.
 * 3. Falls back to opening direct backend URL if needed.
 */
export const downloadPdfFile = async (url: string, defaultFilename: string) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 200);
  } catch (error) {
    console.warn('Direct blob PDF download failed, trying new window fallback:', error);
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const targetUrl = cleanPath.startsWith('/api/') ? `${backendBase}${cleanPath}` : `${backendBase}/api/v1${cleanPath}`;
    window.open(targetUrl, '_blank');
  }
};

/**
 * Returns the absolute backend URL for a given API path
 */
export const getBackendPdfUrl = (url: string): string => {
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return cleanPath.startsWith('/api/') ? `${backendBase}${cleanPath}` : `${backendBase}/api/v1${cleanPath}`;
};
