import WebSocket from 'ws';
import { getConfig } from '../config.js';
import { WebSocketMessage, ProgressData } from './types.js';

export class ComfyUIWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private progressCallbacks: Map<string, (data: ProgressData) => void> = new Map();
  private completionCallbacks: Map<string, (data: any) => void> = new Map();

  constructor(clientId: string) {
    const config = getConfig();
    this.url = `${config.comfyui.websocket_url}?clientId=${clientId}`;
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.setupMessageHandlers();
          resolve();
        });

        this.ws.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.ws) return;

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;

    switch (type) {
      case 'progress':
        // Progress update
        if (data.prompt_id) {
          const callback = this.progressCallbacks.get(data.prompt_id);
          if (callback) {
            callback({
              value: data.value || 0,
              max: data.max || 0
            });
          }
        }
        break;

      case 'executing':
        // Node execution started/completed
        if (data.node === null && data.prompt_id) {
          // Execution completed
          const callback = this.completionCallbacks.get(data.prompt_id);
          if (callback) {
            callback(data);
            this.completionCallbacks.delete(data.prompt_id);
          }
        }
        break;

      case 'executed':
        // Node execution result
        break;

      case 'execution_start':
        // Execution started
        break;

      case 'execution_cached':
        // Execution used cached results
        break;

      case 'execution_error':
        // Execution error occurred
        console.error('Execution error:', data);
        break;

      default:
        // Unknown message type
        break;
    }
  }

  /**
   * Register progress callback for a prompt
   */
  onProgress(promptId: string, callback: (data: ProgressData) => void): void {
    this.progressCallbacks.set(promptId, callback);
  }

  /**
   * Register completion callback for a prompt
   */
  onCompletion(promptId: string, callback: (data: any) => void): void {
    this.completionCallbacks.set(promptId, callback);
  }

  /**
   * Wait for prompt completion
   */
  async waitForCompletion(promptId: string, timeout: number = 300): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.completionCallbacks.delete(promptId);
        reject(new Error('Timeout waiting for completion'));
      }, timeout * 1000);

      this.onCompletion(promptId, () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.progressCallbacks.clear();
    this.completionCallbacks.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
