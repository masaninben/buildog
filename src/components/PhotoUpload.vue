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

    <p class="helper-text">一度に追加できる写真は最大10枚です。選択後にまとめてプレビューできます。</p>
    <p v-if="notice" class="notice-text">{{ notice }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const MAX_FILES = 10
const MAX_WIDTH = 1600
const JPEG_QUALITY = 0.82

defineProps<{
  uploadPath: string
}>()

const emit = defineEmits<{
  select: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const notice = ref('')

function openPicker() {
  fileInput.value?.click()
}

async function onFileSelect(event: Event) {
  const selected = Array.from((event.target as HTMLInputElement).files ?? [])
  if (selected.length === 0) return

  let files = selected
  if (selected.length > MAX_FILES) {
    files = selected.slice(0, MAX_FILES)
    notice.value = `一度に追加できるのは最大${MAX_FILES}枚です。先頭の${MAX_FILES}枚を読み込みました。`
  } else {
    notice.value = ''
  }

  const compressed = await Promise.all(files.map((file) => compressImage(file)))
  emit('select', compressed)
  ;(event.target as HTMLInputElement).value = ''
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })
  if (!blob) return file

  const nextName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], nextName, { type: 'image/jpeg', lastModified: Date.now() })
}
</script>

<style scoped>
.photo-upload {
  display: grid;
  gap: 8px;
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

.helper-text,
.notice-text {
  font-size: 12px;
  line-height: 1.6;
}

.helper-text {
  color: var(--text-sub);
}

.notice-text {
  color: var(--accent);
  font-weight: 700;
}
</style>
