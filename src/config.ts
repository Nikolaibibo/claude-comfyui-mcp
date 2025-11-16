import { readFileSync } from 'fs';
import { join } from 'path';
import { ServerConfig, DEFAULT_CONFIG } from './types/config.js';

let config: ServerConfig = DEFAULT_CONFIG;

export function loadConfig(): ServerConfig {
  try {
    const configPath = process.env.COMFYUI_CONFIG || join(process.cwd(), 'config.json');
    const configData = readFileSync(configPath, 'utf-8');
    const loadedConfig = JSON.parse(configData);

    // Merge with defaults
    config = {
      ...DEFAULT_CONFIG,
      ...loadedConfig,
      comfyui: {
        ...DEFAULT_CONFIG.comfyui,
        ...(loadedConfig.comfyui || {})
      },
      paths: {
        ...DEFAULT_CONFIG.paths,
        ...(loadedConfig.paths || {})
      },
      templates: {
        ...DEFAULT_CONFIG.templates,
        ...(loadedConfig.templates || {})
      },
      features: {
        ...DEFAULT_CONFIG.features,
        ...(loadedConfig.features || {})
      }
    };

    return config;
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

export function getConfig(): ServerConfig {
  return config;
}

export function getFullPath(relativePath: string): string {
  const cfg = getConfig();
  return join(cfg.comfyui.installation_path, relativePath);
}
