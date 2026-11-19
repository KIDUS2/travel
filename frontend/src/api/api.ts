import { config } from '../config';
import { request } from './client';
import { demoApi } from './demoApi';
import type { Book, BookInput, BookPhoto, BookSummary, ConnectionStatus, Platform, YouTubeStats, Me, Media, Memory, MemoryInput, Page, Privacy, Trip, TripInput } from './types';

export interface TeguwazApi {
  me(): Promise<Me>;
  listTrips(): Promise<Trip[]>;
  createTrip(input: TripInput): Promise<Trip>;
  listMemories(params?: { tripId?: string; page?: number; size?: number }): Promise<Page<Memory>>;
  getMemory(id: string): Promise<Memory>;
  createMemory(input: MemoryInput): Promise<Memory>;
  updateMemory(id: string, input: MemoryInput): Promise<Memory>;
  setPrivacy(id: string, privacy: Privacy): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;
  uploadMedia(memoryId: string, file: File): Promise<Media>;
  deleteMedia(memoryId: string, mediaId: string): Promise<void>;
  listBooks(): Promise<BookSummary[]>;
  getBook(id: string): Promise<Book>;
  createBook(input: BookInput): Promise<Book>;
  saveBook(id: string, input: BookInput): Promise<Book>;
  deleteBook(id: string): Promise<void>;
  listBookPhotos(bookId: string): Promise<BookPhoto[]>;
  uploadBookPhoto(bookId: string, file: File): Promise<BookPhoto>;
  deleteBookPhoto(bookId: string, photoId: string): Promise<void>;
  listConnections(): Promise<ConnectionStatus[]>;
  startConnection(platform: Platform): Promise<{ authorizeUrl: string }>;
  disconnect(platform: Platform): Promise<void>;
  youtubeStats(): Promise<YouTubeStats>;
}

const httpApi: TeguwazApi = {
  me: () => request('/api/me'),
  listTrips: () => request('/api/trips'),
  createTrip: (input) => request('/api/trips', { method: 'POST', body: JSON.stringify(input) }),
  listMemories: ({ tripId, page = 0, size = 50 } = {}) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (tripId) q.set('tripId', tripId);
    return request(`/api/memories?${q}`);
  },
  getMemory: (id) => request(`/api/memories/${id}`),
  createMemory: (input) => request('/api/memories', { method: 'POST', body: JSON.stringify(input) }),
  updateMemory: (id, input) => request(`/api/memories/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  setPrivacy: (id, privacy) =>
    request(`/api/memories/${id}/privacy`, { method: 'PATCH', body: JSON.stringify({ privacy }) }),
  deleteMemory: (id) => request(`/api/memories/${id}`, { method: 'DELETE' }),
  uploadMedia: (memoryId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/api/memories/${memoryId}/media`, { method: 'POST', body: form });
  },
  deleteMedia: (memoryId, mediaId) => request(`/api/memories/${memoryId}/media/${mediaId}`, { method: 'DELETE' }),
  listBooks: () => request('/api/books'),
  getBook: (id) => request(`/api/books/${id}`),
  createBook: (input) => request('/api/books', { method: 'POST', body: JSON.stringify(input) }),
  saveBook: (id, input) => request(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteBook: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),
  listBookPhotos: (bookId) => request(`/api/books/${bookId}/photos`),
  uploadBookPhoto: (bookId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/api/books/${bookId}/photos`, { method: 'POST', body: form });
  },
  deleteBookPhoto: (bookId, photoId) => request(`/api/books/${bookId}/photos/${photoId}`, { method: 'DELETE' }),
  listConnections: () => request('/api/connections'),
  startConnection: (platform) => request(`/api/connections/${platform}/start`, { method: 'POST' }),
  disconnect: (platform) => request(`/api/connections/${platform}`, { method: 'DELETE' }),
  youtubeStats: () => request('/api/connections/youtube/stats'),
};

export const api: TeguwazApi = config.demoMode ? demoApi : httpApi;
