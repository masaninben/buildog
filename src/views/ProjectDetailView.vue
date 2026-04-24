<template>
  <div class="project-detail-view">
    <div class="page-head">
      <button class="back-btn" @click="router.push({ name: 'project-list' })">←</button>
      <div class="page-head-main">
        <div>
          <p class="page-eyebrow">Project Detail</p>
          <h1 class="page-title">{{ project?.name || '案件詳細' }}</h1>
          <p v-if="project" class="page-meta">{{ [project.clientName, project.siteAddress].filter(Boolean).join(' / ') }}</p>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="state-card">読み込み中…</div>
    <div v-else-if="!project" class="state-card">案件が見つかりません</div>

    <template v-else-if="project">
      <section class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">公開設定</span>
          <div class="summary-row">
            <span>{{ project.isPublic ? '顧客に公開中' : '内部のみ' }}</span>
            <button class="toggle-switch" :class="{ on: project.isPublic }" @click="toggleProjectPublic">
              <span class="toggle-thumb" />
            </button>
          </div>
        </div>

        <div class="summary-card">
          <span class="summary-label">写真枚数</span>
          <span class="summary-value">{{ photos.length }}枚</span>
        </div>

        <div class="summary-card summary-card--wide">
          <span class="summary-label">共有確認</span>
          <div class="summary-actions">
            <button class="secondary-btn" @click="copyPublicUrl">公開URLをコピー</button>
            <button class="secondary-btn secondary-btn--accent" @click="previewPublicPage">公開ページをプレビュー</button>
          </div>
          <code class="share-url">{{ publicUrl }}</code>
        </div>
      </section>

      <section class="upload-card">
        <div class="section-head">
          <div>
            <h2 class="section-title">写真をまとめて追加</h2>
            <p class="section-copy">アップ前にタグとメモを揃えて、顧客に見せる構成を整えます。</p>
          </div>
        </div>

        <PhotoUpload :upload-path="`projects/${project.id}`" @select="onFilesSelected" />

        <div class="upload-controls">
          <div>
            <p class="field-label">まとめて付けるタグ</p>
            <div class="tag-chips">
              <button
                v-for="tag in tagOptions"
                :key="tag.value"
                type="button"
                class="tag-chip"
                :class="{ active: uploadTag === tag.value }"
                @click="uploadTag = tag.value"
              >
                {{ tag.label }}
              </button>
            </div>
          </div>

          <label class="memo-field">
            <span class="field-label">まとめて入れるメモ</span>
            <input v-model="uploadMemo" class="field-input" type="text" placeholder="例）解体前 / 断熱材施工 / 完成引き渡し前" />
          </label>
        </div>

        <div v-if="pendingFiles.length > 0" class="pending-wrap">
          <div class="pending-head">
            <p class="pending-count">{{ pendingFiles.length }}枚をアップロード待ち</p>
            <div class="pending-actions">
              <button class="text-btn" type="button" @click="clearPendingFiles">クリア</button>
              <button class="upload-btn" type="button" :disabled="uploadingPending" @click="uploadPendingFiles">
                {{ uploadingPending ? 'アップロード中…' : `${pendingFiles.length}枚を追加` }}
              </button>
            </div>
          </div>

          <div class="pending-grid">
            <article v-for="file in pendingFiles" :key="file.id" class="pending-card">
              <img :src="file.previewUrl" class="pending-image" />
              <div class="pending-meta">
                <span class="pending-name">{{ file.file.name }}</span>
                <span class="pending-size">{{ formatFileSize(file.file.size) }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="photos-card">
        <div class="section-head section-head--tight">
          <div>
            <h2 class="section-title">写真構成</h2>
            <p class="section-copy">一覧性を優先し、タップで詳細編集できます。順番は上下ボタンで調整します。</p>
          </div>
        </div>

        <div v-if="photos.length === 0" class="timeline-empty">まだ写真がありません</div>

        <div v-else class="photo-grid">
          <article v-for="(photo, index) in photos" :key="photo.id" class="photo-card" @click="openPhotoModal(photo)">
            <div class="photo-thumb-wrap">
              <img :src="photo.url" class="photo-image" />
              <div class="photo-overlay">
                <span class="photo-status" :class="{ public: photo.isPublic }">{{ photo.isPublic ? '公開中' : '非公開' }}</span>
                <span class="photo-order">#{{ index + 1 }}</span>
              </div>
            </div>

            <div class="photo-body">
              <div class="photo-meta-row">
                <span class="photo-tag">{{ PROJECT_PHOTO_TAG_LABELS[photo.tag] }}</span>
                <span class="photo-date">{{ formatDateTime(photo.createdAt) }}</span>
              </div>
              <p v-if="photo.memo" class="photo-caption">{{ photo.memo }}</p>
              <div class="photo-actions">
                <button class="sort-btn" type="button" @click.stop="movePhoto(photo.id, 'up')">↑</button>
                <button class="sort-btn" type="button" @click.stop="movePhoto(photo.id, 'down')">↓</button>
                <button class="edit-btn" type="button" @click.stop="openPhotoModal(photo)">編集</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

    <button v-if="project" class="fab-add-btn" type="button" @click="triggerUploaderFocus">
      ＋ 写真を追加
    </button>

    <div v-if="editingPhoto" class="modal-overlay" @click.self="closePhotoModal">
      <div class="modal-card">
        <div class="modal-head">
          <h3 class="modal-title">写真を編集</h3>
          <button class="close-btn" type="button" @click="closePhotoModal">✕</button>
        </div>

        <img :src="editingPhoto.url" class="modal-image" />

        <div class="modal-section">
          <p class="field-label">タグ</p>
          <div class="tag-chips">
            <button
              v-for="tag in tagOptions"
              :key="tag.value"
              type="button"
              class="tag-chip"
              :class="{ active: editTag === tag.value }"
              @click="editTag = tag.value"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>

        <div class="modal-section">
          <label class="memo-field">
            <span class="field-label">メモ</span>
            <textarea v-model="editMemo" class="field-textarea" rows="4" placeholder="顧客に伝えたい内容や工程メモ" />
          </label>
        </div>

        <div class="modal-section modal-section--row">
          <span class="field-label">顧客に表示</span>
          <button class="toggle-switch" :class="{ on: editIsPublic }" type="button" @click="editIsPublic = !editIsPublic">
            <span class="toggle-thumb" />
          </button>
        </div>

        <div class="modal-actions">
          <button class="danger-btn" type="button" @click="deleteEditingPhoto">削除</button>
          <button class="secondary-btn" type="button" @click="closePhotoModal">キャンセル</button>
          <button class="upload-btn" type="button" @click="savePhotoEdits">保存する</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoUpload from '../components/PhotoUpload.vue'
import { projectStore } from '../store/projects'
import { PROJECT_PHOTO_TAG_LABELS, type ProjectPhoto, type ProjectPhotoTag } from '../types'

interface PendingUpload {
  id: string
  file: File
  previewUrl: string
}

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)
const project = computed(() => projectStore.getProjectById(projectId.value))
const photos = computed(() => projectStore.getPhotos(projectId.value))
const isLoading = computed(() => !projectStore.loaded)

