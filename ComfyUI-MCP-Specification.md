# ComfyUI MCP Server Specification

**Version:** 1.0  
**Target Platform:** Windows 11  
**ComfyUI Installation:** `C:\Users\nbock\Documents\AI\ComfyUI_windows_portable\`  
**Language:** TypeScript  
**Transport:** stdio (local connection)  
**SDK:** MCP TypeScript SDK

---

## 1. Executive Summary

### 1.1 Purpose
This MCP server enables Claude Desktop to interact with a local ComfyUI installation, allowing AI-assisted image generation through both simple templates and advanced custom workflows. The server bridges Claude's conversational interface with ComfyUI's powerful node-based generation pipeline.

### 1.2 Key Capabilities
- Submit custom workflow JSON with parameter overrides
- Execute template-based simple generations (txt2img, img2img)
- Monitor generation progress in real-time
- Manage workflow library for reusable configurations
- Browse available models, checkpoints, LoRAs, and VAEs
- Queue management and status monitoring
- Return image paths for Claude Desktop to display

### 1.3 Architecture Overview
```
Claude Desktop (Windows) <--stdio--> MCP Server <--HTTP/WebSocket--> ComfyUI API (localhost:8188)
                                          |
                                          v
                                    File System
                                    - Read models
                                    - Write inputs
                                    - Read outputs
```

---

## 2. Technical Architecture

### 2.1 System Components

#### ComfyUI API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/prompt` | POST | Submit workflow for execution |
| `/queue` | GET | Get current queue status |
| `/history` | GET | Get generation history |
| `/history/{prompt_id}` | GET | Get specific generation result |
| `/interrupt` | POST | Cancel current generation |
| `/object_info` | GET | Get node type information |
| `/embeddings` | GET | List available embeddings |
| `/extensions` | GET | List installed extensions |
| `/upload/image` | POST | Upload input image |

#### WebSocket Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/ws?clientId={id}` | Real-time progress updates and queue events |

### 2.2 Directory Structure

```
C:\Users\nbock\Documents\AI\ComfyUI_windows_portable\
├── ComfyUI\
│   ├── models\
│   │   ├── checkpoints\      # SD, Flux, QWEN models
│   │   ├── loras\            # LoRA files
│   │   ├── vae\              # VAE models
│   │   ├── clip\             # CLIP models
│   │   ├── clip_vision\      # CLIP Vision models
│   │   ├── unet\             # UNet models
│   │   └── ...               # Other model types
│   ├── input\                # Input images (MCP uploads here)
│   ├── output\               # Generated images
│   └── user\
│       └── default\
│           └── workflows\    # Optional: saved workflows
└── python_embeded\           # Python environment
```

### 2.3 File Path Conventions

**Input Images:**
- MCP uploads to: `C:\Users\nbock\Documents\AI\ComfyUI_windows_portable\ComfyUI\input\`
- Workflow references: Just filename (e.g., `"image.png"`)

**Output Images:**
- ComfyUI saves to: `C:\Users\nbock\Documents\AI\ComfyUI_windows_portable\ComfyUI\output\`
- MCP returns full path: `C:\Users\nbock\Documents\AI\ComfyUI_windows_portable\ComfyUI\output\Chrono_Edit_14B_00001.png`
- Claude Desktop can read these paths directly

**Workflow Library (Optional):**
- Storage: `C:\Users\nbock\Documents\AI\ComfyUI_windows_portable\ComfyUI\user\default\workflows\mcp_library\`
- Format: `{workflow_name}.json`

---

## 3. MCP Tools Specification

### 3.1 Core Generation Tools

#### Tool: `comfy_submit_workflow`

**Description:**  
Submit a complete workflow JSON to ComfyUI for execution. Supports parameter overrides for dynamic modifications without editing the workflow structure.

**Input Schema:**
```typescript
{
  workflow: string | object,        // JSON string or object
  overrides?: {
    positive_prompt?: string,       // Override positive prompt (auto-detects CLIPTextEncode node)
    negative_prompt?: string,       // Override negative prompt
    seed?: number,                  // Override seed value
    steps?: number,                 // Override sampling steps
    cfg?: number,                   // Override CFG scale
    sampler_name?: string,          // Override sampler
    scheduler?: string,             // Override scheduler
    width?: number,                 // Override width
    height?: number,                // Override height
    denoise?: number,               // Override denoise strength (0.0-1.0)
    input_image?: string,           // Path to input image (will be uploaded)
    batch_size?: number,            // Override batch size
    model?: string,                 // Override model/checkpoint name
    vae?: string,                   // Override VAE name
    lora?: {                        // Override LoRA settings
      name: string,
      strength_model: number,
      strength_clip: number
    }[]
  },
  client_id?: string               // Optional client ID for tracking
}
```

**Output Schema:**
```typescript
{
  prompt_id: string,               // Unique identifier for this generation
  number: number,                  // Queue position
  status: string,                  // "queued" | "executing" | "completed" | "failed"
  message: string,                 // Human-readable status message
  node_errors?: object            // Validation errors if any
}
```

**Implementation Notes:**
- Parse workflow JSON if provided as string
- Use smart node detection to apply overrides:
  - Find `CLIPTextEncode` nodes for prompts (check `_meta.title` or `class_type`)
  - Find `KSampler` nodes for sampling parameters
  - Find `LoadImage` nodes for input images
  - Find model loader nodes (`CheckpointLoaderSimple`, `UNETLoader`, etc.)
- If input_image provided: upload to ComfyUI input folder first
- Generate unique client_id if not provided
- Return prompt_id for status tracking
- Handle node validation errors gracefully

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false
}
```

