<script setup>
/**
 * Root App component | 根组件
 * Provides naive-ui config and router view
 */
import { computed, onMounted, ref } from 'vue'
import { NButton, NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import { isDark } from './stores/theme'
import { faceminiRequest } from './api/facemini'

const authState = ref('loading')

onMounted(async () => {
  try {
    const result = await faceminiRequest('/auth/me')
    const user = result?.user || result
    authState.value = user?.isGuest ? 'guest' : 'authenticated'
  } catch (error) {
    authState.value = error.status === 401 ? 'guest' : 'error'
  }
})

const requestLogin = () => {
  if (window.parent !== window) {
    window.parent.postMessage({ source: 'facemini-canvas', type: 'auth-required' }, window.location.origin)
  } else {
    window.location.href = '/#/infinite-canvas'
  }
}

// Naive UI theme based on dark mode | 基于深色模式的 Naive UI 主题
const theme = computed(() => isDark.value ? darkTheme : null)

// Global theme overrides | 全局主题覆盖
const themeOverrides = {
  common: {
    borderRadius: '12px',
    borderRadiusSmall: '8px'
  },
  Dialog: {
    borderRadius: '16px',
    padding: '24px'
  },
  Modal: {
    borderRadius: '16px',
    padding: '24px'
  },
  Card: {
    borderRadius: '16px',
    padding: '24px'
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusSmall: '8px',
    borderRadiusLarge: '12px',
    heightMedium: '36px',
    paddingMedium: '0 16px'
  },
  Input: {
    borderRadius: '10px',
    heightMedium: '36px'
  }
}
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div v-if="authState === 'loading'" class="canvas-auth-gate">正在验证登录状态…</div>
        <div v-else-if="authState === 'guest'" class="canvas-auth-gate">
          <div class="canvas-auth-logo">∞</div>
          <h1>登录后使用 Facemini 无限画布</h1>
          <p>画布项目会保存到云端，生成内容会进入“我的资产”。</p>
          <n-button type="primary" size="large" @click="requestLogin">去登录</n-button>
        </div>
        <div v-else-if="authState === 'error'" class="canvas-auth-gate">
          <h1>暂时无法验证登录状态</h1>
          <p>请刷新页面后重试。</p>
        </div>
        <router-view v-else />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
.canvas-auth-gate {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px;
  text-align: center;
  background: linear-gradient(145deg, #f7f9ff, #fff8f3);
}
.canvas-auth-gate h1 { margin: 0; font-size: 24px; color: #24263a; }
.canvas-auth-gate p { margin: 0 0 6px; color: #73778b; }
.canvas-auth-logo {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  color: white;
  font-size: 34px;
  font-weight: 700;
  background: linear-gradient(135deg, #7048ef, #ff8a5c);
}
</style>
