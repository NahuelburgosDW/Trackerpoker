import type { Player, Tournament, KeyHand } from '@/domain/types';

export type ImportLog = {
  id: string;
  fileName: string;
  processedAt: string;
  found: number;
  newCount: number;
  duplicates: number;
  errors: number;
  status: 'success' | 'partial' | 'error';
};

export type SheetsMeta = {
  connected: boolean;
  lastSync: string | null;
};

export type SheetsData = {
  player: Player | null;
  tournaments: Tournament[];
  hands: KeyHand[];
  importLogs: ImportLog[];
  meta: SheetsMeta;
};

export type UpsertResult = {
  found: number;
  newCount: number;
  duplicates: number;
  errors: number;
};
