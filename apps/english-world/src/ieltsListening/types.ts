export type Question = {
  id: number;
  prompt: string;
  category?: string;
  stage?: string;
  before?: string;
  after?: string;
};
export type Group = {
  kind: string;
  format?: string;
  title: string;
  instruction: string;
  maxWords?: number;
  allowNumber?: boolean;
  reusable?: boolean;
  options?: { id: string; text: string }[];
  map?: {
    nodes: { id: string; x: number; y: number }[];
    landmarks: { label: string; x: number; y: number }[];
    paths: { from: { x: number; y: number }; to: { x: number; y: number } }[];
  };
  questions: Question[];
};
export type Material = {
  id: string;
  title: string;
  topic?: string;
  status: string;
  source: string;
  requestedParts: number[];
  completedParts: number;
  error?: string;
  canPrepare?: boolean;
  owner?: boolean;
  canResume?: boolean;
  completed?: boolean;
  visibility?: string;
  sections: {
    part: number;
    title: string;
    audioCount: number;
    audioSeconds?: number;
    groups: Group[];
  }[];
};
export type Result = {
  score: number;
  total: number;
  items: {
    id: number;
    answer: string;
    correct: boolean;
    reason: string;
    accepted: string[];
    evidence: string;
    explanation: string;
  }[];
  sections: { part: number; title: string; transcript: string }[];
};
export type Attempt = {
  id: string;
  revision: number;
  material: Material;
  mode: "training" | "simulation";
  status: string;
  answers: Record<string, string>;
  flags: number[];
  played: number;
  deadline?: number;
  interrupted: boolean;
  assists: { replays: number; slow: boolean };
  result: Result | null;
  reflections?: Record<string, string>;
};
export type History = {
  id: string;
  title: string;
  mode: string;
  status: string;
  score?: number;
  total?: number;
  interrupted: boolean;
  createdAt: number;
};
