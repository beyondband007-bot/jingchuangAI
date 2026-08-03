const RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9']

export const SEEDREAM_SIZE_OPTIONS = RATIOS.map(key => ({ label: key, key }))
export const SEEDREAM_4K_SIZE_OPTIONS = SEEDREAM_SIZE_OPTIONS
export const SEEDREAM_QUALITY_OPTIONS = [
  { label: '1K', key: '1K' },
  { label: '2K', key: '2K' }
]
export const BANANA_SIZE_OPTIONS = SEEDREAM_SIZE_OPTIONS

export const IMAGE_MODELS = [
  { label: 'GPT Image 2', key: 'gpt_image_2', provider: ['kie'], sizes: RATIOS, defaultParams: { size: '1:1', quality: '1K', style: 'vivid' } },
  { label: 'Nano Banana Pro', key: 'nano_banana_pro', provider: ['kie'], sizes: RATIOS, defaultParams: { size: '1:1', quality: '1K', style: 'vivid' } },
  { label: 'Flux 2 Pro', key: 'flux_2_pro', provider: ['kie'], sizes: RATIOS, defaultParams: { size: '1:1', quality: '1K', style: 'vivid' } },
  { label: 'Seedream 4.5', key: 'seedream_4_5', provider: ['kie'], sizes: RATIOS, defaultParams: { size: '1:1', quality: '1K', style: 'vivid' } }
]

export const VIDEO_RATIO_LIST = [
  { label: '16:9（横版）', key: '16:9' },
  { label: '9:16（竖版）', key: '9:16' },
  { label: '1:1（方形）', key: '1:1' },
  { label: '4:3', key: '4:3' },
  { label: '3:4', key: '3:4' }
]
export const SEEDANCE_RESOLUTION_OPTIONS = [{ label: '720p', key: '720p' }]
export const VIDEO_MODELS = [{
  label: 'Seedance 2.0 720p',
  key: 'seedance_2_0_720p',
  provider: ['kie'],
  type: 't2v+i2v',
  ratios: VIDEO_RATIO_LIST.map(item => item.key),
  durs: [4, 5, 6, 8, 10, 15].map(key => ({ label: `${key} 秒`, key })),
  resolutions: ['720p'],
  defaultResolution: '720p',
  defaultParams: { ratio: '16:9', duration: 5, resolution: '720p', generateAudio: true }
}]

export const CHAT_MODELS = [
  { label: 'DeepSeek V4 Pro', key: 'deepseek-v4-pro', provider: ['kie'] }
]

export const IMAGE_SIZE_OPTIONS = SEEDREAM_SIZE_OPTIONS
export const IMAGE_QUALITY_OPTIONS = SEEDREAM_QUALITY_OPTIONS
export const IMAGE_STYLE_OPTIONS = [
  { label: '生动', key: 'vivid' },
  { label: '自然', key: 'natural' }
]
export const VIDEO_RATIO_OPTIONS = VIDEO_RATIO_LIST
export const VIDEO_DURATION_OPTIONS = VIDEO_MODELS[0].durs

export const DEFAULT_IMAGE_MODEL = 'gpt_image_2'
export const DEFAULT_VIDEO_MODEL = 'seedance_2_0_720p'
export const DEFAULT_CHAT_MODEL = 'deepseek-v4-pro'
export const DEFAULT_IMAGE_SIZE = '1:1'
export const DEFAULT_VIDEO_RATIO = '16:9'
export const DEFAULT_VIDEO_DURATION = 5

export const getModelByName = key =>
  [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS].find(model => model.key === key)
