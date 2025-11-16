import { uploadImage, getOutputImages } from '../utils/filesystem.js';
import { ComfyUIErrorBuilder } from '../utils/errors.js';
import { UploadImageInput, GetOutputImagesInput } from '../types/tools.js';

export async function handleUploadImage(input: UploadImageInput) {
  try {
    const result = uploadImage(input.image_path, input.filename, input.overwrite);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          filename: result.filename,
          path: result.path,
          size: result.size,
          message: `Image uploaded successfully as ${result.filename}`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify(ComfyUIErrorBuilder.fileNotFound(input.image_path), null, 2)
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

export async function handleGetOutputImages(input: GetOutputImagesInput) {
  try {
    const images = getOutputImages(input.limit, input.sort, input.filter);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          images,
          total_count: images.length
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
