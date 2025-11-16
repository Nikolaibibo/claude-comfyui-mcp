import { getComfyUIClient } from '../api/client.js';
import { getConfig } from '../config.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';
import { GetStatusInput, WaitForCompletionInput } from '../types/tools.js';

export async function handleGetStatus(input: GetStatusInput) {
  try {
    const client = getComfyUIClient();

    if (input.prompt_id) {
      // Get status for specific prompt
      const history = await client.getHistory(input.prompt_id);
      const queue = await client.getQueue();

      if (history[input.prompt_id]) {
        // Prompt has completed
        const historyItem = history[input.prompt_id];
        const outputs: any[] = [];

        if (input.include_outputs && historyItem.outputs) {
          for (const [nodeId, output] of Object.entries(historyItem.outputs)) {
            if (output.images) {
              const imagePaths = output.images.map((img: any) =>
                client.getOutputPath(img.filename)
              );
              outputs.push({
                images: imagePaths,
                node_id: nodeId,
                filename: output.images.map((img: any) => img.filename).join(', ')
              });
            }
          }
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              prompt_id: input.prompt_id,
              status: "completed",
              outputs: outputs.length > 0 ? outputs : undefined
            }, null, 2)
          }]
        };
      }

      // Check if in queue
      const allQueueItems = [...queue.queue_running, ...queue.queue_pending];
      const queueItem = allQueueItems.find((item: any) => item[1] === input.prompt_id);

      if (queueItem) {
        const isRunning = queue.queue_running.some((item: any) => item[1] === input.prompt_id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              prompt_id: input.prompt_id,
              status: isRunning ? "executing" : "queued",
              queue_position: queueItem[0]
            }, null, 2)
          }]
        };
      }

      // Not found
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            prompt_id: input.prompt_id,
            status: "not_found",
            message: "Prompt not found in queue or history"
          }, null, 2)
        }]
      };
    } else {
      // Get queue overview
      const queue = await client.getQueue();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            queue_running: queue.queue_running.map((item: any) => ({
              prompt_id: item[1],
              number: item[0]
            })),
            queue_pending: queue.queue_pending.map((item: any) => ({
              prompt_id: item[1],
              number: item[0]
            }))
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
        text: JSON.stringify(ComfyUIErrorBuilder.connectionError(error.message), null, 2)
      }],
      isError: true
    };
  }
}

export async function handleWaitForCompletion(input: WaitForCompletionInput) {
  try {
    const client = getComfyUIClient();
    const config = getConfig();
    const pollInterval = input.poll_interval || config.comfyui.poll_interval;
    const timeout = input.timeout || config.comfyui.timeout;
    const startTime = Date.now();

    // Poll for completion
    while (true) {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > timeout) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              prompt_id: input.prompt_id,
              status: "timeout",
              execution_time: elapsed,
              message: `Timeout after ${timeout} seconds`
            }, null, 2)
          }]
        };
      }

      // Check history
      const history = await client.getHistory(input.prompt_id);

      if (history[input.prompt_id]) {
        // Completed
        const historyItem = history[input.prompt_id];
        const outputs: any[] = [];

        if (historyItem.outputs) {
          for (const [nodeId, output] of Object.entries(historyItem.outputs)) {
            if (output.images) {
              const imagePaths = output.images.map((img: any) =>
                client.getOutputPath(img.filename)
              );
              outputs.push({
                images: imagePaths,
                node_id: nodeId,
                filename: output.images.map((img: any) => img.filename).join(', ')
              });
            }
          }
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              prompt_id: input.prompt_id,
              status: "completed",
              outputs,
              execution_time: elapsed
            }, null, 2)
          }]
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
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
