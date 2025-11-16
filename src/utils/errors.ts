export type ErrorType = "validation" | "connection" | "execution" | "filesystem";

export interface ComfyUIError {
  error: {
    type: ErrorType;
    code: string;
    message: string;
    details?: any;
    suggestions: string[];
  };
}

export class ComfyUIErrorBuilder {
  static connectionError(message: string, details?: any): ComfyUIError {
    return {
      error: {
        type: "connection",
        code: "COMFYUI_NOT_RUNNING",
        message,
        details,
        suggestions: [
          "Ensure ComfyUI is running (check run_nvidia_gpu.bat)",
          "Verify ComfyUI is using default port 8188",
          "Check if another application is using port 8188"
        ]
      }
    };
  }

  static modelNotFound(modelName: string, availableModels: string[]): ComfyUIError {
    return {
      error: {
        type: "validation",
        code: "MODEL_NOT_FOUND",
        message: `Model '${modelName}' not found in checkpoints folder`,
        details: {
          requested_model: modelName,
          available_models: availableModels
        },
        suggestions: [
          "Use comfy_list_models to see available models",
          "Check model name spelling",
          "Ensure model is in the correct directory"
        ]
      }
    };
  }

  static invalidWorkflow(message: string, details?: any): ComfyUIError {
    return {
      error: {
        type: "validation",
        code: "INVALID_WORKFLOW",
        message: `Workflow validation failed: ${message}`,
        details,
        suggestions: [
          "Check node connections in workflow JSON",
          "Verify node input/output types match",
          "Test workflow in ComfyUI interface first"
        ]
      }
    };
  }

  static fileNotFound(path: string): ComfyUIError {
    return {
      error: {
        type: "filesystem",
        code: "FILE_NOT_FOUND",
        message: `File not found: ${path}`,
        suggestions: [
          "Verify the file path is correct",
          "Check file exists at the specified location",
          "Ensure you have read permissions for the file"
        ]
      }
    };
  }

  static permissionDenied(path: string): ComfyUIError {
    return {
      error: {
        type: "filesystem",
        code: "PERMISSION_DENIED",
        message: `Permission denied accessing: ${path}`,
        suggestions: [
          "Check folder permissions",
          "Run as administrator if needed",
          "Verify paths are accessible"
        ]
      }
    };
  }

  static executionError(message: string, details?: any): ComfyUIError {
    return {
      error: {
        type: "execution",
        code: "EXECUTION_FAILED",
        message,
        details,
        suggestions: [
          "Check ComfyUI console for detailed error messages",
          "Verify all required models are loaded",
          "Ensure sufficient VRAM/memory is available"
        ]
      }
    };
  }

  static timeoutError(operation: string): ComfyUIError {
    return {
      error: {
        type: "connection",
        code: "TIMEOUT",
        message: `Operation timed out: ${operation}`,
        suggestions: [
          "Increase timeout value if needed",
          "Check ComfyUI is responding",
          "Verify network connection"
        ]
      }
    };
  }

  static validationError(message: string, details?: any): ComfyUIError {
    return {
      error: {
        type: "validation",
        code: "VALIDATION_ERROR",
        message,
        details,
        suggestions: [
          "Check the provided parameters",
          "Refer to tool documentation for valid inputs",
          "Ensure all required fields are provided"
        ]
      }
    };
  }
}
