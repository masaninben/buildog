<template>
  <div class="photo-upload">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden-input"
      @change="onFileSelect"
    />

    <button class="add-photo-btn" type="button" @click="openPicker">
      ＋ 写真を追加
    </button>

    <p class="helper-text">複数枚をまとめて選択できます。撮影済み写真の整理に向いています。</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  uploadPath: string
}>()

const emit = defineEmits<{
  select: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function openPicker() {
  fileInput.value?.click()
}

function onFileSelect(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  if (files.length === 0) return
  emit('select', files)
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<style scoped>
.photo-upload {
  display: grid;
  gap: 10px;
}

.hidden-input {
  display: none;
}

.add-photo-btn {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 16px;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.helper-text {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
}
</style>