---

#### Tool: `comfy_generate_simple`

**Description:**  
Quick image generation using pre-configured workflow templates. Ideal for common use cases without needing to manage workflow JSON.

**Input Schema:**
```typescript
{
  prompt: string,                  // Positive prompt (required)
  negative_prompt?: string,        // Negative prompt (default: standard negative)
  template: "flux_txt2img" | "sd15_txt2img" | "sdxl_txt2img" | "basic_img2img",
  model?: string,                  // Model name (uses template default if not specified)
  input_image?: string,            // Required for img2img, path to image
  width?: number,                  // Default: 1024 (Flux/SDXL), 512 (SD1.5)
  height?: number,                 // Default: 1024 (Flux/SDXL), 512 (SD1.5)
  steps?: number,                  // Default: 20
  cfg?: number,                    // Default: 7.0 (SD), 3.5 (Flux)
  seed?: number,                   // Default: random
  sampler?: string,                // Default: template-specific
  scheduler?: string,              // Default: template-specific
  denoise?: number,                // For img2img, default: 0.75
  batch_size?: number              // Default: 1
}
```

**Output Schema:**
```typescript
{
  prompt_id: string,
  number: number,
  status: string,
  message: string,
  template_used: string,
  workflow_summary: string        // Brief description of what was configured
}
```

**Template Specifications:**

**flux_txt2img:**
- Model: Latest Flux dev/schnell in checkpoints folder
- Sampler: euler
- Scheduler: simple
- CFG: 3.5
- Steps: 20
- Resolution: 1024x1024

**sd15_txt2img:**
- Model: Latest SD 1.5 checkpoint
- Sampler: dpmpp_2m
- Scheduler: karras
- CFG: 7.0
- Steps: 20
- Resolution: 512x512

**sdxl_txt2img:**
- Model: Latest SDXL checkpoint
- Sampler: dpmpp_2m_sde
- Scheduler: karras
- CFG: 7.0
- Steps: 20
- Resolution: 1024x1024

**basic_img2img:**
- Model: Auto-detect based on input resolution
- Sampler: dpmpp_2m
- Scheduler: karras
- CFG: 7.0
- Steps: 20
- Denoise: 0.75
- Resolution: Match input image

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false
}
```

---

### 3.2 Status and Monitoring Tools

#### Tool: `comfy_get_status`

**Description:**  
Get the current status and progress of a specific generation or the overall queue.

**Input Schema:**
```typescript
{
  prompt_id?: string,              // Specific generation (omit for queue overview)
  include_outputs?: boolean        // Include output file paths (default: true)
}
```

**Output Schema:**
```typescript
{
  // If prompt_id provided:
  prompt_id: string,
  status: "queued" | "executing" | "completed" | "failed",
  queue_position?: number,         // If still queued
  progress?: {
    value: number,                 // Current step
    max: number,                   // Total steps
    percentage: number             // 0-100
  },
  outputs?: {
    images: string[],              // Full Windows paths to generated images
    node_id: string,               // Node that generated the output
    filename: string               // Just the filename
  }[],
  error?: string,                  // Error message if failed
  execution_time?: number,         // Seconds (if completed)
  
  // If no prompt_id (queue overview):
  queue_running: object[],         // Currently executing items
  queue_pending: object[]          // Pending items
}
```

**Implementation Notes:**
- Use `/history/{prompt_id}` for completed generations
- Use `/queue` for queue status
- Parse output paths from history
- Calculate progress percentage
- Handle WebSocket updates if available

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

#### Tool: `comfy_wait_for_completion`

**Description:**  
Block until a generation completes or fails. Returns final outputs. Useful for synchronous workflows.

**Input Schema:**
```typescript
{
  prompt_id: string,
  timeout?: number,                // Seconds (default: 300)
  poll_interval?: number           // Seconds between checks (default: 2)
}
```

**Output Schema:**
```typescript
{
  prompt_id: string,
  status: "completed" | "failed" | "timeout",
  outputs?: {
    images: string[],
    node_id: string,
    filename: string
  }[],
  error?: string,
  execution_time: number
}
```

**Implementation Notes:**
- Poll `/history/{prompt_id}` at intervals
- Alternatively: use WebSocket for real-time updates
- Timeout after specified duration
- Return all output image paths

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

### 3.3 Model and Resource Management

#### Tool: `comfy_list_models`

**Description:**  
List available models, checkpoints, LoRAs, VAEs, and other resources in the ComfyUI models directory.

**Input Schema:**
```typescript
{
  type?: "checkpoints" | "loras" | "vae" | "clip" | "clip_vision" | 
         "unet" | "embeddings" | "upscale_models" | "all",
  filter?: string,                 // Name filter (case-insensitive substring match)
  include_size?: boolean           // Include file sizes (default: false)
}
```

**Output Schema:**
```typescript
{
  models: {
    type: string,
    name: string,
    path: string,                  // Relative to models folder
    size?: number                  // Bytes (if requested)
  }[],
  total_count: number,
  summary: string                  // Human-readable summary
}
```

**Directory Mapping:**
```typescript
{
  checkpoints: "models/checkpoints",
  loras: "models/loras",
  vae: "models/vae",
  clip: "models/clip",
  clip_vision: "models/clip_vision",
  unet: "models/unet",
  embeddings: "models/embeddings",
  upscale_models: "models/upscale_models"
}
```

**Implementation Notes:**
- Scan filesystem directories
- Support common extensions: .safetensors, .ckpt, .pt, .pth, .bin
- Return just filename for workflow compatibility
- Cache results for performance (invalidate on demand)

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

### 3.4 Workflow Library Tools

#### Tool: `comfy_save_workflow`

**Description:**  
Save a workflow JSON to the MCP library for later reuse.

**Input Schema:**
```typescript
{
  name: string,                    // Workflow name (alphanumeric, hyphens, underscores)
  workflow: string | object,       // Workflow JSON
  description?: string,            // Optional description
  tags?: string[],                 // Optional tags for organization
  overwrite?: boolean              // Allow overwriting existing (default: false)
}
```

**Output Schema:**
```typescript
{
  name: string,
  path: string,                    // Full path to saved file
  message: string
}
```

**Implementation Notes:**
- Validate workflow JSON structure
- Store in: `ComfyUI\user\default\workflows\mcp_library\{name}.json`
- Include metadata wrapper:
```json
{
  "name": "...",
  "description": "...",
  "tags": [...],
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "workflow": { /* actual workflow */ }
}
```

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true
}
```

