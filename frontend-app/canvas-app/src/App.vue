<script setup>
/**
 * Root App component | 根组件
 * Provides naive-ui config and router view
 */
import { computed, onMounted, ref } from 'vue'
import { NButton, NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import { faceminiRequest } from './api/facemini'
import { isDark } from './stores/theme'

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

// Global theme overrides | 全局主题覆盖
const theme = computed(() => isDark.value ? darkTheme : null)

const themeOverrides = computed(() => ({
  common: {
    fontFamily: '"PingFang SC"',
    primaryColor: '#5a2cfc',
    primaryColorHover: '#4a24d6',
    primaryColorPressed: '#3d1eaf',
    primaryColorSuppl: '#ece8ff',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontSize: '14px',
    textColorBase: isDark.value ? '#f1f5f9' : '#111827',
    textColor2: isDark.value ? '#cbd5e1' : '#475569',
    borderColor: isDark.value ? '#334155' : '#e2e8f0'
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
}))
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div v-if="authState === 'loading'" class="canvas-auth-gate">正在验证登录状态…</div>
        <div v-else-if="authState === 'guest'" class="canvas-auth-gate">
          <div class="canvas-auth-logo" aria-hidden="true">∞</div>
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
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  background: var(--canvas-bg);
}
.canvas-auth-gate h1 { margin: 0; font-size: var(--font-size-section); color: var(--canvas-text); }
.canvas-auth-gate p { max-width: 420px; margin: 0 0 var(--space-1); color: var(--canvas-text-muted); }
.canvas-auth-logo {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xl);
  color: white;
  font-size: 34px;
  font-weight: 700;
  background: var(--brand-gradient);
  box-shadow: var(--shadow-brand);
}
</style>