const uploadMemo = ref('')
const uploadTag = ref<ProjectPhotoTag>('during')
const pendingFiles = ref<PendingUpload[]>([])
const uploadingPending = ref(false)

const editingPhoto = ref<ProjectPhoto | null>(null)
const editTag = ref<ProjectPhotoTag>('during')
const editMemo = ref('')
const editIsPublic = ref(false)

const tagOptions = Object.entries(PROJECT_PHOTO_TAG_LABELS).map(([value, label]) => ({
  value: value as ProjectPhotoTag,
  label,
}))

const publicUrl = computed(() => {
  const slug = project.value?.publicSlug || projectId.value
  return `${window.location.origin}/p/${slug}`
})

onMounted(() => {
  projectStore.subscribePhotos(projectId.value)
})

onBeforeUnmount(() => {
  projectStore.unsubscribePhotos(projectId.value)
  clearPendingFiles()
})

function onFilesSelected(files: File[]) {
  const additions = files.map((file, index) => ({
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }))
  pendingFiles.value = [...pendingFiles.value, ...additions]
}

function clearPendingFiles() {
  pendingFiles.value.forEach((entry) => URL.revokeObjectURL(entry.previewUrl))
  pendingFiles.value = []
}

async function uploadPendingFiles() {
  if (pendingFiles.value.length === 0 || uploadingPending.value) return
  uploadingPending.value = true

  try {
    await projectStore.addPhotos(
      projectId.value,
      pendingFiles.value.map((entry) => entry.file),
      { memo: uploadMemo.value, tag: uploadTag.value }
    )
    clearPendingFiles()
    uploadMemo.value = ''
    uploadTag.value = 'during'
  } finally {
    uploadingPending.value = false
  }
}

async function toggleProjectPublic() {
  if (!project.value) return
  await projectStore.updateProject(project.value.id, {
    isPublic: !project.value.isPublic,
  })
}

async function movePhoto(photoId: string, direction: 'up' | 'down') {
  await projectStore.movePhoto(projectId.value, photoId, direction)
}

function openPhotoModal(photo: ProjectPhoto) {
  editingPhoto.value = photo
  editTag.value = photo.tag
  editMemo.value = photo.memo
  editIsPublic.value = photo.isPublic
}

function closePhotoModal() {
  editingPhoto.value = null
}