---

#### Tool: `comfy_load_workflow`

**Description:**  
Load a saved workflow from the MCP library.

**Input Schema:**
```typescript
{
  name: string                     // Workflow name
}
```

**Output Schema:**
```typescript
{
  name: string,
  workflow: object,                // Workflow JSON
  description?: string,
  tags?: string[],
  created_at: string,
  updated_at: string
}
```

**Implementation Notes:**
- Read from MCP library directory
- Parse and return workflow object
- Include metadata

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

#### Tool: `comfy_list_workflows`

**Description:**  
List all saved workflows in the MCP library.

**Input Schema:**
```typescript
{
  filter?: string,                 // Name/description filter
  tags?: string[]                  // Filter by tags
}
```

**Output Schema:**
```typescript
{
  workflows: {
    name: string,
    description?: string,
    tags?: string[],
    created_at: string,
    updated_at: string,
    size: number                   // File size in bytes
  }[],
  total_count: number
}
```

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

#### Tool: `comfy_delete_workflow`

**Description:**  
Delete a saved workflow from the MCP library.

**Input Schema:**
```typescript
{
  name: string,
  confirm?: boolean                // Safety confirmation (default: false)
}
```

**Output Schema:**
```typescript
{
  name: string,
  deleted: boolean,
  message: string
}
```

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true
}
```

---

### 3.5 Queue Management Tools

#### Tool: `comfy_get_queue`

**Description:**  
Get detailed information about the current generation queue.

**Input Schema:**
```typescript
{} // No parameters
```

**Output Schema:**
```typescript
{
  running: {
    prompt_id: string,
    number: number,
    workflow_summary: string       // Brief description
  }[],
  pending: {
    prompt_id: string,
    number: number,
    workflow_summary: string
  }[],
  summary: string                  // Human-readable queue status
}
```

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

#### Tool: `comfy_cancel_generation`

**Description:**  
Cancel a specific generation or interrupt the currently executing generation.

**Input Schema:**
```typescript
{
  prompt_id?: string,              // Specific generation (omit to interrupt current)
  delete_from_queue?: boolean      // Also remove from queue (default: true)
}
```

**Output Schema:**
```typescript
{
  cancelled: boolean,
  prompt_id?: string,
  message: string
}
```

**Implementation Notes:**
- Use `/interrupt` POST to stop current execution
- Use `/queue` DELETE with prompt_id to remove from queue
- Handle both running and queued generations

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false
}
```

---

#### Tool: `comfy_clear_queue`

**Description:**  
Clear all pending items from the queue (does not affect currently running generation).

**Input Schema:**
```typescript
{
  confirm?: boolean                // Safety confirmation (default: false)
}
```

