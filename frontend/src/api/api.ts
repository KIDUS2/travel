import { config } from '../config';
import { request } from './client';
import { demoApi } from './demoApi';
import type { PrintFile, BookOrder, DeliveryMethod, OrderInput, OrderStatus, PrintingInfo, PrintQuote, DeletionResult, PrivacySettings, PublicStats, AdminSummary, AdminUser, Book, BookInput, BookPhoto, BookSummary, Channel, ChannelInput, PlatformInfo, YouTubeStats, Me, Media, Memory, MemoryInput, Page, Privacy, Trip, TripInput } from './types';

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
  updateMe(input: { displayName: string; preferredLanguage: 'en' | 'am' }): Promise<Me>;
  platforms(): Promise<PlatformInfo[]>;
  listChannels(): Promise<Channel[]>;
  createChannel(input: ChannelInput): Promise<Channel>;
  updateChannel(id: string, input: ChannelInput): Promise<Channel>;
  deleteChannel(id: string): Promise<void>;
  connectChannel(id: string): Promise<{ authorizeUrl: string }>;
  disconnectChannel(id: string): Promise<Channel>;
  channelStats(id: string): Promise<YouTubeStats>;
  channelPublicStats(id: string): Promise<PublicStats>;
  adminSummary(): Promise<AdminSummary>;
  adminUsers(params: { query?: string; page?: number; size?: number }): Promise<Page<AdminUser>>;
  adminUpdateUser(id: string, patch: { role?: AdminUser['role']; status?: AdminUser['status'] }): Promise<AdminUser>;
  privacySettings(): Promise<PrivacySettings>;
  updatePrivacySettings(input: PrivacySettings): Promise<PrivacySettings>;
  /** Everything stored about the traveler, as JSON. */
  exportData(): Promise<unknown>;
  deleteAccount(confirm: string): Promise<DeletionResult>;
  printingInfo(): Promise<PrintingInfo>;
  quote(bookId: string, copies: number, delivery: DeliveryMethod): Promise<PrintQuote>;
  /** Creates the order and returns Chapa's checkout page to send the traveler to. */
  createOrder(bookId: string, input: OrderInput): Promise<{ order: BookOrder; checkoutUrl: string }>;
  listOrders(): Promise<BookOrder[]>;
  /** Also re-checks the payment with Chapa while the order is waiting for payment. */
  getOrder(id: string): Promise<BookOrder>;
  adminOrders(status?: OrderStatus): Promise<BookOrder[]>;
  adminUpdateOrder(id: string, status: OrderStatus, note?: string): Promise<BookOrder>;
  adminOrderPrintFile(id: string): Promise<PrintFile>;
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
  updateMe: (input) => request('/api/me', { method: 'PUT', body: JSON.stringify(input) }),
  platforms: () => request('/api/channels/platforms'),
  listChannels: () => request('/api/channels'),
  createChannel: (input) => request('/api/channels', { method: 'POST', body: JSON.stringify(input) }),
  updateChannel: (id, input) => request(`/api/channels/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteChannel: (id) => request(`/api/channels/${id}`, { method: 'DELETE' }),
  connectChannel: (id) => request(`/api/channels/${id}/connect`, { method: 'POST' }),
  disconnectChannel: (id) => request(`/api/channels/${id}/connect`, { method: 'DELETE' }),
  channelStats: (id) => request(`/api/channels/${id}/stats`),
  channelPublicStats: (id) => request(`/api/channels/${id}/public-stats`),
  adminSummary: () => request('/api/admin/summary'),
  adminUsers: ({ query, page = 0, size = 25 }) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (query) q.set('query', query);
    return request(`/api/admin/users?${q}`);
  },
  adminUpdateUser: (id, patch) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  privacySettings: () => request('/api/me/privacy'),
  updatePrivacySettings: (input) => request('/api/me/privacy', { method: 'PUT', body: JSON.stringify(input) }),
  exportData: () => request('/api/me/export', { cache: 'no-store' }),
  deleteAccount: (confirm) => request('/api/me', { method: 'DELETE', body: JSON.stringify({ confirm }) }),
  printingInfo: () => request('/api/printing'),
  quote: (bookId, copies, delivery) => request(`/api/books/${bookId}/quote?copies=${copies}&delivery=${delivery}`),
  createOrder: (bookId, input) => request(`/api/books/${bookId}/orders`, { method: 'POST', body: JSON.stringify(input) }),
  listOrders: () => request('/api/orders', { cache: 'no-store' }),
  getOrder: (id) => request(`/api/orders/${id}`, { cache: 'no-store' }),
  adminOrders: (status) => request(`/api/admin/orders${status ? `?status=${status}` : ''}`, { cache: 'no-store' }),
  adminOrderPrintFile: (id) => request(`/api/admin/orders/${id}/print`, { cache: 'no-store' }),
  adminUpdateOrder: (id, status, note) => request(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note: note ?? null }) }),
};

export const api: TeguwazApi = config.demoMode ? demoApi : httpApi;
