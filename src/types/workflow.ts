export interface WorkflowNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title?: string;
    [key: string]: any;
  };
}

export type Workflow = Record<string, WorkflowNode>;

export interface WorkflowOverrides {
  positive_prompt?: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  scheduler?: string;
  width?: number;
  height?: number;
  denoise?: number;
  input_image?: string;
  batch_size?: number;
  model?: string;
  vae?: string;
  lora?: Array<{
    name: string;
    strength_model: number;
    strength_clip: number;
  }>;
}

export interface WorkflowMetadata {
  name: string;
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  workflow: Workflow;
}

export interface TemplateOptions {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler?: string;
  scheduler?: string;
  model?: string;
  denoise?: number;
  batch_size?: number;
  input_image?: string;
}
