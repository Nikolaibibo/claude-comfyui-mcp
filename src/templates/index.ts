import { Workflow, TemplateOptions, FluxVariantPreset } from '../types/workflow.js';
import { getConfig } from '../config.js';

// Flux variant presets with optimized settings
export const FLUX_VARIANTS: Record<string, FluxVariantPreset> = {
  'flux-dev': {
    name: 'Flux Dev',
    model: 'flux1-dev-fp8.safetensors',
    steps: 20,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  },
  'flux-dev-full': {
    name: 'Flux Dev (Full Precision)',
    model: 'flux1-dev.safetensors',
    steps: 24,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  },
  'flux-schnell': {
    name: 'Flux Schnell',
    model: 'flux1-schnell.safetensors',
    steps: 4,
    cfg: 1.0,
    sampler: 'euler',
    scheduler: 'simple'
  },
  'flux-kontext': {
    name: 'Flux Kontext Dev',
    model: 'flux1-kontext-dev.safetensors',
    steps: 20,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  },
  'flux-kontext-fp8': {
    name: 'Flux Kontext Dev (FP8)',
    model: 'flux1-dev-kontext_fp8_scaled.safetensors',
    steps: 20,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  },
  'flux-fill': {
    name: 'Flux Fill Dev',
    model: 'flux1-fill-dev-fp8.safetensors',
    steps: 20,
    cfg: 3.5,
    sampler: 'euler',
    scheduler: 'simple'
  }
};

export function buildFluxTxt2ImgWorkflow(options: TemplateOptions): Workflow {
  const config = getConfig();
  const template = config.templates.flux_txt2img;

  // Apply variant preset if specified
  let variantPreset: FluxVariantPreset | undefined;
  if (options.variant && FLUX_VARIANTS[options.variant]) {
    variantPreset = FLUX_VARIANTS[options.variant];
  }

  // Get settings with variant preset priority: options > variant > template > defaults
  const unet_model = options.model || variantPreset?.model || template.default_unet || 'flux1-dev-fp8.safetensors';
  const clip_name = options.clip || template.default_clip || 't5xxl_fp8_e4m3fn_scaled.safetensors';
  const vae_name = options.vae || template.default_vae || 'ae.safetensors';
  const steps = options.steps || variantPreset?.steps || template.default_steps || 20;
  const cfg = options.cfg !== undefined ? options.cfg : (variantPreset?.cfg || template.default_cfg || 3.5);
  const seed = options.seed || Math.floor(Math.random() * 1000000000000);
  const width = options.width || 1024;
  const height = options.height || 1024;
  const sampler = options.sampler || variantPreset?.sampler || template.default_sampler || 'euler';
  const scheduler = options.scheduler || variantPreset?.scheduler || template.default_scheduler || 'simple';
  const batch_size = options.batch_size || 1;
  const negative = options.negative_prompt || '';

  // Build workflow with proper Flux architecture
  const workflow: Workflow = {
    "1": {
      "inputs": {
        "unet_name": unet_model,
        "weight_dtype": "default"
      },
      "class_type": "UNETLoader",
      "_meta": { "title": "Load Diffusion Model" }
    },
    "2": {
      "inputs": {
        "clip_name": clip_name,
        "type": "sd3"
      },
      "class_type": "CLIPLoader",
      "_meta": { "title": "Load CLIP" }
    },
    "3": {
      "inputs": {
        "vae_name": vae_name
      },
      "class_type": "VAELoader",
      "_meta": { "title": "Load VAE" }
    },
    "4": {
      "inputs": {
        "text": options.prompt,
        "clip": ["2", 0]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Positive)" }
    },
    "5": {
      "inputs": {
        "text": negative,
        "clip": ["2", 0]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Negative)" }
    },
    "6": {
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": batch_size
      },
      "class_type": "EmptyLatentImage",
      "_meta": { "title": "Empty Latent Image" }
    }
  };

  // Add LoRA loader if specified
  let modelNodeId = "1";
  let clipNodeId = "2";

  if (options.lora && options.lora.length > 0) {
    let loraNodeCounter = 7;
    for (const lora of options.lora) {
      const loraNodeId = loraNodeCounter.toString();
      workflow[loraNodeId] = {
        "inputs": {
          "lora_name": lora.name,
          "strength_model": lora.strength_model,
          "strength_clip": lora.strength_clip,
          "model": [modelNodeId, 0],
          "clip": [clipNodeId, 0]
        },
        "class_type": "LoraLoader",
        "_meta": { "title": `Load LoRA: ${lora.name}` }
      };
      modelNodeId = loraNodeId;
      clipNodeId = loraNodeId;
      loraNodeCounter++;
    }
  }

  // Continue with sampler, using potentially updated model/clip node IDs
  const samplerNodeId = (parseInt(modelNodeId) + 1).toString();
  workflow[samplerNodeId] = {
    "inputs": {
      "seed": seed,
      "steps": steps,
      "cfg": cfg,
      "sampler_name": sampler,
      "scheduler": scheduler,
      "denoise": 1.0,
      "model": [modelNodeId, 0],
      "positive": ["4", 0],
      "negative": ["5", 0],
      "latent_image": ["6", 0]
    },
    "class_type": "KSampler",
    "_meta": { "title": "KSampler" }
  };

  const vaeDecodeNodeId = (parseInt(samplerNodeId) + 1).toString();
  workflow[vaeDecodeNodeId] = {
    "inputs": {
      "samples": [samplerNodeId, 0],
      "vae": ["3", 0]
    },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE Decode" }
  };

  const saveNodeId = (parseInt(vaeDecodeNodeId) + 1).toString();
  workflow[saveNodeId] = {
    "inputs": {
      "filename_prefix": "flux_txt2img",
      "images": [vaeDecodeNodeId, 0]
    },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  };

  return workflow;
}

