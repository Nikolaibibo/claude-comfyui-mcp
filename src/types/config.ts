export interface ServerConfig {
  comfyui: {
    base_url: string;
    websocket_url: string;
    installation_path: string;
    timeout: number;
    poll_interval: number;
  };
  paths: {
    models: string;
    input: string;
    output: string;
    workflow_library: string;
  };
  templates: {
    flux_txt2img: TemplateConfig;
    sd15_txt2img: TemplateConfig;
    sdxl_txt2img: TemplateConfig;
    basic_img2img: TemplateConfig;
  };
  features: {
    workflow_library: boolean;
    auto_model_detection: boolean;
    websocket_progress: boolean;
    model_caching: boolean;
  };
}

export interface TemplateConfig {
  enabled: boolean;
  default_model?: string;
  default_steps?: number;
  default_cfg?: number;
  default_sampler?: string;
  default_scheduler?: string;
  default_denoise?: number;
}

export const DEFAULT_CONFIG: ServerConfig = {
  comfyui: {
    base_url: "http://127.0.0.1:8188",
    websocket_url: "ws://127.0.0.1:8188/ws",
    installation_path: "C:\\Users\\nbock\\Documents\\AI\\ComfyUI_windows_portable",
    timeout: 300,
    poll_interval: 2
  },
  paths: {
    models: "ComfyUI\\models",
    input: "ComfyUI\\input",
    output: "ComfyUI\\output",
    workflow_library: "ComfyUI\\user\\default\\workflows\\mcp_library"
  },
  templates: {
    flux_txt2img: {
      enabled: true,
      default_model: "flux_dev.safetensors",
      default_steps: 20,
      default_cfg: 3.5,
      default_sampler: "euler",
      default_scheduler: "simple"
    },
    sd15_txt2img: {
      enabled: true,
      default_model: "v1-5-pruned-emaonly.safetensors",
      default_steps: 20,
      default_cfg: 7.0,
      default_sampler: "dpmpp_2m",
      default_scheduler: "karras"
    },
    sdxl_txt2img: {
      enabled: true,
      default_model: "sd_xl_base_1.0.safetensors",
      default_steps: 20,
      default_cfg: 7.0,
      default_sampler: "dpmpp_2m_sde",
      default_scheduler: "karras"
    },
    basic_img2img: {
      enabled: true,
      default_steps: 20,
      default_cfg: 7.0,
      default_sampler: "dpmpp_2m",
      default_scheduler: "karras",
      default_denoise: 0.75
    }
  },
  features: {
    workflow_library: true,
    auto_model_detection: true,
    websocket_progress: true,
    model_caching: true
  }
};
