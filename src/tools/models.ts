import { scanModelsDirectory } from '../utils/filesystem.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';
import { ListModelsInput } from '../types/tools.js';

export async function handleListModels(input: ListModelsInput) {
  try {
    const type = input.type || 'all';
    const filter = input.filter;
    const includeSize = input.include_size || false;

    // Scan models directory
    let models = scanModelsDirectory(type);

    // Apply filter
    if (filter) {
      const filterLower = filter.toLowerCase();
      models = models.filter(model =>
        model.name.toLowerCase().includes(filterLower)
      );
    }

    // Remove size if not requested
    if (!includeSize) {
      models = models.map(({ size, ...rest }) => rest) as any;
    }

    // Generate summary
    const summary = `Found ${models.length} model(s)${type !== 'all' ? ` of type ${type}` : ''}${filter ? ` matching "${filter}"` : ''}`;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          models,
          total_count: models.length,
          summary
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
