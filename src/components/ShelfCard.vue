<template>
  <div
    class="shelf-card"
    :class="{ archived: item.status === 'archived', digital: item.isDigital }"
    @click="handleClick"
  >
    <div class="cover-wrap">
      <span v-if="item.isDigital" class="digital-badge">電子</span>
      <img
        v-if="!imgFailed && displayImageUrl"
        :src="displayImageUrl"
        :alt="displayName"
        class="cover-img"
        @error="imgFailed = true"
        @load="onImgLoad"
      />
      <span v-else class="cover-fallback">{{ displayName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShelfItem } from '../types'
import { productStore } from '../store/products'

const props = defineProps<{ item: ShelfItem }>()
const emit = defineEmits<{ click: [item: ShelfItem] }>()

const imgFailed = ref(false)

// 優先順: 編集者選択 > ユーザー撮影 > 商品DB画像 > 追加時画像
const product = computed(() =>
  props.item.productId ? productStore.getById(props.item.productId) : undefined
)
const displayImageUrl = computed(() =>
  product.value?.selectedImageUrl
  ?? props.item.customImageUrl
  ?? product.value?.imageUrl
  ?? props.item.imageUrl
)
const displayName = computed(() =>
  product.value?.name ?? props.item.name
)

function handleClick() {
  emit('click', props.item)
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth < 10) {
    imgFailed.value = true
  }
}
</script>

<style scoped>
.shelf-card {
  background: #fff;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.shelf-card:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.shelf-card.archived {
  filter: grayscale(100%);
  opacity: 0.45;
}

.shelf-card.digital {
  background: #eef1fb;
  box-shadow: 0 1px 4px rgba(79, 101, 210, 0.12);
}

.digital-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(79, 101, 210, 0.85);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.04em;
  line-height: 1.4;
  pointer-events: none;
}

.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #fff;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.cover-fallback {
  padding: 8px;
  font-size: 10px;
  line-height: 1.5;
  color: #8b6914;
  text-align: center;
  word-break: break-word;
  font-weight: 500;
}
</style>
