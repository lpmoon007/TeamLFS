// Decision Room board shapes — a plain (non-'use server') module so both the server
// actions in deliberation.ts and the client components can import the types. ('use server'
// files may only export async functions.)

export type Valence = 1 | 0 | -1;

export interface BoardStance {
  seat: string;
  valence: Valence;
}
export interface BoardOption {
  optionId: string;
  summary: string;
  author: string; // seat key
  createdMs: number;
  stances: BoardStance[]; // latest stance per seat
}
export interface DecisionLock {
  optionId: string;
  text: string;
  by: string;
  unanimous: boolean;
  dissenters: string[];
}
export interface DecisionBoard {
  options: BoardOption[];
  lock: DecisionLock | null;
}
