import { getComfyUIClient } from '../api/client.js';
import { WorkflowProcessor } from '../utils/workflow.js';
import { validateWorkflowJSON } from '../utils/validation.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';
import { SubmitWorkflowInput, GenerateSimpleInput } from '../types/tools.js';
import { getTemplateBuilder } from '../templates/index.js';
import { uploadImage } from '../utils/filesystem.js';

export async function handleSubmitWorkflow(input: SubmitWorkflowInput) {
  try {
    const client = getComfyUIClient();
    const processor = new WorkflowProcessor();

    // Parse workflow
    const workflow = processor.parseWorkflow(input.workflow);

    // Validate workflow
    if (!validateWorkflowJSON(workflow)) {
      throw ComfyUIErrorBuilder.invalidWorkflow('Invalid workflow structure');
    }

    // Apply overrides
    const modifiedWorkflow = await processor.applyOverrides(workflow, input.overrides);

    // Submit to ComfyUI
    const response = await client.submitWorkflow(modifiedWorkflow, input.client_id);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          prompt_id: response.prompt_id,
          number: response.number,
          status: response.node_errors ? "failed" : "queued",
          message: response.node_errors
            ? "Workflow validation failed"
            : `Workflow queued successfully at position ${response.number}`,
          node_errors: response.node_errors
        }, null, 2)
      }]
    };
  } catch (error: any) {
    if (error.error) {
      // Already a ComfyUIError
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

export async function handleGenerateSimple(input: GenerateSimpleInput) {
  try {
    const client = getComfyUIClient();

    // Get template builder
    const builder = getTemplateBuilder(input.template);
    if (!builder) {
      throw ComfyUIErrorBuilder.validationError(`Unknown template: ${input.template}`);
    }

    // Handle input image if needed
    let inputImage = input.input_image;
    if (input.template === 'basic_img2img') {
      if (!inputImage) {
        throw ComfyUIErrorBuilder.validationError('input_image is required for img2img template');
      }
      // Upload the image
      const uploadResult = uploadImage(inputImage);
      inputImage = uploadResult.filename;
    }

    // Build workflow from template
    const workflow = builder({
      prompt: input.prompt,
      negative_prompt: input.negative_prompt,
      width: input.width,
      height: input.height,
      steps: input.steps,
      cfg: input.cfg,
      seed: input.seed,
      sampler: input.sampler,
      scheduler: input.scheduler,
      model: input.model,
      denoise: input.denoise,
      batch_size: input.batch_size,
      input_image: inputImage
    });

    // Submit to ComfyUI
    const response = await client.submitWorkflow(workflow);

    const summary = `${input.template} generation: ${input.prompt.substring(0, 50)}...`;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          prompt_id: response.prompt_id,
          number: response.number,
          status: response.node_errors ? "failed" : "queued",
          message: response.node_errors
            ? "Generation failed"
            : `Generation queued successfully at position ${response.number}`,
          template_used: input.template,
          workflow_summary: summary
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
