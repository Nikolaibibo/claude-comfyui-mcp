import { Workflow, WorkflowOverrides } from '../types/workflow.js';
import {
  isPositivePromptNode,
  isNegativePromptNode,
  isSamplerNode,
  isImageLoaderNode,
  isModelLoaderNode,
  isVAELoaderNode
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
