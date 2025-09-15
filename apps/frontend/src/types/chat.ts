export type GeminiModel =
  | "gemini-2.5-flash-lite"
  | "gemini-2.0-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-2.0-flash";

export interface OptimisticMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  isOptimistic: boolean;
  isLoading?: boolean;
  clientKey?: string; // Stable key for streaming
}

export interface Event {
  id?: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: any[];
  isOptimistic?: boolean;
  isConfirmed?: boolean;
  tmpId?: string;
}

export interface Thread {
  id: string;
  title: string;
  modelName: string;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  isOptimistic?: boolean;
  isLoading?: boolean;
  clientKey?: string;
}