export function buildSD15Txt2ImgWorkflow(options: TemplateOptions): Workflow {
  const config = getConfig();
  const template = config.templates.sd15_txt2img;

  const model = options.model || template.default_model || 'v1-5-pruned-emaonly.safetensors';
  const steps = options.steps || template.default_steps || 20;
  const cfg = options.cfg || template.default_cfg || 7.0;
  const seed = options.seed || Math.floor(Math.random() * 1000000000000);
  const width = options.width || 512;
  const height = options.height || 512;
  const sampler = options.sampler || template.default_sampler || 'dpmpp_2m';
  const scheduler = options.scheduler || template.default_scheduler || 'karras';
  const batch_size = options.batch_size || 1;
  const negative = options.negative_prompt || 'low quality, blurry, distorted, ugly';

  return {
    "1": {
      "inputs": {
        "ckpt_name": model
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": { "title": "Load Checkpoint" }
    },
    "2": {
      "inputs": {
        "text": options.prompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
    },
    "3": {
      "inputs": {
        "text": negative,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
    },
    "4": {
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": batch_size
      },
      "class_type": "EmptyLatentImage",
      "_meta": { "title": "Empty Latent Image" }
    },
    "5": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": sampler,
        "scheduler": scheduler,
        "denoise": 1.0,
        "model": ["1", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["4", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "6": {
      "inputs": {
        "samples": ["5", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "7": {
      "inputs": {
        "filename_prefix": "sd15_txt2img",
        "images": ["6", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  };
}

export function buildSDXLTxt2ImgWorkflow(options: TemplateOptions): Workflow {
  const config = getConfig();
  const template = config.templates.sdxl_txt2img;

  const model = options.model || template.default_model || 'sd_xl_base_1.0.safetensors';
  const steps = options.steps || template.default_steps || 20;
  const cfg = options.cfg || template.default_cfg || 7.0;
  const seed = options.seed || Math.floor(Math.random() * 1000000000000);
  const width = options.width || 1024;
  const height = options.height || 1024;
  const sampler = options.sampler || template.default_sampler || 'dpmpp_2m_sde';
  const scheduler = options.scheduler || template.default_scheduler || 'karras';
  const batch_size = options.batch_size || 1;
  const negative = options.negative_prompt || 'low quality, blurry, distorted';

  return {
    "1": {
      "inputs": {
        "ckpt_name": model
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": { "title": "Load Checkpoint" }
    },
    "2": {
      "inputs": {
        "text": options.prompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
    },
    "3": {
      "inputs": {
        "text": negative,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
    },
    "4": {
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": batch_size
      },
      "class_type": "EmptyLatentImage",
      "_meta": { "title": "Empty Latent Image" }
    },
    "5": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": sampler,
        "scheduler": scheduler,
        "denoise": 1.0,
        "model": ["1", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["4", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "6": {
      "inputs": {
        "samples": ["5", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "7": {
      "inputs": {
        "filename_prefix": "sdxl_txt2img",
        "images": ["6", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  };
}

export function buildBasicImg2ImgWorkflow(options: TemplateOptions): Workflow {
  const config = getConfig();
  const template = config.templates.basic_img2img;

  const model = options.model || template.default_model || 'v1-5-pruned-emaonly.safetensors';
  const steps = options.steps || template.default_steps || 20;
  const cfg = options.cfg || template.default_cfg || 7.0;
  const denoise = options.denoise !== undefined ? options.denoise : (template.default_denoise || 0.75);
  const seed = options.seed || Math.floor(Math.random() * 1000000000000);
  const sampler = options.sampler || template.default_sampler || 'dpmpp_2m';
  const scheduler = options.scheduler || template.default_scheduler || 'karras';
  const negative = options.negative_prompt || 'low quality, blurry, distorted';
  const inputImage = options.input_image || 'input.png';

  return {
    "1": {
      "inputs": {
        "ckpt_name": model
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": { "title": "Load Checkpoint" }
    },
    "2": {
      "inputs": {
        "text": options.prompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
    },
    "3": {
      "inputs": {
        "text": negative,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
    },
    "4": {
      "inputs": {
        "image": inputImage
      },
      "class_type": "LoadImage",
      "_meta": { "title": "Load Image" }
    },
    "5": {
      "inputs": {
        "pixels": ["4", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEEncode",
      "_meta": { "title": "VAE Encode" }
    },
    "6": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": sampler,
        "scheduler": scheduler,
        "denoise": denoise,
        "model": ["1", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "7": {
      "inputs": {
        "samples": ["6", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "8": {
      "inputs": {
        "filename_prefix": "basic_img2img",
        "images": ["7", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  };
}

export function getTemplateBuilder(templateName: string): ((options: TemplateOptions) => Workflow) | null {
  switch (templateName) {
    case 'flux_txt2img':
      return buildFluxTxt2ImgWorkflow;
    case 'sd15_txt2img':
      return buildSD15Txt2ImgWorkflow;
    case 'sdxl_txt2img':
      return buildSDXLTxt2ImgWorkflow;
    case 'basic_img2img':
      return buildBasicImg2ImgWorkflow;
    default:
      return null;
  }
}
