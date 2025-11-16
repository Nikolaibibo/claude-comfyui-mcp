import { Workflow, TemplateOptions } from '../types/workflow.js';
import { getConfig } from '../config.js';

export function buildFluxTxt2ImgWorkflow(options: TemplateOptions): Workflow {
  const config = getConfig();
  const template = config.templates.flux_txt2img;

  const model = options.model || template.default_model || 'flux_dev.safetensors';
  const steps = options.steps || template.default_steps || 20;
  const cfg = options.cfg || template.default_cfg || 3.5;
  const seed = options.seed || Math.floor(Math.random() * 1000000000000);
  const width = options.width || 1024;
  const height = options.height || 1024;
  const sampler = options.sampler || template.default_sampler || 'euler';
  const scheduler = options.scheduler || template.default_scheduler || 'simple';
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
        "filename_prefix": "flux_txt2img",
        "images": ["6", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  };
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
