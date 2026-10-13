export interface Clef {
  sign: string;
  line: number;
}

export interface Attributes {
  divisions?: number;
  fifths?: number;
  beats?: number;
  beatType?: number;
  clef?: Clef;
}

export interface Note {
  rest: boolean;
  chord: boolean;
  step?: string;
  octave?: number;
  alter?: number;
  duration: number;
  type: string;
  dots: number;
}

export interface Measure {
  number: string;
  attributes: Attributes;
  notes: Note[];
}

export interface Part {
  id: string;
  name: string;
  measures: Measure[];
}

export interface Score {
  title: string;
  parts: Part[];
}
