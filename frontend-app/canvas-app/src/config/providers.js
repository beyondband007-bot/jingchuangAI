export const PROVIDERS = {
  kie: {
    label: 'Facemini（服务端托管）',
    defaultBaseUrl: '/api',
    serverManaged: true,
    endpoints: {
      chat: '/chat/messages/stream',
      image: '/image/tasks',
      video: '/video/tasks',
      videoQuery: '/video/tasks/{taskId}'
    },
    requestAdapter: {
      chat: params => ({
        model: params.model,
        messages: params.messages,
        ...(params.reasoningEffort ? { reasoningEffort: params.reasoningEffort } : {})
      }),
      image: params => ({
        model: params.model,
        prompt: params.prompt,
        ...(params.size ? { size: params.size } : {}),
        ...(params.quality ? { quality: params.quality } : {}),
        ...(params.image ? { image: params.image } : {}),
        projectId: params.projectId,
        nodeId: params.nodeId,
        inputHash: params.inputHash
      }),
      video: params => params
    },
    responseAdapter: {
      chat: response => response?.message?.content || '',
      image: response => (response.data || []).map(item => ({ url: item.url || '', revisedPrompt: '' })),
      video: response => ({ ...response, url: response.video || response.url || '' })
    }
  },
  default: 'kie'
}

export const getProviderList = () => [{ key: 'kie', label: PROVIDERS.kie.label }]
export const getDefaultProvider = () => 'kie'
export const getProviderConfig = providerKey => PROVIDERS[providerKey] || PROVIDERS.kie
export const getDefaultBaseUrl = providerKey => getProviderConfig(providerKey).defaultBaseUrl