**Output Schema:**
```typescript
{
  cleared: boolean,
  count: number,                   // Number of items cleared
  message: string
}
```

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false
}
```

---

### 3.6 Utility Tools

#### Tool: `comfy_upload_image`

**Description:**  
Upload an image to ComfyUI's input folder for use in workflows.

**Input Schema:**
```typescript
{
  image_path: string,              // Local path to image
  filename?: string,               // Optional: custom filename (default: preserve original)
  overwrite?: boolean              // Overwrite if exists (default: false)
}
```

**Output Schema:**
```typescript
{
  filename: string,                // Filename in ComfyUI input folder
  path: string,                    // Full path
  size: number,                    // File size in bytes
  message: string
}
```

**Implementation Notes:**
- Support common formats: PNG, JPG, JPEG, WEBP, BMP
- Copy to: `ComfyUI\input\{filename}`
- Generate unique filename if overwrite=false and file exists
- Validate image format

**Annotations:**
```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true
}
```

---

#### Tool: `comfy_get_output_images`

**Description:**  
List recent output images from ComfyUI's output folder.

**Input Schema:**
```typescript
{
  limit?: number,                  // Max results (default: 20)
  sort?: "newest" | "oldest" | "name",
  filter?: string                  // Filename filter
}
```

**Output Schema:**
```typescript
{
  images: {
    filename: string,
    path: string,                  // Full Windows path
    size: number,
    created_at: string,            // ISO timestamp
    modified_at: string
  }[],
  total_count: number
}
```

**Annotations:**
```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
}
```

---

## 4. Workflow Override System

### 4.1 Node Detection Strategy

The override system intelligently identifies nodes based on `class_type` and `_meta.title`:

**Prompt Nodes:**
```typescript
// Positive prompt detection
class_type === "CLIPTextEncode" && (
  _meta.title.includes("Positive") || 
  inputs.text !== negative_text
)

