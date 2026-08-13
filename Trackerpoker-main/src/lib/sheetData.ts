import type { Player } from '@/domain/types';
import type { RegistryUser } from '@/services/registry/types';

export const EMPTY_PLAYER: Player = {
  id: 'player-empty',
  nickname: '',
  realName: '',
  country: '',
  countryCode: '',
  countryFlag: '',
  room: 'GGPoker',
  bio: '',
  gameTypes: ['MTT'],
  startedAt: new Date().toISOString().slice(0, 10),
  createdAt: new Date().toISOString(),
  avatarInitials: '?',
};

function buildFallbackPlayer(user: RegistryUser | null, viewSlug: string | null): Player {
  const slug = viewSlug ?? user?.slug;
  if (!slug) return EMPTY_PLAYER;

  const name = user?.displayName ?? slug;
  return {
    id: `player-${slug}`,
    nickname: name.split(' ')[0] || slug,
    realName: name,
    country: '',
    countryCode: '',
    countryFlag: '',
    room: 'GGPoker',
    bio: '',
    gameTypes: ['MTT'],
    startedAt: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    avatarInitials: name.slice(0, 2).toUpperCase(),
  };
}

export function playerFromSheetOrUser(
  sheetPlayer: Player | null,
  user: RegistryUser | null,
  viewSlug: string | null,
): Player {
  const base = sheetPlayer ?? buildFallbackPlayer(user, viewSlug);
  return {
    ...base,
    room: base.room || 'GGPoker',
    gameTypes: base.gameTypes.length > 0 ? base.gameTypes : ['MTT'],
  };
}

export function requireSheetId(sheetId: string | null): string {
  if (!sheetId) {
    throw new Error('No hay Google Sheet conectado — vinculá tu Sheet para guardar datos');
  }
  return sheetId;
}
