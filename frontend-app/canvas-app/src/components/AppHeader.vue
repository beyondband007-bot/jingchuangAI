<template>
  <!-- App Header | 应用头部 -->
  <header class="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[var(--border-color)]">
    <!-- Left slot | 左侧插槽 -->
    <div class="flex items-center gap-2">
      <slot name="left">
        <!-- Default: empty or logo -->
      </slot>
    </div>
    
    <!-- Right section | 右侧区域 -->
    <div class="flex items-center gap-4">
      <!-- Center slot | 中间插槽 -->
      <slot name="center"></slot>

      <button
        class="canvas-theme-toggle"
        type="button"
        :aria-label="isDark ? '切换为日间模式' : '切换为夜间模式'"
        :data-tooltip="isDark ? '切换为日间模式' : '切换为夜间模式'"
        data-tooltip--bottom
        @click="toggleTheme"
      >
        <n-icon :size="18">
          <SunnyOutline v-if="isDark" />
          <MoonOutline v-else />
        </n-icon>
      </button>

      <!-- Right slot | 右侧插槽 -->
      <slot name="right"></slot>
    </div>
  </header>
</template>

<script setup>
/**
 * App Header component | 应用头部组件
 * Reusable header with slots for customization
 */
import { NIcon } from 'naive-ui'
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import { isDark, toggleTheme } from '../stores/theme'
</script>

<style scoped>
header {
  min-height: var(--app-header-height);
  padding-top: 0;
  padding-bottom: 0;
  color: var(--canvas-text);
  background: var(--canvas-surface);
  border-color: var(--canvas-border);
}
.canvas-theme-toggle {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--canvas-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--canvas-radius-control);
  transition: color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}

.canvas-theme-toggle:hover,
.canvas-theme-toggle:focus-visible {
  color: var(--canvas-text);
  background: var(--bg-tertiary);
}
</style>
