import { api } from '../api/api';
import type { Memory } from '../api/types';

/**
 * Memories a book can use: all of yours, plus Family and Public memories other members
 * added to the book's trip when it is shared. Shared books get everyone's photos.
 */
export async function memoriesForBook(tripId: string | null): Promise<Memory[]> {
  const own = (await api.listMemories({ size: 100 })).items;
  if (!tripId) return own;
  try {
    const feed = await api.tripFeed(tripId);
    const ids = new Set(own.map((m) => m.id));
    return [...own, ...feed.items.map((i) => i.memory).filter((m) => !ids.has(m.id))];
  } catch {
    return own;
  }
}

export async function tripMemories(tripId: string | null): Promise<Memory[]> {
  if (!tripId) return (await api.listMemories({ size: 100 })).items;
  return (await api.tripFeed(tripId)).items.map((i) => i.memory);
}