// Negative prompt detection
class_type === "CLIPTextEncode" && (
  _meta.title.includes("Negative") || 
  inputs.text === known_negative_pattern
)
```

**Sampler Nodes:**
```typescript
class_type === "KSampler" || 
class_type === "KSamplerAdvanced" ||
class_type === "SamplerCustom"
```

**Model Loaders:**
```typescript
class_type === "CheckpointLoaderSimple" ||
class_type === "UNETLoader" ||
class_type === "CheckpointLoader"
```

**Image Loaders:**
```typescript
class_type === "LoadImage" ||
class_type === "LoadImageMask"
```

**VAE Loaders:**
```typescript
class_type === "VAELoader"
```

### 4.2 Override Application Process

```typescript
function applyOverrides(workflow: object, overrides: object): object {
  const nodes = workflow;
  
  // 1. Detect relevant nodes
  const positiveNode = findNode(nodes, isPositivePrompt);
  const negativeNode = findNode(nodes, isNegativePrompt);
  const samplerNode = findNode(nodes, isSampler);
  // ... etc
  
  // 2. Apply overrides
  if (overrides.positive_prompt && positiveNode) {
    nodes[positiveNode].inputs.text = overrides.positive_prompt;
  }
  
  if (overrides.seed && samplerNode) {
    nodes[samplerNode].inputs.seed = overrides.seed;
  }
  
  // 3. Handle input images
  if (overrides.input_image) {
    const uploadResult = await uploadImage(overrides.input_image);
    const imageNode = findNode(nodes, isImageLoader);
    if (imageNode) {
      nodes[imageNode].inputs.image = uploadResult.filename;
    }
  }
  
  return nodes;
}
```

### 4.3 Multi-Node Handling

For workflows with multiple instances of the same node type:

**Strategy 1: First Match (Default)**
- Apply override to first detected node of that type

**Strategy 2: All Matches**
- For certain overrides (e.g., seed), apply to all sampler nodes
- Configurable per override type

**Strategy 3: Explicit Node ID**
- Advanced: allow specifying node ID in override
```typescript
overrides: {
  nodes: {
    "3": { seed: 12345 },         // Target specific node
    "6": { text: "new prompt" }
  }
}
```

---

## 5. Error Handling

### 5.1 Error Categories

**Validation Errors:**
- Invalid workflow JSON structure
- Missing required nodes
- Invalid parameter values
- Unsupported model references

**Connection Errors:**
- ComfyUI not running
- Port not accessible
- WebSocket connection failed
- Timeout errors

**Execution Errors:**
- Node execution failures
- Out of memory errors
- Model loading failures
- Invalid image formats

**File System Errors:**
- Path not accessible
- Insufficient permissions
- Disk space issues
- File not found

### 5.2 Error Response Format

```typescript
{
  error: {
    type: "validation" | "connection" | "execution" | "filesystem",
    code: string,                  // Machine-readable code
    message: string,               // Human-readable message
    details?: object,              // Additional context
    suggestions: string[]          // Actionable next steps
  }
}
```

### 5.3 Error Messages and Suggestions

**Example 1: ComfyUI Not Running**
```typescript
{
  error: {
    type: "connection",
    code: "COMFYUI_NOT_RUNNING",
    message: "Cannot connect to ComfyUI at http://127.0.0.1:8188",
    suggestions: [
      "Ensure ComfyUI is running (check run_nvidia_gpu.bat)",
      "Verify ComfyUI is using default port 8188",
      "Check if another application is using port 8188"
    ]
  }
}
```

**Example 2: Model Not Found**
```typescript
{
  error: {
    type: "validation",
    code: "MODEL_NOT_FOUND",
    message: "Model 'flux_dev_v2.safetensors' not found in checkpoints folder",
    details: {
      requested_model: "flux_dev_v2.safetensors",
      available_models: ["flux_dev.safetensors", "sdxl_base.safetensors"]
    },
    suggestions: [
      "Use comfy_list_models to see available models",
      "Check model name spelling",
      "Ensure model is in: C:\\Users\\nbock\\Documents\\AI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints"
    ]
  }
}
```

**Example 3: Invalid Workflow**
```typescript
{
  error: {
    type: "validation",
    code: "INVALID_WORKFLOW",
    message: "Workflow validation failed: node '5' has invalid connection",
    details: {
      node_id: "5",
      validation_error: "Input 'model' expects type 'MODEL' but received 'CLIP'"
    },
    suggestions: [
      "Check node connections in workflow JSON",
      "Verify node input/output types match",
      "Test workflow in ComfyUI interface first"
    ]
  }
}
```

---

## 6. Configuration

### 6.1 MCP Server Configuration

**File: `config.json`**
```json
{
  "comfyui": {
    "base_url": "http://127.0.0.1:8188",
    "websocket_url": "ws://127.0.0.1:8188/ws",
    "installation_path": "C:\\Users\\nbock\\Documents\\AI\\ComfyUI_windows_portable",
    "timeout": 300,
    "poll_interval": 2
  },
  "paths": {
    "models": "ComfyUI\\models",
    "input": "ComfyUI\\input",
    "output": "ComfyUI\\output",
    "workflow_library": "ComfyUI\\user\\default\\workflows\\mcp_library"
  },
  "templates": {
    "flux_txt2img": {
      "enabled": true,
      "default_model": "flux_dev.safetensors",
      "default_steps": 20,
      "default_cfg": 3.5,
      "default_sampler": "euler",
      "default_scheduler": "simple"
    },
    "sd15_txt2img": {
      "enabled": true,
      "default_model": "v1-5-pruned-emaonly.safetensors",
      "default_steps": 20,
      "default_cfg": 7.0,
      "default_sampler": "dpmpp_2m",
      "default_scheduler": "karras"
    },
    "sdxl_txt2img": {
      "enabled": true,
      "default_model": "sd_xl_base_1.0.safetensors",
      "default_steps": 20,
      "default_cfg": 7.0,
      "default_sampler": "dpmpp_2m_sde",
      "default_scheduler": "karras"
    },
    "basic_img2img": {
      "enabled": true,
      "default_steps": 20,
      "default_cfg": 7.0,
      "default_sampler": "dpmpp_2m",
      "default_scheduler": "karras",
      "default_denoise": 0.75
    }
  },
  "features": {
    "workflow_library": true,
    "auto_model_detection": true,
    "websocket_progress": true,
    "model_caching": true
  }
}
```

### 6.2 Claude Desktop Configuration

**File: `%APPDATA%\Claude\claude_desktop_config.json`**
```json
{
  "mcpServers": {
    "comfyui": {
      "command": "node",
      "args": [
        "C:\\path\\to\\comfyui-mcp\\dist\\index.js"
      ],
      "env": {
        "COMFYUI_CONFIG": "C:\\path\\to\\comfyui-mcp\\config.json"
      }
    }
  }
}
```

---

## 7. Implementation Guidelines

### 7.1 Project Structure

```
comfyui-mcp/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── server.ts                # MCP server setup
│   ├── config.ts                # Configuration management
│   ├── api/
│   │   ├── client.ts            # ComfyUI HTTP client
│   │   ├── websocket.ts         # WebSocket handler
│   │   └── types.ts             # API type definitions
│   ├── tools/
│   │   ├── generation.ts        # submit_workflow, generate_simple
│   │   ├── status.ts            # get_status, wait_for_completion
│   │   ├── models.ts            # list_models
│   │   ├── workflows.ts         # Workflow library tools
│   │   ├── queue.ts             # Queue management
│   │   └── utils.ts             # upload_image, get_output_images
│   ├── templates/
│   │   ├── flux_txt2img.ts      # Flux template
│   │   ├── sd15_txt2img.ts      # SD 1.5 template
│   │   ├── sdxl_txt2img.ts      # SDXL template
│   │   └── basic_img2img.ts     # img2img template
│   ├── utils/
│   │   ├── workflow.ts          # Workflow parsing and override logic
│   │   ├── filesystem.ts        # File operations
│   │   ├── validation.ts        # Input validation
│   │   └── errors.ts            # Error handling utilities
│   └── types/
│       ├── workflow.ts          # Workflow type definitions
│       ├── tools.ts             # Tool input/output types
│       └── config.ts            # Config type definitions
├── templates/                   # Template workflow JSON files
│   ├── flux_txt2img.json
│   ├── sd15_txt2img.json
│   ├── sdxl_txt2img.json
│   └── basic_img2img.json
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json
├── config.json                  # Default configuration
└── README.md
```

### 7.2 Key Dependencies

**package.json:**
```json
{
  "name": "comfyui-mcp",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0",
    "ws": "^8.16.0",
    "axios": "^1.6.0",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/ws": "^8.5.0",
    "typescript": "^5.3.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  }
}
```

### 7.3 Core Implementation Patterns

#### HTTP Client Pattern
```typescript
class ComfyUIClient {
  private baseUrl: string;
  
