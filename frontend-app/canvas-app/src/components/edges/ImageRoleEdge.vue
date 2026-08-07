<template>
  <!-- Custom edge with image role selector | 带图片角色选择器的自定义边 -->
  <BaseEdge :path="path" :style="edgeStyle" />
  
  <!-- The video node owns image mode; the edge only exposes deletion when selected. -->
  <EdgeLabelRenderer v-if="selected">
    <div 
      :style="{ 
        position: 'absolute', 
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all'
      }"
      class="nodrag nopan"
    >
      <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--bg-tertiary)] hover:text-red-500" data-tooltip="删除连线" aria-label="删除连线" @click.stop="removeEdge(id)" @mousedown.stop><n-icon :size="14"><TrashOutline /></n-icon></button>
    </div>
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
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object,
  selected: Boolean,
  markerEnd: String,
  style: Object
})

// Calculate bezier path | 计算贝塞尔路径
const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  })
  return edgePath
})

// Label position (center of edge) | 标签位置（边的中心）
const labelX = computed(() => (props.sourceX + props.targetX) / 2)
const labelY = computed(() => (props.sourceY + props.targetY) / 2)

// Edge style | 边样式
const edgeStyle = computed(() => ({
  stroke: '#6366f1',
  strokeWidth: 2,
  ...props.style
}))

</script>