async function savePhotoEdits() {
  if (!editingPhoto.value) return
  await projectStore.updatePhoto(projectId.value, editingPhoto.value.id, {
    tag: editTag.value,
    memo: editMemo.value,
    isPublic: editIsPublic.value,
  })
  closePhotoModal()
}

async function deleteEditingPhoto() {
  if (!editingPhoto.value) return
  const ok = window.confirm('この写真を削除しますか？')
  if (!ok) return
  await projectStore.deletePhoto(projectId.value, editingPhoto.value.id)
  closePhotoModal()
}

async function copyPublicUrl() {
  await navigator.clipboard.writeText(publicUrl.value)
}

function previewPublicPage() {
  window.open(publicUrl.value, '_blank', 'noopener,noreferrer')
}

function triggerUploaderFocus() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP')
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}
</script>

<style scoped>
.project-detail-view {
  min-height: 100vh;
  padding: 16px 16px 92px;
  display: grid;
  gap: 16px;
}

.page-head,
.page-head-main,
.summary-row,
.section-head,
.pending-head,
.photo-meta-row,
.photo-actions,
.modal-head,
.modal-section--row,
.summary-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-head {
  align-items: flex-start;
}

.page-head-main {
  flex: 1;
}

.page-eyebrow {
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.page-title {
  font-size: clamp(22px, 5vw, 32px);
  line-height: 1.2;
  margin-top: 4px;
}

.page-meta,
.section-copy,
.photo-date,
.timeline-empty,
.pending-size,
.helper-copy {
  color: var(--text-sub);
}

.back-btn,
.secondary-btn,
.sort-btn,
.edit-btn,
.close-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  padding: 0 14px;
  cursor: pointer;
}

.secondary-btn--accent {
  color: var(--accent);
}

.state-card,
.summary-card,
.upload-card,
.photos-card,
.modal-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
}

.state-card {
  padding: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card--wide {
  grid-column: span 1;
}

.summary-label,
.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summary-value {
  font-size: 26px;
  font-weight: 900;
}

.summary-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.share-url {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--bg-input);
  color: var(--text-sub);
  overflow-wrap: anywhere;
  font-size: 12px;
}

.toggle-switch {
  width: 54px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  padding: 4px;
  cursor: pointer;
}

.toggle-switch.on {
  background: var(--accent);
}

.toggle-thumb {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #fff;
  transform: translateX(0);
  transition: transform 0.15s ease;
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(22px);
}

.upload-card,
.photos-card {
  padding: 16px;
  display: grid;
  gap: 16px;
}

.section-head--tight {
  align-items: flex-end;
}

.section-title {
  font-size: 18px;
}

.upload-controls {
  display: grid;
  gap: 14px;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag-chip {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-sub);
  font-weight: 700;
  cursor: pointer;
}

.tag-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.memo-field {
  display: grid;
  gap: 8px;
}

.field-input,
.field-textarea {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text);
}

.pending-wrap {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: var(--bg-surface);
}

.pending-head {
  align-items: flex-start;
}

.pending-actions {
  display: flex;
  gap: 8px;
}

.pending-count {
  font-weight: 800;
}

.upload-btn,
.fab-add-btn {
  height: 44px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  padding: 0 16px;
}

.text-btn {
  height: 44px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
}

.pending-grid,
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pending-card,
.photo-card {
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
}

.pending-image,
.photo-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.pending-meta,
.photo-body {
  padding: 10px;
}

.pending-meta {
  display: grid;
  gap: 4px;
}

.pending-name {
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-card {
  cursor: pointer;
}

.photo-thumb-wrap {
  position: relative;
}

.photo-overlay {
  position: absolute;
  inset: 10px 10px auto 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.photo-status,
.photo-order,
.photo-tag {
  width: fit-content;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.photo-status,
.photo-order {
  background: rgba(15, 23, 32, 0.72);
  color: #fff;
}

.photo-status.public {
  background: rgba(84, 176, 125, 0.92);
}

.photo-meta-row {
  align-items: flex-start;
}

.photo-tag {
  background: var(--accent-bg);
  color: var(--accent);
}

.photo-caption {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-sub);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-actions {
  margin-top: 10px;
  justify-content: flex-start;
}

.sort-btn {
  width: 40px;
  padding: 0;
}

.edit-btn {
  color: var(--accent);
}

.fab-add-btn {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  box-shadow: var(--shadow-md);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: min(100%, 560px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.modal-title {
  font-size: 18px;
}

.modal-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 16px;
}

.modal-section {
  display: grid;
  gap: 8px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.danger-btn {
  height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: var(--danger-bg);
  color: var(--danger);
  font-weight: 800;
  cursor: pointer;
}

@media (min-width: 900px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .page-head-main,
  .section-head,
  .pending-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
