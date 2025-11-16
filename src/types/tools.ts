import { z } from 'zod';

// Submit Workflow Tool
export const SubmitWorkflowSchema = z.object({
  workflow: z.union([z.string(), z.record(z.any())]),
  overrides: z.object({
    positive_prompt: z.string().optional(),
    negative_prompt: z.string().optional(),
    seed: z.number().int().optional(),
    steps: z.number().int().min(1).max(150).optional(),
    cfg: z.number().min(0).max(30).optional(),
    sampler_name: z.string().optional(),
    scheduler: z.string().optional(),
    width: z.number().int().min(64).max(8192).optional(),
    height: z.number().int().min(64).max(8192).optional(),
    denoise: z.number().min(0).max(1).optional(),
    input_image: z.string().optional(),
    batch_size: z.number().int().min(1).max(100).optional(),
    model: z.string().optional(),
    vae: z.string().optional(),
    lora: z.array(z.object({
      name: z.string(),
      strength_model: z.number(),
      strength_clip: z.number()
    })).optional()
  }).optional(),
  client_id: z.string().optional()
});

// Generate Simple Tool
export const GenerateSimpleSchema = z.object({
  prompt: z.string(),
  negative_prompt: z.string().optional(),
  template: z.enum(["flux_txt2img", "sd15_txt2img", "sdxl_txt2img", "basic_img2img"]),
  model: z.string().optional(),
  input_image: z.string().optional(),
  width: z.number().int().min(64).max(8192).optional(),
  height: z.number().int().min(64).max(8192).optional(),
  steps: z.number().int().min(1).max(150).optional(),
  cfg: z.number().min(0).max(30).optional(),
  seed: z.number().int().optional(),
  sampler: z.string().optional(),
  scheduler: z.string().optional(),
  denoise: z.number().min(0).max(1).optional(),
  batch_size: z.number().int().min(1).max(100).optional()
});

// Get Status Tool
export const GetStatusSchema = z.object({
  prompt_id: z.string().optional(),
  include_outputs: z.boolean().optional().default(true)
});

// Wait for Completion Tool
export const WaitForCompletionSchema = z.object({
  prompt_id: z.string(),
  timeout: z.number().optional().default(300),
  poll_interval: z.number().optional().default(2)
});

// List Models Tool
export const ListModelsSchema = z.object({
  type: z.enum([
    "checkpoints",
    "loras",
    "vae",
    "clip",
    "clip_vision",
    "unet",
    "embeddings",
    "upscale_models",
    "diffusion_models",
    "controlnet",
    "ipadapter",
    "style_models",
    "photomaker",
    "insightface",
    "all"
  ]).optional(),
  filter: z.string().optional(),
  include_size: z.boolean().optional().default(false)
});

// Save Workflow Tool
export const SaveWorkflowSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  workflow: z.union([z.string(), z.record(z.any())]),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  overwrite: z.boolean().optional().default(false)
});

// Load Workflow Tool
export const LoadWorkflowSchema = z.object({
  name: z.string()
});

// List Workflows Tool
export const ListWorkflowsSchema = z.object({
  filter: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Delete Workflow Tool
export const DeleteWorkflowSchema = z.object({
  name: z.string(),
  confirm: z.boolean().optional().default(false)
});

// Cancel Generation Tool
export const CancelGenerationSchema = z.object({
  prompt_id: z.string().optional(),
  delete_from_queue: z.boolean().optional().default(true)
});

// Clear Queue Tool
export const ClearQueueSchema = z.object({
  confirm: z.boolean().optional().default(false)
});

// Upload Image Tool
export const UploadImageSchema = z.object({
  image_path: z.string(),
  filename: z.string().optional(),
  overwrite: z.boolean().optional().default(false)
});

// Get Output Images Tool
export const GetOutputImagesSchema = z.object({
  limit: z.number().int().optional().default(20),
  sort: z.enum(["newest", "oldest", "name"]).optional().default("newest"),
  filter: z.string().optional()
});

// Type exports
export type SubmitWorkflowInput = z.infer<typeof SubmitWorkflowSchema>;
export type GenerateSimpleInput = z.infer<typeof GenerateSimpleSchema>;
export type GetStatusInput = z.infer<typeof GetStatusSchema>;
export type WaitForCompletionInput = z.infer<typeof WaitForCompletionSchema>;
export type ListModelsInput = z.infer<typeof ListModelsSchema>;
export type SaveWorkflowInput = z.infer<typeof SaveWorkflowSchema>;
export type LoadWorkflowInput = z.infer<typeof LoadWorkflowSchema>;
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsSchema>;
export type DeleteWorkflowInput = z.infer<typeof DeleteWorkflowSchema>;
export type CancelGenerationInput = z.infer<typeof CancelGenerationSchema>;
export type ClearQueueInput = z.infer<typeof ClearQueueSchema>;
export type UploadImageInput = z.infer<typeof UploadImageSchema>;
export type GetOutputImagesInput = z.infer<typeof GetOutputImagesSchema>;
