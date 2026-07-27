<template>
  <BaseEdge :path="path" :style="edgeStyle" />
  <EdgeLabelRenderer>
    <button
      v-if="selected"
      type="button"
      class="nodrag nopan flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--bg-tertiary)] hover:text-red-500"
      :style="labelStyle"
      data-tooltip="删除连线"
      aria-label="删除连线"
      @click.stop="removeEdge(id)"
      @mousedown.stop
    >
      <n-icon :size="14"><TrashOutline /></n-icon>
    </button>
  </EdgeLabelRenderer>
</template>

<script setup>
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import { NIcon } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import { removeEdge } from '../../stores/canvas'

const props = defineProps({
  id: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  selected: Boolean,
  style: Object
})

const pathResult = computed(() => getBezierPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  targetX: props.targetX,
  targetY: props.targetY,
  sourcePosition: props.sourcePosition,
  targetPosition: props.targetPosition
}))

const path = computed(() => pathResult.value[0])
const labelStyle = computed(() => ({
  position: 'absolute',
  transform: `translate(-50%, -50%) translate(${pathResult.value[1]}px, ${pathResult.value[2]}px)`,
  pointerEvents: 'all'
}))
const edgeStyle = computed(() => ({
  stroke: props.selected ? '#ef4444' : '#94a3b8',
  strokeWidth: props.selected ? 3 : 2,
  ...props.style
}))
</script>
