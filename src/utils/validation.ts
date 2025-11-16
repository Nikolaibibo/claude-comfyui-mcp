import { existsSync } from 'fs';

export function validateWorkflowJSON(workflow: any): boolean {
  if (typeof workflow !== 'object' || workflow === null) {
    return false;
  }

  // Check if it has nodes
  if (Object.keys(workflow).length === 0) {
    return false;
  }

  // Validate each node has required fields
  for (const node of Object.values(workflow)) {
    if (typeof node !== 'object' || node === null) {
      return false;
    }

    const typedNode = node as any;
    if (!typedNode.class_type || !typedNode.inputs) {
      return false;
    }
  }

  return true;
}

export function validateFilePath(path: string): boolean {
  return existsSync(path);
}

export function validateImageFormat(filename: string): boolean {
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext);
}

export function validateWorkflowName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export function isPositivePromptNode(node: any): boolean {
  if (node.class_type !== 'CLIPTextEncode') return false;

  const title = node._meta?.title?.toLowerCase() || '';
  return title.includes('positive') || title === 'clip text encode (positive prompt)';
}

export function isNegativePromptNode(node: any): boolean {
  if (node.class_type !== 'CLIPTextEncode') return false;

  const title = node._meta?.title?.toLowerCase() || '';
  return title.includes('negative') || title === 'clip text encode (negative prompt)';
}

export function isSamplerNode(node: any): boolean {
  return ['KSampler', 'KSamplerAdvanced', 'SamplerCustom'].includes(node.class_type);
}

export function isImageLoaderNode(node: any): boolean {
  return ['LoadImage', 'LoadImageMask'].includes(node.class_type);
}

export function isModelLoaderNode(node: any): boolean {
  return ['CheckpointLoaderSimple', 'UNETLoader', 'CheckpointLoader'].includes(node.class_type);
}

export function isVAELoaderNode(node: any): boolean {
  return node.class_type === 'VAELoader';
}
