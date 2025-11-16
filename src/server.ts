import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { handleSubmitWorkflow, handleGenerateSimple } from './tools/generation.js';
import { handleGetStatus, handleWaitForCompletion } from './tools/status.js';
import { handleListModels } from './tools/models.js';
import {
  handleSaveWorkflow,
  handleLoadWorkflow,
  handleListWorkflows,
  handleDeleteWorkflow
} from './tools/workflows.js';
import {
  handleGetQueue,
  handleCancelGeneration,
  handleClearQueue
} from './tools/queue.js';
import { handleUploadImage, handleGetOutputImages } from './tools/utils.js';
import {
  SubmitWorkflowSchema,
  GenerateSimpleSchema,
  GetStatusSchema,
  WaitForCompletionSchema,
  ListModelsSchema,
  SaveWorkflowSchema,
  LoadWorkflowSchema,
  ListWorkflowsSchema,
  DeleteWorkflowSchema,
  CancelGenerationSchema,
  ClearQueueSchema,
  UploadImageSchema,
  GetOutputImagesSchema
} from './types/tools.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class ComfyUIMCPServer {
  private server: Server;

  constructor() {
    // Load configuration
    loadConfig();

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'comfyui-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'comfy_submit_workflow',
          description: 'Submit a complete workflow JSON to ComfyUI for execution. Supports parameter overrides for dynamic modifications without editing the workflow structure.',
          inputSchema: zodToJsonSchema(SubmitWorkflowSchema) as any,
        },
        {
          name: 'comfy_generate_simple',
          description: 'Quick image generation using pre-configured workflow templates (flux_txt2img, sd15_txt2img, sdxl_txt2img, basic_img2img). Ideal for common use cases without managing workflow JSON.',
          inputSchema: zodToJsonSchema(GenerateSimpleSchema) as any,
        },
        {
          name: 'comfy_get_status',
          description: 'Get the current status and progress of a specific generation or the overall queue. Returns queue position, progress, and output paths when available.',
          inputSchema: zodToJsonSchema(GetStatusSchema) as any,
        },
        {
          name: 'comfy_wait_for_completion',
          description: 'Block until a generation completes or fails. Returns final outputs with image paths. Useful for synchronous workflows.',
          inputSchema: zodToJsonSchema(WaitForCompletionSchema) as any,
        },
        {
          name: 'comfy_list_models',
          description: 'List available models, checkpoints, LoRAs, VAEs, and other resources in the ComfyUI models directory. Supports filtering by type and name.',
          inputSchema: zodToJsonSchema(ListModelsSchema) as any,
        },
        {
          name: 'comfy_save_workflow',
          description: 'Save a workflow JSON to the MCP library for later reuse. Includes metadata like description and tags for organization.',
          inputSchema: zodToJsonSchema(SaveWorkflowSchema) as any,
        },
        {
          name: 'comfy_load_workflow',
          description: 'Load a saved workflow from the MCP library by name. Returns the workflow JSON and metadata.',
          inputSchema: zodToJsonSchema(LoadWorkflowSchema) as any,
        },
        {
          name: 'comfy_list_workflows',
          description: 'List all saved workflows in the MCP library. Supports filtering by name, description, or tags.',
          inputSchema: zodToJsonSchema(ListWorkflowsSchema) as any,
        },
        {
          name: 'comfy_delete_workflow',
          description: 'Delete a saved workflow from the MCP library. Requires confirmation for safety.',
          inputSchema: zodToJsonSchema(DeleteWorkflowSchema) as any,
        },
        {
          name: 'comfy_get_queue',
          description: 'Get detailed information about the current generation queue, including running and pending items.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'comfy_cancel_generation',
          description: 'Cancel a specific generation or interrupt the currently executing generation. Can optionally remove from queue.',
          inputSchema: zodToJsonSchema(CancelGenerationSchema) as any,
        },
        {
          name: 'comfy_clear_queue',
          description: 'Clear all pending items from the queue (does not affect currently running generation). Requires confirmation.',
          inputSchema: zodToJsonSchema(ClearQueueSchema) as any,
        },
        {
          name: 'comfy_upload_image',
          description: 'Upload an image to ComfyUI\'s input folder for use in workflows. Supports custom filenames and overwrite control.',
          inputSchema: zodToJsonSchema(UploadImageSchema) as any,
        },
        {
          name: 'comfy_get_output_images',
          description: 'List recent output images from ComfyUI\'s output folder. Returns full Windows paths that Claude Desktop can read.',
          inputSchema: zodToJsonSchema(GetOutputImagesSchema) as any,
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'comfy_submit_workflow':
            return await handleSubmitWorkflow(args as any);

          case 'comfy_generate_simple':
            return await handleGenerateSimple(args as any);

          case 'comfy_get_status':
            return await handleGetStatus(args as any);

          case 'comfy_wait_for_completion':
            return await handleWaitForCompletion(args as any);

          case 'comfy_list_models':
            return await handleListModels(args as any);

          case 'comfy_save_workflow':
            return await handleSaveWorkflow(args as any);

          case 'comfy_load_workflow':
            return await handleLoadWorkflow(args as any);

          case 'comfy_list_workflows':
            return await handleListWorkflows(args as any);

          case 'comfy_delete_workflow':
            return await handleDeleteWorkflow(args as any);

          case 'comfy_get_queue':
            return await handleGetQueue();

          case 'comfy_cancel_generation':
            return await handleCancelGeneration(args as any);

          case 'comfy_clear_queue':
            return await handleClearQueue(args as any);

          case 'comfy_upload_image':
            return await handleUploadImage(args as any);

          case 'comfy_get_output_images':
            return await handleGetOutputImages(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ComfyUI MCP Server running on stdio');
  }
}
