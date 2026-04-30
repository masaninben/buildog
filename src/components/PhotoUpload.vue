<template>
  <div
    class="photo-upload"
    :class="{ 'photo-upload--dragging': isDragging }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden-input"
      @change="onFileSelect"
    />
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden-input"
      @change="onCameraSelect"
    />

    <div v-if="!compactMode" class="upload-visual">
      <div class="upload-icon">+</div>
      <p class="upload-title">ここに写真をドラッグ＆ドロップ</p>
      <p class="upload-copy">またはボタンから選択してください。最大10枚、アップ前に自動で軽く圧縮します。</p>
    </div>
    <div v-else class="upload-visual upload-visual--compact">
      <div class="upload-icon">+</div>
      <p class="upload-title">写真を追加</p>
      <p class="upload-copy">スマホではボタンから追加できます。最大10枚までまとめて選べます。</p>
    </div>

    <div class="upload-actions">
      <button class="add-photo-btn" type="button" @click="openPicker">
        写真を選択
      </button>
      <button v-if="compactMode" class="camera-btn" type="button" @click="openCamera">
        撮影する
      </button>
      <span class="helper-text">一度に追加できる写真は最大10枚です</span>
    </div>

    <p v-if="notice" class="notice-text">{{ notice }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

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
const cameraInput = ref<HTMLInputElement | null>(null)
const notice = ref('')
const isDragging = ref(false)
const compactMode = ref(false)
let mediaQuery: MediaQueryList | null = null

defineExpose({
  openPicker,
})

function openPicker() {
  fileInput.value?.click()
}

function openCamera() {
  cameraInput.value?.click()
}

async function handleFiles(selected: File[]) {
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
}

async function onFileSelect(event: Event) {
  const selected = Array.from((event.target as HTMLInputElement).files ?? [])
  await handleFiles(selected)
  ;(event.target as HTMLInputElement).value = ''
}

async function onCameraSelect(event: Event) {
  const selected = Array.from((event.target as HTMLInputElement).files ?? [])
  await handleFiles(selected)
  ;(event.target as HTMLInputElement).value = ''
}

function onDragEnter() {
  if (compactMode.value) return
  isDragging.value = true
}

function onDragLeave(event: DragEvent) {
  const next = event.relatedTarget as Node | null
  if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
    isDragging.value = false
  }
}

async function onDrop(event: DragEvent) {
  if (compactMode.value) return
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/'))
  await handleFiles(files)
}

function syncCompactMode() {
  compactMode.value = window.matchMedia('(max-width: 1024px)').matches
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 1024px)')
  syncCompactMode()
  mediaQuery.addEventListener('change', syncCompactMode)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncCompactMode)
})

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
  gap: 12px;
  padding: 22px;
  border: 1.5px dashed rgba(30, 90, 174, 0.28);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(215, 154, 74, 0.14), transparent 24%),
    linear-gradient(180deg, rgba(30, 90, 174, 0.03), transparent),
    var(--bg-surface);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.photo-upload--dragging {
  border-color: var(--accent);
  background:
    radial-gradient(circle at top right, rgba(215, 154, 74, 0.22), transparent 26%),
    linear-gradient(180deg, rgba(30, 90, 174, 0.12), transparent),
    var(--bg-surface);
  transform: scale(1.01);
}

.hidden-input {
  display: none;
}

.upload-visual {
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
  padding: 10px 0;
}

.upload-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fff;
  font-size: 28px;
  font-weight: 600;
}

.upload-title {
  font-size: 16px;
  font-weight: 800;
}

.upload-copy,
.helper-text,
.notice-text {
  font-size: 12px;
  line-height: 1.6;
}

.upload-copy,
.helper-text {
  color: var(--text-sub);
}

.upload-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.add-photo-btn {
  min-width: 160px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.camera-btn {
  min-width: 128px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--accent-strong);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.notice-text {
  color: var(--accent-strong);
  font-weight: 700;
}

@media (max-width: 1024px) {
  /* スマホ/タブレットではドラッグ領域を非表示にしてボタンだけ表示 */
  .photo-upload {
    padding: 0;
    border: none;
    background: none;
    border-radius: 0;
  }

  .upload-visual {
    display: none;
  }

  .upload-actions {
    align-items: stretch;
    flex-direction: row;
    gap: 8px;
  }

  .helper-text {
    display: none;
  }
}

@media (max-width: 640px) {
  .upload-actions {
    gap: 10px;
  }

  .add-photo-btn,
  .camera-btn {
    min-width: 0;
    flex: 1;
    height: 44px;
    font-size: 14px;
  }
}
</style>
