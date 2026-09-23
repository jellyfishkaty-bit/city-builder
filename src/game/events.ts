import type { GameEventDef, GameState } from './types';
import { BUILDINGS, BUILDING_ORDER } from './buildings';

function clone(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    modifiers: state.modifiers.map((m) => ({ ...m })),
  };
}

function addResources(state: GameState, delta: Partial<GameState['resources']>): GameState {
  const s = clone(state);
  for (const key of Object.keys(delta) as (keyof GameState['resources'])[]) {
    s.resources[key] = Math.max(0, s.resources[key] + (delta[key] ?? 0));
  }
  return s;
}

function findEmptyBuildableTile(state: GameState, terrainOk: string[]) {
  const candidates = state.tiles.flat().filter((t) => !t.buildingId && terrainOk.includes(t.terrain));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const EVENTS: GameEventDef[] = [
  {
    id: 'good-harvest',
    tone: 'good',
    weight: 18,
    title: 'Хороший урожай',
    message: 'Тёплое солнце и вовремя прошедшие дожди дали богатый урожай.',
    apply: (state) => {
      const bonus = 8 + Math.floor(Math.random() * 10);
      return { state: addResources(state, { food: bonus }), resultMessage: `+${bonus} еды` };
    },
  },
  {
    id: 'trade-caravan',
    tone: 'good',
    weight: 14,
    title: 'Торговый караван',
    message: 'Проезжие торговцы купили излишки и оставили звонкую монету.',
    apply: (state) => {
      const bonus = 10 + Math.floor(Math.random() * 15);
      return { state: addResources(state, { gold: bonus }), resultMessage: `+${bonus} золота` };
    },
  },
  {
    id: 'found-treasure',
    tone: 'good',
    weight: 8,
    title: 'Найден клад',
    message: 'При вспашке поля кто-то наткнулся на старинный сундучок с монетами.',
    apply: (state) => {
      const bonus = 15 + Math.floor(Math.random() * 20);
      return { state: addResources(state, { gold: bonus }), resultMessage: `+${bonus} золота` };
    },
  },
  {
    id: 'settlers',
    tone: 'good',
    weight: 12,
    title: 'Прибыли переселенцы',
    message: 'Путники прослышали о вашем уютном поселении и решили остаться.',
    minDay: 2,
    apply: (state) => {
      const room = Math.max(0, state.housingCapacity - state.resources.population);
      if (room >= 1) {
        const bonus = Math.min(room, 1 + Math.floor(Math.random() * 3));
        return { state: addResources(state, { population: bonus }), resultMessage: `+${bonus} жителей` };
      }
      const goldBonus = 12;
      return {
        state: addResources(state, { gold: goldBonus }),
        resultMessage: `Жилья не хватило, переселенцы оставили ${goldBonus} золота`,
      };
    },
  },
  {
    id: 'lumber-find',
    tone: 'good',
    weight: 10,
    title: 'Плавник у берега',
    message: 'Море вынесло на берег крепкие брёвна — отличный стройматериал.',
    apply: (state) => {
      const bonus = 6 + Math.floor(Math.random() * 8);
      return { state: addResources(state, { materials: bonus }), resultMessage: `+${bonus} материалов` };
    },
  },
  {
    id: 'light-drizzle',
    tone: 'neutral',
    weight: 10,
    title: 'Тихий дождливый день',
    message: 'Жители остались дома с чашкой чего-то тёплого. Ничего особенного не случилось.',
  },
  {
    id: 'small-storm',
    tone: 'bad',
    weight: 8,
    title: 'Небольшой шторм',
    message: 'Ветер потрепал крыши и поля — добыча материалов слегка упадёт на пару дней.',
    minDay: 3,
    apply: (state) => {
      const s = clone(state);
      s.modifiers.push({
        id: `storm-${state.day}`,
        label: 'После шторма',
        resource: 'materials',
        multiplier: 0.6,
        daysLeft: 2,
      });
      return { state: s };
    },
  },
  {
    id: 'dry-spell',
    tone: 'bad',
    weight: 6,
    title: 'Засушливые дни',
    message: 'Дожди задержались — урожай будет чуть скромнее, пока погода не наладится.',
    minDay: 4,
    apply: (state) => {
      const s = clone(state);
      s.modifiers.push({
        id: `dry-${state.day}`,
        label: 'Засуха',
        resource: 'food',
        multiplier: 0.65,
        daysLeft: 2,
      });
      return { state: s };
    },
  },
  {
    id: 'generous-choice',
    tone: 'choice',
    weight: 5,
    title: 'Странник с подарком',
    message: 'Загадочный путник предлагает вам выбор — примите один из даров.',
    minDay: 3,
    choices: [
      {
        label: 'Бесплатный колодец',
        apply: (state) => {
          const tile = findEmptyBuildableTile(state, ['grass', 'sand', 'forest', 'rock']);
          if (!tile) return state;
          const s = clone(state);
          const row = s.tiles[tile.y].map((t) =>
            t.x === tile.x && t.y === tile.y ? { ...t, buildingId: 'well' as const, variant: t.variant + 1 } : t
          );
          s.tiles = s.tiles.map((r, i) => (i === tile.y ? row : r));
          return s;
        },
      },
      {
        label: 'Мешок ресурсов',
        apply: (state) => addResources(state, { materials: 20, food: 15, gold: 10 }),
      },
    ],
  },
];

export function maybeTriggerEvent(state: GameState): { state: GameState; log?: { title: string; message: string; tone: GameEventDef['tone'] }; pendingChoice?: GameEventDef } {
  const roll = Math.random();
  if (roll > 0.32) return { state };

  const eligible = EVENTS.filter((e) => (e.minDay ?? 0) <= state.day);
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let pick = Math.random() * totalWeight;
  let chosen: GameEventDef = eligible[0];
  for (const e of eligible) {
    if (pick < e.weight) {
      chosen = e;
      break;
    }
    pick -= e.weight;
  }

  if (chosen.choices) {
    return { state, pendingChoice: chosen };
  }

  if (chosen.apply) {
    const { state: nextState, resultMessage } = chosen.apply(state);
    return {
      state: nextState,
      log: {
        title: chosen.title,
        message: resultMessage ? `${chosen.message} (${resultMessage})` : chosen.message,
        tone: chosen.tone,
      },
    };
  }

  return { state, log: { title: chosen.title, message: chosen.message, tone: chosen.tone } };
}

export const ALL_BUILDING_IDS = BUILDING_ORDER;
export { BUILDINGS };
