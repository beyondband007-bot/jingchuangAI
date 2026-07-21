import { DEFAULT_CHAT_MODEL } from './models'

export const TEXT_GENERATION_MODEL = DEFAULT_CHAT_MODEL

export const CHINESE_TEXT_OUTPUT_SYSTEM_PROMPT = '语言规则：最终结果必须使用简体中文。无论用户输入或参考资料使用什么语言，都要用自然、准确的简体中文表达；除不可翻译的专有名词、代码、URL和JSON键名外，不得输出英文句子。若要求JSON或Markdown，必须保持指定结构，但其中所有自然语言内容仍须使用简体中文。'
