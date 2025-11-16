import { Workflow, WorkflowOverrides } from '../types/workflow.js';
import {
  isPositivePromptNode,
  isNegativePromptNode,
  isSamplerNode,
  isImageLoaderNode,
  isModelLoaderNode,
  isVAELoaderNode,
  isCLIPLoaderNode,
  isLoraLoaderNode
} from './validation.js';
import { uploadImage } from './filesystem.js';

export class WorkflowProcessor {
  /**
   * Find first node matching predicate
   */
  private findNode(workflow: Workflow, predicate: (node: any) => boolean): string | null {
    for (const [id, node] of Object.entries(workflow)) {
      if (predicate(node)) return id;
    }
    return null;
  }

  /**
   * Find all nodes matching predicate
   */
  private findAllNodes(workflow: Workflow, predicate: (node: any) => boolean): string[] {
    const results: string[] = [];
    for (const [id, node] of Object.entries(workflow)) {
      if (predicate(node)) results.push(id);
    }
    return results;
  }

  /**
   * Apply overrides to workflow
   */
  async applyOverrides(workflow: Workflow, overrides?: WorkflowOverrides): Promise<Workflow> {
    if (!overrides) return workflow;

    // Deep clone workflow
    const modified = JSON.parse(JSON.stringify(workflow)) as Workflow;

    // Override positive prompt
    if (overrides.positive_prompt !== undefined) {
      const nodeId = this.findNode(modified, isPositivePromptNode);
      if (nodeId) {
        modified[nodeId].inputs.text = overrides.positive_prompt;
      }
    }

    // Override negative prompt
    if (overrides.negative_prompt !== undefined) {
      const nodeId = this.findNode(modified, isNegativePromptNode);
      if (nodeId) {
        modified[nodeId].inputs.text = overrides.negative_prompt;
      }
    }

    // Override sampler settings (apply to all sampler nodes)
    const samplerNodes = this.findAllNodes(modified, isSamplerNode);
    for (const nodeId of samplerNodes) {
      if (overrides.seed !== undefined) {
        modified[nodeId].inputs.seed = overrides.seed;
      }
      if (overrides.steps !== undefined) {
        modified[nodeId].inputs.steps = overrides.steps;
      }
      if (overrides.cfg !== undefined) {
        modified[nodeId].inputs.cfg = overrides.cfg;
      }
      if (overrides.sampler_name !== undefined) {
        modified[nodeId].inputs.sampler_name = overrides.sampler_name;
      }
      if (overrides.scheduler !== undefined) {
        modified[nodeId].inputs.scheduler = overrides.scheduler;
      }
      if (overrides.denoise !== undefined) {
        modified[nodeId].inputs.denoise = overrides.denoise;
      }
    }

    // Override input image
    if (overrides.input_image !== undefined) {
      // Upload image first
      const uploadResult = uploadImage(overrides.input_image);
      const nodeId = this.findNode(modified, isImageLoaderNode);
      if (nodeId) {
        modified[nodeId].inputs.image = uploadResult.filename;
      }
    }

    // Override model
    if (overrides.model !== undefined) {
      const nodeId = this.findNode(modified, isModelLoaderNode);
      if (nodeId) {
        const node = modified[nodeId];
        if (node.class_type === 'CheckpointLoaderSimple' || node.class_type === 'CheckpointLoader') {
          modified[nodeId].inputs.ckpt_name = overrides.model;
        } else if (node.class_type === 'UNETLoader') {
          modified[nodeId].inputs.unet_name = overrides.model;
        }
      }
    }

    // Override VAE
    if (overrides.vae !== undefined) {
      const nodeId = this.findNode(modified, isVAELoaderNode);
      if (nodeId) {
        modified[nodeId].inputs.vae_name = overrides.vae;
      }
    }

    // Override CLIP
    if (overrides.clip !== undefined) {
      const nodeId = this.findNode(modified, isCLIPLoaderNode);
      if (nodeId) {
        const node = modified[nodeId];
        if (node.class_type === 'CLIPLoader') {
          modified[nodeId].inputs.clip_name = overrides.clip;
        } else if (node.class_type === 'DualCLIPLoader') {
          modified[nodeId].inputs.clip_name1 = overrides.clip;
        }
      }
    }

    // Override or add LoRA loaders
    if (overrides.lora !== undefined && overrides.lora.length > 0) {
      // Find existing LoRA nodes and remove them
      const existingLoraNodes = this.findAllNodes(modified, isLoraLoaderNode);
      for (const loraNodeId of existingLoraNodes) {
        delete modified[loraNodeId];
      }

      // Add new LoRA nodes
      // First, find the model and clip source nodes
      const modelNodeId = this.findNode(modified, isModelLoaderNode);
      const clipNodeId = this.findNode(modified, isCLIPLoaderNode);

      if (modelNodeId && clipNodeId) {
        let currentModelSource = [modelNodeId, 0];
        let currentClipSource = [clipNodeId, 0];

        // Create a new LoRA node for each LoRA in the override
        let loraNodeCounter = 1000; // Use high numbers to avoid conflicts
        for (const lora of overrides.lora) {
          const loraNodeId = loraNodeCounter.toString();
          modified[loraNodeId] = {
            inputs: {
              lora_name: lora.name,
              strength_model: lora.strength_model,
              strength_clip: lora.strength_clip,
              model: currentModelSource,
              clip: currentClipSource
            },
            class_type: 'LoraLoader',
            _meta: { title: `Load LoRA: ${lora.name}` }
          };

          // Update sources for next LoRA or sampler
          currentModelSource = [loraNodeId, 0];
          currentClipSource = [loraNodeId, 1];
          loraNodeCounter++;
        }

        // Update sampler nodes to use the last LoRA's output
        const samplerNodes = this.findAllNodes(modified, isSamplerNode);
        for (const samplerNodeId of samplerNodes) {
          modified[samplerNodeId].inputs.model = currentModelSource;
        }

        // Update CLIP text encode nodes to use the last LoRA's CLIP output
        const positiveNodeId = this.findNode(modified, isPositivePromptNode);
        const negativeNodeId = this.findNode(modified, isNegativePromptNode);
        if (positiveNodeId) {
          modified[positiveNodeId].inputs.clip = currentClipSource;
        }
        if (negativeNodeId) {
          modified[negativeNodeId].inputs.clip = currentClipSource;
        }
      }
    }

    // Override width/height (for EmptyLatentImage nodes)
    if (overrides.width !== undefined || overrides.height !== undefined) {
      const latentNode = this.findNode(modified, (node) => node.class_type === 'EmptyLatentImage');
      if (latentNode) {
        if (overrides.width !== undefined) {
          modified[latentNode].inputs.width = overrides.width;
        }
        if (overrides.height !== undefined) {
          modified[latentNode].inputs.height = overrides.height;
        }
      }
    }

    // Override batch size
    if (overrides.batch_size !== undefined) {
      const latentNode = this.findNode(modified, (node) => node.class_type === 'EmptyLatentImage');
      if (latentNode) {
        modified[latentNode].inputs.batch_size = overrides.batch_size;
      }
    }

    return modified;
  }

  /**
   * Parse workflow from string or object
   */
  parseWorkflow(workflow: string | object): Workflow {
    if (typeof workflow === 'string') {
      return JSON.parse(workflow) as Workflow;
    }
    return workflow as Workflow;
  }

  /**
   * Generate a brief summary of a workflow
   */
  generateSummary(workflow: Workflow): string {
    const nodeTypes = new Set<string>();
    for (const node of Object.values(workflow)) {
      nodeTypes.add(node.class_type);
    }

    const summaryParts: string[] = [];

    if (nodeTypes.has('KSampler')) {
      summaryParts.push('generation');
    }
    if (nodeTypes.has('LoadImage')) {
      summaryParts.push('img2img');
    }
    if (nodeTypes.has('UNETLoader')) {
      summaryParts.push('custom model');
    }
    if (nodeTypes.has('LoraLoader')) {
      summaryParts.push('with LoRA');
    }

    return summaryParts.length > 0 ? summaryParts.join(', ') : 'workflow';
  }
}
