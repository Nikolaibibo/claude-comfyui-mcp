import {
  saveWorkflowToLibrary,
  loadWorkflowFromLibrary,
  listWorkflowsInLibrary,
  deleteWorkflowFromLibrary
} from '../utils/filesystem.js';
import { validateWorkflowJSON, validateWorkflowName } from '../utils/validation.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';
import { WorkflowProcessor } from '../utils/workflow.js';
import {
  SaveWorkflowInput,
  LoadWorkflowInput,
  ListWorkflowsInput,
  DeleteWorkflowInput
} from '../types/tools.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { getFullPath, getConfig } from '../config.js';

export async function handleSaveWorkflow(input: SaveWorkflowInput) {
  try {
    // Validate workflow name
    if (!validateWorkflowName(input.name)) {
      throw ComfyUIErrorBuilder.validationError(
        'Invalid workflow name. Use only alphanumeric characters, hyphens, and underscores.'
      );
    }

    // Parse and validate workflow
    const processor = new WorkflowProcessor();
    const workflow = processor.parseWorkflow(input.workflow);

    if (!validateWorkflowJSON(workflow)) {
      throw ComfyUIErrorBuilder.invalidWorkflow('Invalid workflow structure');
    }

    // Check if exists and overwrite is false
    const config = getConfig();
    const libraryPath = getFullPath(config.paths.workflow_library);
    const filePath = join(libraryPath, `${input.name}.json`);

    if (existsSync(filePath) && !input.overwrite) {
      throw ComfyUIErrorBuilder.validationError(
        `Workflow "${input.name}" already exists. Set overwrite=true to replace it.`
      );
    }

    // Create metadata
    const now = new Date().toISOString();
    const metadata = {
      name: input.name,
      description: input.description,
      tags: input.tags || [],
      created_at: existsSync(filePath) ? JSON.parse(require('fs').readFileSync(filePath, 'utf-8')).created_at : now,
      updated_at: now,
      workflow
    };

    // Save to library
    const savedPath = saveWorkflowToLibrary(input.name, metadata);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: input.name,
          path: savedPath,
          message: `Workflow "${input.name}" saved successfully`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    if (error.error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify(error, null, 2)
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(ComfyUIErrorBuilder.executionError(error.message), null, 2)
      }],
      isError: true
    };
  }
}

export async function handleLoadWorkflow(input: LoadWorkflowInput) {
  try {
    const data = loadWorkflowFromLibrary(input.name);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: data.name,
          workflow: data.workflow,
          description: data.description,
          tags: data.tags,
          created_at: data.created_at,
          updated_at: data.updated_at
        }, null, 2)
      }]
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify(ComfyUIErrorBuilder.fileNotFound(input.name), null, 2)
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(ComfyUIErrorBuilder.executionError(error.message), null, 2)
      }],
      isError: true
    };
  }
}

export async function handleListWorkflows(input: ListWorkflowsInput) {
  try {
    const workflows = listWorkflowsInLibrary(input.filter, input.tags);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          workflows,
          total_count: workflows.length
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(ComfyUIErrorBuilder.executionError(error.message), null, 2)
      }],
      isError: true
    };
  }
}

export async function handleDeleteWorkflow(input: DeleteWorkflowInput) {
  try {
    if (!input.confirm) {
      throw ComfyUIErrorBuilder.validationError(
        'Set confirm=true to delete the workflow'
      );
    }

    deleteWorkflowFromLibrary(input.name);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: input.name,
          deleted: true,
          message: `Workflow "${input.name}" deleted successfully`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify(ComfyUIErrorBuilder.fileNotFound(input.name), null, 2)
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(ComfyUIErrorBuilder.executionError(error.message), null, 2)
      }],
      isError: true
    };
  }
}
