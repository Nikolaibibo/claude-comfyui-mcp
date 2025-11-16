export interface ComfyUIPromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, any>;
}

export interface QueueItem {
  prompt_id: string;
  number: number;
  workflow_summary?: string;
}

export interface QueueResponse {
  queue_running: Array<[number, string, any]>;
  queue_pending: Array<[number, string, any]>;
}

export interface HistoryItem {
  prompt: any;
  outputs: Record<string, {
    images?: Array<{
      filename: string;
      subfolder: string;
      type: string;
    }>;
    [key: string]: any;
  }>;
  status?: {
    status_str: string;
    completed: boolean;
    messages?: Array<[string, any]>;
  };
}

export interface HistoryResponse {
  [prompt_id: string]: HistoryItem;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface ProgressData {
  value: number;
  max: number;
}

export interface ExecutionStatus {
  status: "queued" | "executing" | "completed" | "failed";
  queue_position?: number;
  progress?: {
    value: number;
    max: number;
    percentage: number;
  };
  outputs?: Array<{
    images: string[];
    node_id: string;
    filename: string;
  }>;
  error?: string;
  execution_time?: number;
}
