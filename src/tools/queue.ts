import { getComfyUIClient } from '../api/client.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';
import { CancelGenerationInput, ClearQueueInput } from '../types/tools.js';

export async function handleGetQueue() {
  try {
    const client = getComfyUIClient();
    const queue = await client.getQueue();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          running: queue.queue_running.map((item: any) => ({
            prompt_id: item[1],
            number: item[0],
            workflow_summary: "generation"
          })),
          pending: queue.queue_pending.map((item: any) => ({
            prompt_id: item[1],
            number: item[0],
            workflow_summary: "generation"
          })),
          summary: `${queue.queue_running.length} running, ${queue.queue_pending.length} pending`
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
        text: JSON.stringify(ComfyUIErrorBuilder.connectionError(error.message), null, 2)
      }],
      isError: true
    };
  }
}

export async function handleCancelGeneration(input: CancelGenerationInput) {
  try {
    const client = getComfyUIClient();

    if (input.prompt_id) {
      // Cancel specific prompt
      if (input.delete_from_queue) {
        await client.deleteQueueItem(input.prompt_id);
      }
      await client.interrupt();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            cancelled: true,
            prompt_id: input.prompt_id,
            message: `Generation ${input.prompt_id} cancelled`
          }, null, 2)
        }]
      };
    } else {
      // Interrupt current
      await client.interrupt();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            cancelled: true,
            message: "Current generation interrupted"
          }, null, 2)
        }]
      };
    }
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

export async function handleClearQueue(input: ClearQueueInput) {
  try {
    if (!input.confirm) {
      throw ComfyUIErrorBuilder.validationError(
        'Set confirm=true to clear the queue'
      );
    }

    const client = getComfyUIClient();
    const queue = await client.getQueue();
    const count = queue.queue_pending.length;

    await client.clearQueue();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          cleared: true,
          count,
          message: `Cleared ${count} pending items from queue`
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
