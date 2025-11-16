import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, basename, extname } from 'path';
import { getFullPath, getConfig } from '../config.js';
import { validateImageFormat, sanitizeFilename } from './validation.js';

export interface ModelInfo {
  type: string;
  name: string;
  path: string;
  size?: number;
}

export interface ImageInfo {
  filename: string;
  path: string;
  size: number;
  created_at: string;
  modified_at: string;
}

const MODEL_EXTENSIONS = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin'];

export function scanModelsDirectory(type: string): ModelInfo[] {
  const config = getConfig();
  const basePath = getFullPath(config.paths.models);

  const typeMapping: Record<string, string> = {
    checkpoints: 'checkpoints',
    loras: 'loras',
    vae: 'vae',
    clip: 'clip',
    clip_vision: 'clip_vision',
    unet: 'unet',
    embeddings: 'embeddings',
    upscale_models: 'upscale_models',
    diffusion_models: 'diffusion_models',
    controlnet: 'controlnet',
    ipadapter: 'ipadapter',
    style_models: 'style_models',
    photomaker: 'photomaker',
    insightface: 'insightface'
  };

  const results: ModelInfo[] = [];

  const scanDir = (dir: string, modelType: string): void => {
    if (!existsSync(dir)) return;

    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath, modelType);
        } else {
          const ext = extname(file).toLowerCase();
          if (MODEL_EXTENSIONS.includes(ext)) {
            results.push({
              type: modelType,
              name: file,
              path: fullPath.replace(basePath + '\\', ''),
              size: stat.size
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  };

  if (type === 'all') {
    for (const [key, subdir] of Object.entries(typeMapping)) {
      scanDir(join(basePath, subdir), key);
    }
  } else {
    const subdir = typeMapping[type];
    if (subdir) {
      scanDir(join(basePath, subdir), type);
    }
  }

  return results;
}

export function uploadImage(sourcePath: string, filename?: string, overwrite: boolean = false): { filename: string; path: string; size: number } {
  const config = getConfig();
  const inputDir = getFullPath(config.paths.input);

  // Ensure input directory exists
  if (!existsSync(inputDir)) {
    mkdirSync(inputDir, { recursive: true });
  }

  // Validate source file
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  // Determine target filename
  let targetFilename = filename || basename(sourcePath);
  targetFilename = sanitizeFilename(targetFilename);

  // Validate image format
  if (!validateImageFormat(targetFilename)) {
    throw new Error(`Invalid image format: ${targetFilename}`);
  }

  // Handle existing file
  let targetPath = join(inputDir, targetFilename);
  if (existsSync(targetPath) && !overwrite) {
    const ext = extname(targetFilename);
    const nameWithoutExt = basename(targetFilename, ext);
    let counter = 1;
    do {
      targetFilename = `${nameWithoutExt}_${counter}${ext}`;
      targetPath = join(inputDir, targetFilename);
      counter++;
    } while (existsSync(targetPath));
  }

  // Copy file
  copyFileSync(sourcePath, targetPath);
  const stat = statSync(targetPath);

  return {
    filename: targetFilename,
    path: targetPath,
    size: stat.size
  };
}

export function getOutputImages(limit: number = 20, sort: 'newest' | 'oldest' | 'name' = 'newest', filter?: string): ImageInfo[] {
  const config = getConfig();
  const outputDir = getFullPath(config.paths.output);

  if (!existsSync(outputDir)) {
    return [];
  }

  const files = readdirSync(outputDir);
  const images: ImageInfo[] = [];

  for (const file of files) {
    if (filter && !file.includes(filter)) continue;
    if (!validateImageFormat(file)) continue;

    const fullPath = join(outputDir, file);
    const stat = statSync(fullPath);

    if (stat.isFile()) {
      images.push({
        filename: file,
        path: fullPath,
        size: stat.size,
        created_at: stat.birthtime.toISOString(),
        modified_at: stat.mtime.toISOString()
      });
    }
  }

  // Sort
  if (sort === 'newest') {
    images.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === 'oldest') {
    images.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else {
    images.sort((a, b) => a.filename.localeCompare(b.filename));
  }

  return images.slice(0, limit);
}

export function ensureWorkflowLibraryExists(): void {
  const config = getConfig();
  const libraryPath = getFullPath(config.paths.workflow_library);

  if (!existsSync(libraryPath)) {
    mkdirSync(libraryPath, { recursive: true });
  }
}

export function saveWorkflowToLibrary(name: string, data: any): string {
  ensureWorkflowLibraryExists();

  const config = getConfig();
  const libraryPath = getFullPath(config.paths.workflow_library);
  const filePath = join(libraryPath, `${name}.json`);

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return filePath;
}

export function loadWorkflowFromLibrary(name: string): any {
  const config = getConfig();
  const libraryPath = getFullPath(config.paths.workflow_library);
  const filePath = join(libraryPath, `${name}.json`);

  if (!existsSync(filePath)) {
    throw new Error(`Workflow not found: ${name}`);
  }

  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

export function listWorkflowsInLibrary(filter?: string, tags?: string[]): any[] {
  ensureWorkflowLibraryExists();

  const config = getConfig();
  const libraryPath = getFullPath(config.paths.workflow_library);
  const files = readdirSync(libraryPath);

  const workflows = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = join(libraryPath, file);
    const stat = statSync(filePath);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Apply filters
    if (filter && !data.name?.includes(filter) && !data.description?.includes(filter)) {
      continue;
    }

    if (tags && tags.length > 0) {
      const workflowTags = data.tags || [];
      if (!tags.some((tag: string) => workflowTags.includes(tag))) {
        continue;
      }
    }

    workflows.push({
      name: data.name,
      description: data.description,
      tags: data.tags,
      created_at: data.created_at,
      updated_at: data.updated_at,
      size: stat.size
    });
  }

  return workflows;
}

export function deleteWorkflowFromLibrary(name: string): void {
  const config = getConfig();
  const libraryPath = getFullPath(config.paths.workflow_library);
  const filePath = join(libraryPath, `${name}.json`);

  if (!existsSync(filePath)) {
    throw new Error(`Workflow not found: ${name}`);
  }

  unlinkSync(filePath);
}
