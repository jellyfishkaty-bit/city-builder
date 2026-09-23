export type ResourceKind = 'materials' | 'food' | 'gold' | 'population';

export interface Resources {
  materials: number;
  food: number;
  gold: number;
  population: number;
}

export type TerrainKind = 'grass' | 'forest' | 'rock' | 'water' | 'sand';

export type BuildingId =
  | 'house'
  | 'farm'
  | 'sawmill'
  | 'quarry'
  | 'market'
  | 'well'
  | 'tavern'
  | 'lighthouse';

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainKind;
  buildingId: BuildingId | null;
  /** bumped each time a building is placed here, used purely for sprite variety */
  variant: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  cost: Partial<Resources>;
  /** base per-turn output before modifiers */
  produces: Partial<Record<ResourceKind, number>>;
  /** per-turn upkeep, deducted before production */
  upkeep: Partial<Record<ResourceKind, number>>;
  /** extra housing capacity granted */
  housing: number;
  /** terrain that grants a production bonus when built on/adjacent */
  bonusTerrain?: TerrainKind;
  bonusMultiplier?: number;
  category: 'housing' | 'production' | 'commerce' | 'decorative';
  buildableOn: TerrainKind[];
}

export type EventTone = 'good' | 'neutral' | 'bad' | 'choice';

export interface LogEntry {
  id: string;
  day: number;
  tone: EventTone;
  title: string;
  message: string;
}

export interface TempModifier {
  id: string;
  label: string;
  resource: ResourceKind;
  multiplier: number;
  daysLeft: number;
}

export interface GameState {
  seed: number;
  day: number;
  resources: Resources;
  housingCapacity: number;
  happiness: number;
  tiles: Tile[][];
  log: LogEntry[];
  modifiers: TempModifier[];
  pendingChoice: GameEventDef | null;
  goalReached: boolean;
}

export interface GameEventChoiceOption {
  label: string;
  apply: (state: GameState) => GameState;
}

export interface GameEventDef {
  id: string;
  tone: EventTone;
  weight: number;
  title: string;
  message: string;
  apply?: (state: GameState) => {
    state: GameState;
    resultMessage?: string;
  };
  choices?: GameEventChoiceOption[];
  minDay?: number;
}