  async post(endpoint: string, data: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        data,
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  async submitWorkflow(workflow: object, clientId: string): Promise<any> {
    return this.post('/prompt', {
      prompt: workflow,
      client_id: clientId
    });
  }
}
```

#### WebSocket Handler Pattern
```typescript
class ComfyUIWebSocket {
  private ws: WebSocket;
  private clientId: string;
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${wsUrl}?clientId=${this.clientId}`);
      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));
    });
  }
  
  onProgress(callback: (data: ProgressData) => void): void {
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'progress') {
        callback(message.data);
      }
    });
  }
}
```

#### Workflow Override Pattern
```typescript
class WorkflowProcessor {
  applyOverrides(workflow: any, overrides: any): any {
    const modified = JSON.parse(JSON.stringify(workflow));
    
    // Find and override positive prompt
    if (overrides.positive_prompt) {
      const node = this.findNode(modified, isPositivePrompt);
      if (node) {
        modified[node].inputs.text = overrides.positive_prompt;
      }
    }
    
    // Find and override sampler settings
    if (overrides.seed !== undefined) {
      const samplers = this.findAllNodes(modified, isSampler);
      samplers.forEach(id => {
        modified[id].inputs.seed = overrides.seed;
      });
    }
    
    return modified;
  }
  
  private findNode(workflow: any, predicate: (node: any) => boolean): string | null {
    for (const [id, node] of Object.entries(workflow)) {
      if (predicate(node)) return id;
    }
    return null;
  }
}
```

#### Tool Registration Pattern
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "comfy_submit_workflow",
      description: "Submit a complete workflow JSON to ComfyUI for execution...",
      inputSchema: zodToJsonSchema(SubmitWorkflowSchema),
    },
    // ... more tools
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "comfy_submit_workflow":
      return await handleSubmitWorkflow(args);
    case "comfy_generate_simple":
      return await handleGenerateSimple(args);
    // ... more handlers
  }
});
```

### 7.4 Testing Strategy

#### Unit Tests
- Workflow override logic
- Node detection algorithms
- Path resolution
- Template generation

#### Integration Tests
- ComfyUI API communication
- File upload/download
- WebSocket connections
- Error handling

#### End-to-End Tests
- Complete generation workflows
- Queue management
- Model detection
- Workflow library operations

---

## 8. Usage Examples

### 8.1 Simple Text-to-Image Generation

**User Query:**  
"Generate an image of a sunset over mountains using Flux"

**Claude's Tool Usage:**
```typescript
comfy_generate_simple({
  prompt: "sunset over mountains, dramatic lighting, golden hour, photorealistic",
  negative_prompt: "blurry, low quality, distorted",
  template: "flux_txt2img",
  width: 1024,
  height: 1024,
  steps: 20
})
```

**Expected Response:**
```typescript
{
  prompt_id: "abc123",
  number: 1,
  status: "queued",
  message: "Generation queued successfully"
}
```

**Follow-up:**
```typescript
comfy_wait_for_completion({
  prompt_id: "abc123",
  timeout: 300
})
```

**Final Output:**
```typescript
{
  status: "completed",
  outputs: [{
    images: ["C:\\Users\\nbock\\Documents\\AI\\ComfyUI_windows_portable\\ComfyUI\\output\\flux_txt2img_00001.png"],
    filename: "flux_txt2img_00001.png"
  }],
  execution_time: 12.5
}
```

### 8.2 Advanced Custom Workflow

**User Query:**  
"Use my chrono_edit workflow to animate this product image"

**Claude's Tool Usage:**
```typescript
// Step 1: Upload input image
comfy_upload_image({
  image_path: "C:\\Users\\nbock\\Desktop\\product.png",
  filename: "product_input.png"
})

// Step 2: Load saved workflow (if saved) or use provided JSON
comfy_load_workflow({
  name: "chrono_edit_animation"
})

