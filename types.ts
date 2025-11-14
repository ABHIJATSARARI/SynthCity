
export enum BuildingCategory {
  DRUMS = 'Drums',
  BASS = 'Bass',
  SYNTH = 'Synth',
  PAD = 'Pad',
}

export enum EffectType {
  NONE = 'None',
  REVERB = 'Reverb',
  DELAY = 'Delay',
  CATHEDRAL = 'Cathedral',
}

export interface Building {
  id: string;
  name: string;
  category: BuildingCategory;
  description: string;
  color: string;
  // Audio control properties
  volume: number;
  pitch: number; // Semitones offset, e.g., -12 to 12
  effect: EffectType;
  effectParams: {
    reverbDecay: number; // For Reverb and Cathedral
    delayTime: number;   // For Delay
    delayFeedback: number; // For Delay
  };
  isMuted: boolean;
  isSolo: boolean;
}

export interface Note {
  note: string;
  startTime: number;
  duration: number;
}

export interface Track {
  instrument: string;
  notes: Note[];
}

export interface MusicLoop {
  bpm: number;
  tracks: Track[];
}