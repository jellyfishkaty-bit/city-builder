import Dexie, { type Table } from 'dexie';
import type { GameState } from './types';

interface SaveRow {
  id: 'autosave';
  data: string;
}

class SaveDB extends Dexie {
  saves!: Table<SaveRow, string>;
  constructor() {
    super('cozy-city-builder');
    this.version(1).stores({ saves: 'id' });
  }
}

const db = new SaveDB();
const LOCAL_KEY = 'cozy-city-builder:autosave';

export async function saveGame(state: GameState): Promise<void> {
  const serializable: GameState = { ...state, pendingChoice: null };
  const json = JSON.stringify(serializable);
  try {
    localStorage.setItem(LOCAL_KEY, json);
  } catch {
    // storage full or unavailable — fall through to IndexedDB attempt
  }
  try {
    await db.saves.put({ id: 'autosave', data: json });
  } catch {
    // IndexedDB unavailable (e.g. private browsing) — localStorage already has it
  }
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
  db.saves.delete('autosave').catch(() => {});
}