// Step 3: Submit with overrides
comfy_submit_workflow({
  workflow: loadedWorkflow.workflow,
  overrides: {
    positive_prompt: "A leather bag with fabric, surrounded by white, round, foamy bubbles...",
    input_image: "product_input.png",
    seed: 78102548752655,
    steps: 20
  }
})
```

### 8.3 Batch Processing

**User Query:**  
"Generate 4 variations of a logo design with different seeds"

**Claude's Tool Usage:**
```typescript
const prompts = [];

for (let i = 0; i < 4; i++) {
  const result = await comfy_generate_simple({
    prompt: "modern minimalist logo, abstract geometric shapes, professional",
    template: "flux_txt2img",
    seed: 1000 + i,  // Different seed for each
    width: 1024,
    height: 1024
  });
  prompts.push(result.prompt_id);
}

// Wait for all to complete
for (const promptId of prompts) {
  await comfy_wait_for_completion({ prompt_id: promptId });
}

// Get all outputs
const outputs = await comfy_get_output_images({
  limit: 4,
  sort: "newest"
});
```

### 8.4 Model Exploration

**User Query:**  
"What Flux models do I have available?"

**Claude's Tool Usage:**
```typescript
comfy_list_models({
  type: "checkpoints",
  filter: "flux"
})
```

**Expected Response:**
```typescript
{
  models: [
    {
      type: "checkpoints",
      name: "flux_dev.safetensors",
      path: "checkpoints/flux_dev.safetensors"
    },
    {
      type: "checkpoints",
      name: "flux_schnell.safetensors",
      path: "checkpoints/flux_schnell.safetensors"
    }
  ],
  total_count: 2,
  summary: "Found 2 Flux models in checkpoints"
}
```

### 8.5 Workflow Management

**User Query:**  
"Save this workflow as 'product_bubbles' for future use"

**Claude's Tool Usage:**
```typescript
comfy_save_workflow({
  name: "product_bubbles",
  workflow: currentWorkflowJson,
  description: "Image to video animation with bubble effect using Chrono Edit 14B",
  tags: ["animation", "product", "chrono-edit"]
})
```

**Later retrieval:**
```typescript
comfy_list_workflows({
  tags: ["product"]
})

