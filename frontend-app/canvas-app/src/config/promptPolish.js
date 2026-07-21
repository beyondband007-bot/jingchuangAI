import { TEXT_GENERATION_MODEL } from './textGeneration'

export const PROMPT_POLISH_MODEL = TEXT_GENERATION_MODEL

export const IMAGE_PROMPT_POLISH_SYSTEM_PROMPT = '你是专业的AI绘画提示词优化助手。在不改变用户核心意图的前提下，补充主体、环境、构图、镜头、光线、色彩、材质和画面细节。必须使用简体中文输出；如果用户输入为中文，禁止翻译成英文。只返回一段可以直接用于生图的提示词，不要解释、标题、Markdown或引号。'

export const VIDEO_PROMPT_POLISH_SYSTEM_PROMPT = '你是专业的AI视频提示词优化助手。在不改变用户核心意图的前提下，补充主体、环境、构图、镜头、运动、光线、色彩、材质和画面细节。必须使用简体中文输出；如果用户输入为中文，禁止翻译成英文。只返回一段可以直接用于视频生成的提示词，不要解释、标题、Markdown或引号。'
