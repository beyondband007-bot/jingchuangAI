const RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9']

export const SEEDREAM_SIZE_OPTIONS = RATIOS.map(key => ({ label: key, key }))
export const SEEDREAM_4K_SIZE_OPTIONS = SEEDREAM_SIZE_OPTIONS
export const SEEDREAM_QUALITY_OPTIONS = [
  { label: '1K', key: '1K' },
  { label: '2K', key: '2K' }
]
export const BANANA_SIZE_OPTIONS = SEEDREAM_SIZE_OPTIONS

export const IMAGE_MODELS = [
  { label: 'Facemini Image 2', key: 'gpt_image_2', provider: ['kie'], sizes: RATIOS, defaultParams: { size: '1:1', quality: '1K', style: 'vivid' } },
  { label: 'Facemini Banana Pro', key: 'nano_banana_pro', provider: ['kie'], sizes: RATIOS, defaultParams: { size: '1:1', quality: '1K', style: 'vivid' } },
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
export const SEEDANCE_RESOLUTION_OPTIONS = [
  { label: '480P', key: '480P' },
  { label: '720P', key: '720P' },
  { label: '768P', key: '768P' },
  { label: '1080P', key: '1080P' },
  { label: '2K', key: '2K' },
  { label: '4K', key: '4K' }
]
export const VIDEO_MODELS = [{
  label: 'Seedance 2.0',
  key: 'seedance_2_0_720p',
  provider: ['kie'],
  type: 't2v+i2v',
  ratios: VIDEO_RATIO_LIST.map(item => item.key),
  durs: [4, 5, 6, 8, 10, 15].map(key => ({ label: `${key} 秒`, key })),
  resolutions: ['480P', '720P', '1080P'],
  resolutionPoints: { '480P': 54, '720P': 120, '1080P': 270 },
  estimatedResolutions: ['480P', '720P', '1080P'],
  defaultResolution: '720P',
  defaultParams: { ratio: '16:9', duration: 6, resolution: '720P', generateAudio: true }
}, {
  label: 'Seedance TC',
  key: 'seedance_tc',
  provider: ['kie'],
  type: 't2v+i2v+r2v',
  ratios: VIDEO_RATIO_LIST.map(item => item.key),
  durs: [4, 5, 6, 8, 10, 15].map(key => ({ label: `${key}s`, key })),
  resolutions: ['480P', '720P', '1080P'],
  resolutionPoints: { '480P': 54, '720P': 120, '1080P': 270 },
  estimatedResolutions: ['480P', '720P', '1080P'],
  defaultResolution: '720P',
  defaultParams: { ratio: '16:9', duration: 6, resolution: '720P', generateAudio: true }
}, {
  label: 'MiniMax H3',
  key: 'minimax_h3_2k',
  provider: ['kie'],
  type: 't2v+i2v+r2v',
  ratios: ['21:9', ...VIDEO_RATIO_LIST.map(item => item.key)],
  durs: Array.from({ length: 12 }, (_, index) => index + 4).map(key => ({ label: `${key}s`, key })),
  resolutions: ['768P', '2K'],
  resolutionPoints: { '768P': 60, '2K': 96 },
  defaultResolution: '2K',
  defaultParams: { ratio: '16:9', duration: 4, resolution: '2K', generateAudio: true }
}, {
  label: 'Kling 3.0',
  key: 'kling_3_std',
  provider: ['kie'],
  type: 't2v+i2v',
  ratios: ['16:9', '9:16', '1:1'],
  durs: Array.from({ length: 13 }, (_, index) => index + 3).map(key => ({ label: `${key}s`, key })),
  resolutions: ['720P', '1080P', '4K'],
  resolutionPoints: { '720P': 120, '1080P': 162, '4K': 402 },
  defaultResolution: '720P',
  defaultParams: { ratio: '16:9', duration: 6, resolution: '720P', generateAudio: true }
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