comfy_load_workflow({
  name: "product_bubbles"
})
```

---

## 9. Performance Considerations

### 9.1 Caching Strategy

**Model List Caching:**
- Cache model list for 5 minutes
- Invalidate on demand via tool parameter
- Background refresh on startup

**Workflow Library Caching:**
- Load workflow metadata on startup
- Lazy load workflow content
- Cache workflow JSON after first load

### 9.2 Connection Pooling

**HTTP Client:**
- Reuse axios instance
- Connection keep-alive
- Request timeout: 30s

**WebSocket:**
- Single persistent connection
- Auto-reconnect on disconnect
- Heartbeat every 30s

### 9.3 File Operations

**Image Upload:**
- Stream large files
- Validate before upload
- Progress reporting for >10MB files

**Output Reading:**
- Lazy directory scanning
- Limit initial scan to recent files
- Pagination for large result sets

---

## 10. Security Considerations

### 10.1 Path Validation

**Input Paths:**
```typescript
function validateInputPath(path: string): boolean {
  const resolved = path.resolve(path);
  const allowed = config.paths.input;
  return resolved.startsWith(allowed);
}
```

**Output Paths:**
- Only return paths within ComfyUI output directory
- No directory traversal allowed
- Sanitize filenames

### 10.2 Workflow Validation

**JSON Structure:**
- Validate against schema
- Reject malformed workflows
- Size limit: 10MB

**Node Validation:**
- Check for valid class_types
- Validate connections
- Prevent infinite loops

### 10.3 Resource Limits

**Queue Limits:**
- Max queue size: 100 items
- Max concurrent generations: 1 (ComfyUI default)
- Timeout per generation: 300s (configurable)

**File Limits:**
- Max input image size: 100MB
- Max workflow library: 1000 workflows
- Max workflow size: 10MB

---

## 11. Monitoring and Logging

### 11.1 Logging Levels

```typescript
enum LogLevel {
  ERROR = "error",   // Failures, exceptions
  WARN = "warn",     // Recoverable issues
  INFO = "info",     // Major operations
  DEBUG = "debug"    // Detailed debugging
}
```

### 11.2 Log Events

**INFO Level:**
- Server startup/shutdown
- Tool invocations
- Workflow submissions
- Generation completions

**DEBUG Level:**
- API requests/responses
- Workflow override operations
- File system operations
- WebSocket messages

**ERROR Level:**
- Connection failures
- Validation errors
- Execution failures
- File system errors

### 11.3 Metrics

**Performance Metrics:**
- Average generation time
- API response times
- Queue depth over time
- Success/failure rates

**Usage Metrics:**
- Tool invocation counts
- Template usage statistics
- Model popularity
- Workflow library usage

---

## 12. Future Enhancements

### 12.1 Phase 2 Features

**Advanced Overrides:**
- LoRA management and injection
- ControlNet parameter control
- Multi-region prompting
- IPAdapter integration

**Workflow Analysis:**
- Automatic workflow summarization
- Parameter extraction and description
- Compatibility checking
- Optimization suggestions

**Batch Operations:**
- Multi-prompt processing
- Parameter sweeps
- A/B testing workflows

### 12.2 Phase 3 Features

**Workflow Builder:**
- Visual workflow construction
- Template mixing and merging
- Node library management

**Cloud Integration:**
- Remote ComfyUI support
- Distributed generation
- Result sharing

**Advanced UI:**
- Progress visualization
- Real-time previews
- Generation history browser

---

## 13. Deployment and Maintenance

### 13.1 Installation Steps

1. **Install Node.js** (v20+ required)
2. **Clone/Download MCP Server**
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Configure:**
   - Edit `config.json` with correct paths
   - Verify ComfyUI installation path
5. **Build:**
   ```bash
   npm run build
   ```
6. **Configure Claude Desktop:**
   - Edit `claude_desktop_config.json`
   - Add comfyui MCP server entry
7. **Restart Claude Desktop**
8. **Verify:**
   - Check MCP server appears in Claude
   - Test with simple generation

### 13.2 Troubleshooting

**Common Issues:**

**"Cannot connect to ComfyUI"**
- Ensure ComfyUI is running
- Check port 8188 is accessible
- Verify firewall settings

**"Model not found"**
- Run `comfy_list_models` to see available models
- Check model paths in config
- Verify model files exist

**"Workflow validation failed"**
- Test workflow in ComfyUI UI first
- Check node connections
- Verify model compatibility

**"Permission denied"**
- Check folder permissions
- Run as administrator if needed
- Verify paths are accessible

### 13.3 Updates and Maintenance

**Updating MCP Server:**
1. Pull latest code
2. Run `npm install`
3. Run `npm run build`
4. Restart Claude Desktop

**Updating Templates:**
- Edit template JSON files in `templates/`
- Rebuild server
- Restart Claude Desktop

**Updating Configuration:**
- Edit `config.json`
- Restart Claude Desktop (no rebuild needed)

---

## 14. Appendices

### Appendix A: ComfyUI API Reference

See: https://github.com/comfyanonymous/ComfyUI/wiki/API-Reference

### Appendix B: Common Node Types

| Node Class | Purpose | Key Inputs |
|-----------|---------|------------|
| CLIPTextEncode | Text prompt encoding | text, clip |
| KSampler | Sampling/generation | model, positive, negative, latent_image, seed, steps, cfg |
| CheckpointLoaderSimple | Load model checkpoint | ckpt_name |
| VAEDecode | Decode latent to image | samples, vae |
| VAEEncode | Encode image to latent | pixels, vae |
| LoadImage | Load input image | image |
| SaveImage | Save output image | images, filename_prefix |
| EmptyLatentImage | Create empty latent | width, height, batch_size |
| LatentUpscale | Upscale latent | samples, upscale_method, width, height |
| LoraLoader | Load LoRA | lora_name, strength_model, strength_clip |

### Appendix C: Sample Workflows

See `templates/` directory for full workflow JSON examples:
- `flux_txt2img.json` - Basic Flux text-to-image
- `sd15_txt2img.json` - SD 1.5 text-to-image
- `sdxl_txt2img.json` - SDXL text-to-image
- `basic_img2img.json` - Basic image-to-image

### Appendix D: Zod Schema Examples

```typescript
const SubmitWorkflowSchema = z.object({
  workflow: z.union([z.string(), z.record(z.any())]),
  overrides: z.object({
    positive_prompt: z.string().optional(),
    negative_prompt: z.string().optional(),
    seed: z.number().int().optional(),
    steps: z.number().int().min(1).max(150).optional(),
    cfg: z.number().min(0).max(30).optional(),
    // ... more fields
  }).optional(),
  client_id: z.string().optional()
});
```

---

## 15. Success Criteria

The MCP server implementation will be considered successful when:

1. ✅ All 15 tools are implemented and functional
2. ✅ Can submit custom workflows with parameter overrides
3. ✅ Can execute template-based simple generations
4. ✅ Real-time progress monitoring works via WebSocket
5. ✅ File paths are correctly returned and accessible by Claude Desktop
6. ✅ Model listing works for all model types
7. ✅ Workflow library save/load/list/delete all functional
8. ✅ Error handling provides actionable suggestions
9. ✅ Queue management (status, cancel, clear) works
10. ✅ Image upload and output retrieval works
11. ✅ All tools have proper TypeScript types and validation
12. ✅ Documentation is complete and accurate
13. ✅ MCP server passes basic integration tests
14. ✅ Successfully integrates with Claude Desktop on Windows
15. ✅ Can handle the provided chrono_edit workflow example

---

**End of Specification Document**

*This specification provides complete guidance for implementing a production-ready ComfyUI MCP server. All technical details, API endpoints, error handling, and implementation patterns are included for immediate development with Claude Code or manual implementation.*
