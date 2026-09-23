import { create } from 'zustand';
import type { BuildingId, GameState, LogEntry, Resources, Tile } from './types';
import { BUILDINGS } from './buildings';
import { generateMap, MAP_HEIGHT, MAP_WIDTH } from './mapgen';
import { maybeTriggerEvent } from './events';
import { loadSave, saveGame, clearSave } from './save';

export const GOAL_POPULATION = 60;
export const FOOD_PER_POP = 0.9;

function computeHousingCapacity(tiles: Tile[][]): number {
  let cap = 5; // a few villagers can always camp before the first house goes up
  for (const row of tiles) {
    for (const t of row) {
      if (t.buildingId) cap += BUILDINGS[t.buildingId].housing;
    }
  }
  return cap;
}

function computeHappiness(tiles: Tile[][], population: number): number {
  let wells = 0;
  let taverns = 0;
  for (const row of tiles) {
    for (const t of row) {
      if (t.buildingId === 'well') wells++;
      if (t.buildingId === 'tavern') taverns++;
    }
  }
  const base = 45 + wells * 6 + taverns * 9 - Math.floor(population / 15);
  return Math.max(10, Math.min(100, base));
}

export function countBuildingTypes(tiles: Tile[][]): Set<BuildingId> {
  const set = new Set<BuildingId>();
  for (const row of tiles) for (const t of row) if (t.buildingId) set.add(t.buildingId);
  return set;
}

function makeLog(day: number, tone: LogEntry['tone'], title: string, message: string): LogEntry {
  return { id: `${day}-${Math.random().toString(36).slice(2, 8)}`, day, tone, title, message };
}

function freshState(): GameState {
  const tiles = generateMap();
  // seed a cozy starter hamlet near the map center so the village never opens on bare grass
  const cx = 4;
  const cy = 4;
  const starters: [number, number, BuildingId][] = [
    [cx, cy, 'house'],
    [cx + 1, cy, 'house'],
    [cx, cy + 1, 'farm'],
  ];
  for (const [x, y, id] of starters) {
    tiles[y][x] = { ...tiles[y][x], terrain: 'grass', buildingId: id, variant: 1 };
  }

  const resources: Resources = { materials: 26, food: 24, gold: 18, population: 6 };

  return {
    seed: Date.now(),
    day: 1,
    resources,
    housingCapacity: computeHousingCapacity(tiles),
    happiness: computeHappiness(tiles, resources.population),
    tiles,
    log: [makeLog(1, 'neutral', 'Основание посёлка', 'Несколько семей разбили здесь свой первый лагерь у моря.')],
    modifiers: [],
    pendingChoice: null,
    goalReached: false,
  };
}

interface Store extends GameState {
  selectedBuilding: BuildingId | null;
  toastLog: LogEntry | null;
  selectBuilding: (id: BuildingId | null) => void;
  buildAt: (x: number, y: number) => void;
  nextDay: () => void;
  resolveChoice: (choiceIndex: number) => void;
  dismissToast: () => void;
  resetGame: () => void;
}

function applyModifier(state: GameState, resource: keyof Resources, base: number): number {
  let mult = 1;
  for (const m of state.modifiers) {
    if (m.resource === resource) mult *= m.multiplier;
  }
  return base * mult;
}

function persist(state: GameState) {
  saveGame(state).catch(() => {});
}

