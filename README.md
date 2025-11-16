# ComfyUI MCP Server

A Model Context Protocol (MCP) server that enables Claude Desktop to interact with your local ComfyUI installation for AI-powered image generation.

## Features

- **15 MCP Tools** for complete ComfyUI control
- **Template-based generation** (Flux, SD1.5, SDXL, img2img)
- **Custom workflow execution** with smart parameter overrides
- **Real-time progress monitoring** via WebSocket
- **Model management** (list checkpoints, LoRAs, VAEs, etc.)
- **Workflow library** for saving and reusing workflows
- **Queue management** (status, cancel, clear)
- **Image upload/retrieval** with full Windows path support

## Prerequisites

- **Node.js** v20 or higher
- **ComfyUI** installed and running at `http://127.0.0.1:8188`
- **Claude Desktop** (for MCP integration)
- **Windows 11** (as per specification)

## Installation

### 1. Install Dependencies

> [!NOTE]
> The file paths in the examples below must be replaced with the correct paths for your system.

```bash
cd [Path to your ComfyUI MCP Server]
npm install
```

### 2. Configure Paths

Edit `config.json` to match your ComfyUI installation:

```json
{
  "comfyui": {
    "installation_path": "[Path to your ComfyUI portable installation]"
  }
}
```

### 3. Build the Server

```bash
npm run build
```

### 4. Configure Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "comfyui": {
      "command": "node",
      "args": [
        "[Path to your ComfyUI MCP Server]\\dist\\index.js"
      ],
      "env": {
        "COMFYUI_CONFIG": "[Path to your ComfyUI MCP Server]\\config.json"
      }
    }
  }
}
```

### 5. Restart Claude Desktop

The ComfyUI tools will now be available in Claude Desktop.

## Available Tools

### Generation
- `comfy_submit_workflow` - Submit custom workflow JSON with overrides
- `comfy_generate_simple` - Quick generation using templates

### Status & Monitoring
- `comfy_get_status` - Check generation status and outputs
- `comfy_wait_for_completion` - Wait for generation to complete

### Model Management
- `comfy_list_models` - List available models, LoRAs, VAEs

### Workflow Library
- `comfy_save_workflow` - Save workflow to library
- `comfy_load_workflow` - Load saved workflow
- `comfy_list_workflows` - List all saved workflows
- `comfy_delete_workflow` - Delete workflow from library

### Queue Management
- `comfy_get_queue` - Get current queue status
- `comfy_cancel_generation` - Cancel generation
- `comfy_clear_queue` - Clear pending queue items

### Utilities
- `comfy_upload_image` - Upload image to ComfyUI input folder
- `comfy_get_output_images` - List recent output images

## Usage Examples

### Simple Text-to-Image Generation

Ask Claude:
```
Generate an image of a sunset over mountains using Flux
```

Claude will use `comfy_generate_simple` with the flux_txt2img template.

### Custom Workflow Execution

```
Use my chrono_edit workflow to animate this product image
```

Claude will:
1. Load your workflow with `comfy_load_workflow`
2. Upload the image with `comfy_upload_image`
3. Submit with `comfy_submit_workflow` and parameter overrides

### Check Available Models

```
What Flux models do I have available?
```

Claude will use `comfy_list_models` with filter="flux".

## Configuration

### Template Defaults

Edit `config.json` to customize template defaults:

```json
{
  "templates": {
    "flux_txt2img": {
      "default_model": "flux_dev.safetensors",
      "default_steps": 20,
      "default_cfg": 3.5
    }
  }
}
```

### Workflow Library Path

Workflows are saved to:
```
[Path to your ComfyUI portable installation]\ComfyUI\user\default\workflows\mcp_library
```

## Troubleshooting

### "Cannot connect to ComfyUI"

- Ensure ComfyUI is running: `run_nvidia_gpu.bat`
- Check ComfyUI is accessible at `http://127.0.0.1:8188`
- Verify port 8188 is not blocked by firewall

### "Model not found"

- Run `comfy_list_models` to see available models
- Check model file exists in the correct folder
- Verify model name spelling matches exactly

### "Workflow validation failed"

- Test workflow in ComfyUI UI first
- Check all node connections are valid
- Ensure all required models are available

### Permission Errors

- Check folder permissions on ComfyUI directories
- Run Claude Desktop as administrator if needed
- Verify paths in `config.json` are accessible

## Development

### Build in Watch Mode

```bash
npm run dev
```

### Clean Build

```bash
npm run clean
npm run build
```

## Architecture

```
Claude Desktop (stdio) → MCP Server → ComfyUI API (HTTP/WebSocket)
                              ↓
                         File System
                         - Models
                         - Input/Output
                         - Workflow Library
```

The MCP server runs as a separate Node.js process and communicates with ComfyUI via its HTTP API and WebSocket connections. It does **not** modify any ComfyUI files.

## License

MIT

## Support

For issues and questions, refer to the specification document or ComfyUI API documentation.
