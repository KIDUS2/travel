import type { DeliveryMethod, OrderStatus } from '../../api/types';

export const etb = (n: number) => `ETB ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const STATUS: Record<OrderStatus, { en: string; am: string; tone: 'wait' | 'ok' | 'done' | 'bad' }> = {
  PENDING_PAYMENT: { en: 'Waiting for payment', am: 'ክፍያ በመጠባበቅ ላይ', tone: 'wait' },
  PAID: { en: 'Paid, in the print queue', am: 'ተከፍሏል', tone: 'ok' },
  PRINTING: { en: 'Printing', am: 'በህትመት ላይ', tone: 'ok' },
  SHIPPED: { en: 'On the way', am: 'በመንገድ ላይ', tone: 'ok' },
  DELIVERED: { en: 'Delivered', am: 'ደርሷል', tone: 'done' },
  CANCELLED: { en: 'Cancelled', am: 'ተሰርዟል', tone: 'bad' },
  PAYMENT_FAILED: { en: 'Payment did not start', am: 'ክፍያ አልተሳካም', tone: 'bad' },
};

export const STEPS: OrderStatus[] = ['PAID', 'PRINTING', 'SHIPPED', 'DELIVERED'];

export const DELIVERY: Record<DeliveryMethod, { en: string; hint: string }> = {
  PICKUP: { en: 'Pick up in Addis Ababa', hint: 'Free · we call you when it is ready' },
  ADDIS: { en: 'Delivery in Addis Ababa', hint: 'To your door, in Addis' },
  REGIONAL: { en: 'Delivery to another city', hint: 'By courier or bus parcel' },
};

export const FINISH_LABEL: Record<string, string> = { hard: 'Hardcover', soft: 'Softcover', lay: 'Lay-flat' };
