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
</style>
