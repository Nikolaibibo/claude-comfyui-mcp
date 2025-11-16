import axios, { AxiosInstance } from 'axios';
import { getConfig, getFullPath } from '../config.js';
import { Workflow } from '../types/workflow.js';
import { ComfyUIPromptResponse, QueueResponse, HistoryResponse } from './types.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';

export class ComfyUIClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.comfyui.base_url;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.comfyui.timeout * 1000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Submit a workflow for execution
   */
  async submitWorkflow(workflow: Workflow, clientId?: string): Promise<ComfyUIPromptResponse> {
    try {
      const response = await this.client.post('/prompt', {
        prompt: workflow,
        client_id: clientId || this.generateClientId()
      });

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw ComfyUIErrorBuilder.connectionError(
          `Cannot connect to ComfyUI at ${this.baseUrl}`,
          { error: error.message }
        );
      }
      throw ComfyUIErrorBuilder.executionError(
        `Failed to submit workflow: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Get current queue status
   */
  async getQueue(): Promise<QueueResponse> {
    try {
      const response = await this.client.get('/queue');
      return response.data;
    } catch (error: any) {
      throw ComfyUIErrorBuilder.connectionError(
        `Failed to get queue status: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Get history for a specific prompt or all history
   */
  async getHistory(promptId?: string): Promise<HistoryResponse> {
    try {
      const endpoint = promptId ? `/history/${promptId}` : '/history';
      const response = await this.client.get(endpoint);
      return response.data;
    } catch (error: any) {
      throw ComfyUIErrorBuilder.connectionError(
        `Failed to get history: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Interrupt current execution
   */
  async interrupt(): Promise<void> {
    try {
      await this.client.post('/interrupt');
    } catch (error: any) {
      throw ComfyUIErrorBuilder.connectionError(
        `Failed to interrupt execution: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Delete item from queue
   */
  async deleteQueueItem(promptId: string): Promise<void> {
    try {
      await this.client.post('/queue', {
        delete: [promptId]
      });
    } catch (error: any) {
      throw ComfyUIErrorBuilder.connectionError(
        `Failed to delete queue item: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    try {
      await this.client.post('/queue', {
        clear: true
      });
    } catch (error: any) {
      throw ComfyUIErrorBuilder.connectionError(
        `Failed to clear queue: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Get object info (node types and their parameters)
   */
  async getObjectInfo(): Promise<any> {
    try {
      const response = await this.client.get('/object_info');
      return response.data;
    } catch (error: any) {
      throw ComfyUIErrorBuilder.connectionError(
        `Failed to get object info: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Check if ComfyUI is running and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/queue');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get full path to output image
   */
  getOutputPath(filename: string): string {
    const config = getConfig();
    return getFullPath(`${config.paths.output}\\${filename}`);
  }
}

// Singleton instance
let clientInstance: ComfyUIClient | null = null;

export function getComfyUIClient(): ComfyUIClient {
  if (!clientInstance) {
    clientInstance = new ComfyUIClient();
  }
  return clientInstance;
}
