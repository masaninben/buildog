<template>
  <div class="photo-upload">

    <!-- プレビューエリア -->
    <div v-if="previewUrl" class="preview-wrap">
      <div class="preview-img-wrap" :class="{ transparent: bgRemoved }">
        <img :src="previewUrl" class="preview-img" />
      </div>

      <div v-if="processing" class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <p class="progress-label">{{ progressLabel }}</p>
      </div>

      <div v-else class="preview-actions">
        <button
          v-if="!bgRemoved"
          class="bg-remove-btn"
          @click="doRemoveBackground"
        >✂️ 背景を除去</button>
        <button
          v-if="bgRemoved"
          class="bg-remove-btn secondary"
          @click="resetToOriginal"
        >↩ 元に戻す</button>
        <button
          class="use-btn"
          :disabled="uploading"
          @click="confirmUpload"
        >
          <span v-if="uploading">アップロード中…</span>
          <span v-else>この画像を使う ✓</span>
        </button>
        <button class="retake-btn" @click="reset">撮り直す</button>
      </div>
    </div>

    <!-- 撮影 / 選択ボタン -->
    <div v-else class="select-wrap">
      <label class="camera-btn">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden-input"
          @change="onFileSelect"
        />
        📷 撮影する
      </label>
      <label class="gallery-btn">
        <input
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="onFileSelect"
        />
        🖼 ライブラリから選ぶ
      </label>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string

const props = defineProps<{
  uploadPath: string   // Cloudinary folder 内のパス識別子
}>()

const emit = defineEmits<{
  done: [url: string]
  cancel: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const originalBlob = ref<Blob | null>(null)
const processedBlob = ref<Blob | null>(null)
const bgRemoved = ref(false)
const processing = ref(false)
const uploading = ref(false)
const progressPct = ref(0)
const progressLabel = ref('')

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  originalBlob.value = file
  processedBlob.value = null
  bgRemoved.value = false
  previewUrl.value = URL.createObjectURL(file)
}

async function doRemoveBackground() {
  if (!originalBlob.value) return
  processing.value = true
  progressPct.value = 0
  progressLabel.value = 'モデルを準備中…'

  try {
    const { removeBackground } = await import('@imgly/background-removal')
    const resultBlob = await removeBackground(originalBlob.value, {
      debug: false,
      progress: (key: string, current: number, total: number) => {
        progressPct.value = total > 0 ? Math.round((current / total) * 100) : 0
        if (key.includes('fetch') || key.includes('download')) {
          progressLabel.value = `モデルをダウンロード中… ${progressPct.value}%`
        } else {
          progressLabel.value = `背景を解析中… ${progressPct.value}%`
        }
      },
      output: { format: 'image/png', quality: 0.9 },
    })
    processedBlob.value = resultBlob
    previewUrl.value = URL.createObjectURL(resultBlob)
    bgRemoved.value = true
  } catch (e) {
    console.error('background removal failed:', e)
    alert('背景除去に失敗しました。そのまま使用できます。')
  } finally {
    processing.value = false
  }
}

function resetToOriginal() {
  if (!originalBlob.value) return
  processedBlob.value = null
  previewUrl.value = URL.createObjectURL(originalBlob.value)
  bgRemoved.value = false
}

async function confirmUpload() {
  const blob = processedBlob.value ?? originalBlob.value
  if (!blob) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', blob)
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', `penstok/${props.uploadPath}`)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form }
    )
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message ?? `HTTP ${res.status}`
      throw new Error(msg)
    }
    emit('done', data.secure_url as string)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('upload failed:', msg)
    alert(`アップロードに失敗しました。\n${msg}`)
  } finally {
    uploading.value = false
  }
}

function reset() {
  previewUrl.value = ''
  originalBlob.value = null
  processedBlob.value = null
  bgRemoved.value = false
  progressPct.value = 0
}
</script>

<style scoped>
.photo-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hidden-input {
  display: none;
}

/* 撮影ボタン群 */
.select-wrap {
  display: flex;
  gap: 8px;
}

.camera-btn,
.gallery-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.camera-btn {
  background: #8b6914;
  color: #fff;
  border: none;
}
.camera-btn:hover { background: #70530f; }

.gallery-btn {
  background: #fff;
  color: #8b6914;
  border: 1.5px solid #8b6914;
}
.gallery-btn:hover { background: #fdf8f0; }

/* プレビュー */
.preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-img-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f0ece4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-img-wrap.transparent {
  background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 16px 16px;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

/* プログレスバー */
.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  height: 4px;
  background: #e0dbd0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #8b6914;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 11px;
  color: #b0a090;
  text-align: center;
}

/* プレビューアクション */
.preview-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bg-remove-btn {
  height: 40px;
  border: 1.5px solid #4f65d2;
  border-radius: 8px;
  background: #fff;
  color: #4f65d2;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.bg-remove-btn:hover { background: #eef1fb; }
.bg-remove-btn.secondary {
  border-color: #b0a090;
  color: #8a8070;
}
.bg-remove-btn.secondary:hover { background: #f5f2ec; }

.use-btn {
  height: 44px;
  background: #8b6914;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.use-btn:hover:not(:disabled) { background: #70530f; }
.use-btn:disabled { opacity: 0.5; cursor: default; }

.retake-btn {
  height: 36px;
  background: none;
  border: none;
  color: #b0a090;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