export const useGameStore = create<Store>((set, get) => ({
  ...(loadSave() ?? freshState()),
  selectedBuilding: null,
  toastLog: null,

  selectBuilding: (id) => set({ selectedBuilding: id }),

  buildAt: (x, y) => {
    const state = get();
    const buildingId = state.selectedBuilding;
    if (!buildingId) return;
    const def = BUILDINGS[buildingId];
    const tile = state.tiles[y]?.[x];
    if (!tile || tile.buildingId) return;
    if (!def.buildableOn.includes(tile.terrain)) return;
    for (const key of Object.keys(def.cost) as (keyof Resources)[]) {
      if (state.resources[key] < (def.cost[key] ?? 0)) return;
    }

    const resources = { ...state.resources };
    for (const key of Object.keys(def.cost) as (keyof Resources)[]) {
      resources[key] -= def.cost[key] ?? 0;
    }

    const tiles = state.tiles.map((row, ry) =>
      ry === y ? row.map((t, rx) => (rx === x ? { ...t, buildingId, variant: t.variant + 7 } : t)) : row
    );

    const housingCapacity = computeHousingCapacity(tiles);
    const happiness = computeHappiness(tiles, resources.population);
    const next: GameState = { ...state, resources, tiles, housingCapacity, happiness };
    set(next);
    persist(get());
  },

  nextDay: () => {
    const state = get();
    if (state.pendingChoice) return;

    let materials = state.resources.materials;
    let food = state.resources.food;
    let gold = state.resources.gold;
    let population = state.resources.population;

    for (const row of state.tiles) {
      for (const t of row) {
        if (!t.buildingId) continue;
        const def = BUILDINGS[t.buildingId];
        for (const [res, amount] of Object.entries(def.produces) as [keyof Resources, number][]) {
          let value = amount;
          if (def.bonusTerrain && def.bonusMultiplier && t.terrain === def.bonusTerrain) {
            value *= def.bonusMultiplier;
          }
          value = applyModifier(state, res, value);
          const variance = 0.8 + Math.random() * 0.4;
          value *= variance;
          if (res === 'materials') materials += value;
          if (res === 'food') food += value;
          if (res === 'gold') gold += value;
        }
        for (const [res, amount] of Object.entries(def.upkeep) as [keyof Resources, number][]) {
          if (res === 'materials') materials -= amount;
          if (res === 'food') food -= amount;
          if (res === 'gold') gold -= amount;
        }
      }
    }

    const consumption = population * FOOD_PER_POP;
    const foodBefore = food;
    food -= consumption;
    const wentHungry = food < 0;
    food = Math.max(0, food);
    materials = Math.max(0, materials);
    gold = Math.max(0, gold);

    const happiness = computeHappiness(state.tiles, population);
    let logEntries: LogEntry[] = [];

    if (!wentHungry && population < state.housingCapacity) {
      const growthChance = Math.min(0.85, 0.35 + happiness / 180);
      if (Math.random() < growthChance) {
        const room = state.housingCapacity - population;
        const gain = Math.min(room, 1 + Math.floor(Math.random() * 2));
        population += gain;
      }
    } else if (wentHungry) {
      if (Math.random() < 0.25 && population > 3) {
        population -= 1;
        logEntries.push(
          makeLog(state.day, 'bad', 'Голодный месяц', 'Еды не хватило на всех — часть жителей ушла искать удачи в других краях.')
        );
      }
    }
    void foodBefore;

    const modifiers = state.modifiers
      .map((m) => ({ ...m, daysLeft: m.daysLeft - 1 }))
      .filter((m) => m.daysLeft > 0);

    let nextState: GameState = {
      ...state,
      day: state.day + 1,
      resources: { materials, food, gold, population },
      housingCapacity: state.housingCapacity,
      happiness,
      modifiers,
      log: state.log,
    };

    const eventResult = maybeTriggerEvent(nextState);
    nextState = eventResult.state;
    let toast: LogEntry | null = null;

    if (eventResult.pendingChoice) {
      nextState = { ...nextState, pendingChoice: eventResult.pendingChoice };
    } else if (eventResult.log) {
      const entry = makeLog(nextState.day, eventResult.log.tone, eventResult.log.title, eventResult.log.message);
      logEntries.push(entry);
      toast = entry;
    }

    if (!nextState.goalReached && nextState.resources.population >= GOAL_POPULATION) {
      const entry = makeLog(
        nextState.day,
        'good',
        'Поселение процветает!',
        `Население достигло ${GOAL_POPULATION} жителей. Ваш городок можно считать состоявшимся — но остановиться никто не заставляет.`
      );
      logEntries.push(entry);
      nextState = { ...nextState, goalReached: true };
      toast = entry;
    }

    nextState = { ...nextState, log: [...logEntries, ...nextState.log].slice(0, 40) };

    set({ ...nextState, toastLog: toast ?? get().toastLog });
    persist(get());
    if (toast) {
      set({ toastLog: toast });
    }
  },

  resolveChoice: (choiceIndex) => {
    const state = get();
    const choice = state.pendingChoice;
    if (!choice || !choice.choices) return;
    const option = choice.choices[choiceIndex];
    if (!option) return;
    let next = option.apply({ ...state, pendingChoice: null });
    const housingCapacity = computeHousingCapacity(next.tiles);
    const happiness = computeHappiness(next.tiles, next.resources.population);
    const entry = makeLog(state.day, 'good', choice.title, `Выбрано: ${option.label}`);
    next = {
      ...next,
      pendingChoice: null,
      housingCapacity,
      happiness,
      log: [entry, ...next.log].slice(0, 40),
    };
    set({ ...next, toastLog: entry });
    persist(get());
  },

  dismissToast: () => set({ toastLog: null }),

  resetGame: () => {
    clearSave();
    set({ ...freshState(), selectedBuilding: null, toastLog: null });
  },
}));

export { MAP_WIDTH, MAP_HEIGHT };
