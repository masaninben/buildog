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
          <span class="summary-label">共有導線</span>
          <div class="summary-actions">
            <button class="secondary-btn" @click="copyPublicUrl">公開URLをコピー</button>
            <button class="secondary-btn secondary-btn--accent" @click="previewPublicPage">公開ページをプレビュー</button>
            <button class="secondary-btn secondary-btn--accent" @click="openQrModal">QR共有</button>
          </div>
          <code class="share-url">{{ publicUrl }}</code>
        </div>
      </section>

      <section class="upload-card">
        <div class="section-head">
          <div>
            <h2 class="section-title">写真をまとめて追加</h2>
            <p class="section-copy">一度に最大10枚。タグとメモを先に揃えてから追加できます。</p>
          </div>
        </div>

        <PhotoUpload ref="photoUploadRef" :upload-path="`projects/${project.id}`" @select="onFilesSelected" />

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
            <input v-model="uploadMemo" class="field-input" type="text" placeholder="例）解体前 / 下地施工 / 完成引渡し前" />
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
            </article>
          </div>
        </div>
      </section>

      <section class="photos-card">
        <div class="section-head">
          <div>
            <h2 class="section-title">写真構成</h2>
            <p class="section-copy">写真中心で全体像を把握しながら、公開・タグ・並び順をその場で整えられます。</p>
          </div>

          <div class="hero-actions">
            <button class="secondary-btn" :class="{ 'secondary-btn--accent': selectionMode }" @click="toggleSelectionMode">
              {{ selectionMode ? '選択終了' : '選択モード' }}
            </button>
            <div class="size-switch">
              <button
                v-for="option in sizeOptions"
                :key="option.value"
                class="size-btn"
                :class="{ active: photoCardSize === option.value }"
                @click="setPhotoCardSize(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectionMode" class="bulk-bar">
          <div class="bulk-head">
            <strong>{{ selectedPhotoIds.length }}枚選択中</strong>
            <button class="text-btn" type="button" @click="clearSelectedPhotos">選択解除</button>
          </div>
          <div class="bulk-actions">
            <button class="secondary-btn" type="button" :disabled="selectedPhotoIds.length === 0" @click="bulkSetVisibility(true)">まとめて公開</button>
            <button class="secondary-btn" type="button" :disabled="selectedPhotoIds.length === 0" @click="bulkSetVisibility(false)">まとめて非公開</button>
          </div>
          <div class="tag-chips">
            <button
              v-for="tag in tagOptions"
              :key="tag.value"
              type="button"
              class="tag-chip"
              :disabled="selectedPhotoIds.length === 0"
              @click="bulkSetTag(tag.value)"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>

        <div v-if="photos.length === 0" class="timeline-empty">まだ写真がありません</div>

        <div v-else class="group-stack">
          <section v-for="group in groupedPhotos" :key="group.key" class="photo-group">
            <div class="group-head">
              <h3 class="group-title">{{ group.title }}</h3>
              <span class="group-count">{{ group.photos.length }}枚</span>
            </div>

            <div class="photo-grid" :class="`photo-grid--${photoCardSize}`">
              <article
                v-for="(photo, index) in group.photos"
                :key="photo.id"
                class="photo-card"
                :class="[`photo-card--${photoCardSize}`, { 'photo-card--selected': selectedPhotoIds.includes(photo.id) }]"
                draggable="true"
                @dragstart="onDragStart(group.key, photo.id)"
                @dragover.prevent
                @drop="onDrop(group.key, photo.id)"
                @click="handlePhotoCardClick(photo)"
              >
                <div class="photo-thumb-wrap">
                  <img :src="photo.url" class="photo-image" />
                  <div class="photo-overlay">
                    <label v-if="selectionMode" class="check-badge" @click.stop>
                      <input type="checkbox" :checked="selectedPhotoIds.includes(photo.id)" @change="togglePhotoSelection(photo.id)" />
                    </label>
                    <span v-else class="photo-status" :class="{ public: photo.isPublic }">{{ photo.isPublic ? '公開' : '非公開' }}</span>
                    <span v-if="project.coverPhotoId === photo.id" class="cover-badge">代表</span>
                  </div>
                </div>

                <div class="photo-body">
                  <div class="photo-meta-row">
                    <span class="photo-tag">{{ PROJECT_PHOTO_TAG_LABELS[photo.tag] }}</span>
                    <span class="photo-date">{{ index + 1 }}</span>
                  </div>
                  <p v-if="photo.memo" class="photo-caption">{{ photo.memo }}</p>
                  <div class="photo-actions">
                    <button class="mini-toggle" :class="{ on: photo.isPublic }" type="button" @click.stop="togglePhotoPublic(photo)">
                      {{ photo.isPublic ? '公開中' : '非公開' }}
                    </button>
                    <button class="sort-btn" type="button" @click.stop="movePhoto(photo.id, 'up')">↑</button>
                    <button class="sort-btn" type="button" @click.stop="movePhoto(photo.id, 'down')">↓</button>
                    <button class="edit-btn" type="button" @click.stop="openPhotoModal(photo)">編集</button>
                  </div>
                </div>
              </article>
            </div>
          </section>
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
            <textarea v-model="editMemo" class="field-textarea" rows="4" placeholder="顧客に伝えたい施工メモ" />
          </label>
        </div>

        <div class="modal-section modal-section--row">
          <span class="field-label">顧客に表示</span>
          <button class="toggle-switch" :class="{ on: editIsPublic }" type="button" @click="editIsPublic = !editIsPublic">
            <span class="toggle-thumb" />
          </button>
        </div>

        <div class="modal-actions">
          <button class="secondary-btn secondary-btn--accent" type="button" @click="setCoverPhoto">代表画像に設定</button>
          <button class="danger-btn" type="button" @click="deleteEditingPhoto">削除</button>
          <button class="secondary-btn" type="button" @click="closePhotoModal">キャンセル</button>
          <button class="upload-btn" type="button" @click="savePhotoEdits">保存する</button>
        </div>
      </div>
    </div>

    <div v-if="showQrModal" class="modal-overlay" @click.self="closeQrModal">
      <div class="modal-card modal-card--narrow">
        <div class="modal-head">
          <h3 class="modal-title">QR共有</h3>
          <button class="close-btn" type="button" @click="closeQrModal">✕</button>
        </div>
        <div class="qr-wrap">
          <img v-if="qrDataUrl" :src="qrDataUrl" class="qr-image" />
          <p class="helper-text">スマホで施工写真をご確認いただけます</p>
          <code class="share-url">{{ publicUrl }}</code>
        </div>
        <div class="modal-actions">
          <button class="secondary-btn" type="button" @click="copyPublicUrl">URLをコピー</button>
          <button class="upload-btn" type="button" @click="downloadSharePdf">PDFチラシを作成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { useRoute, useRouter } from 'vue-router'
import PhotoUpload from '../components/PhotoUpload.vue'
import { projectStore } from '../store/projects'
import { PROJECT_PHOTO_TAG_LABELS, type ProjectPhoto, type ProjectPhotoTag } from '../types'

interface PendingUpload {
  id: string
  file: File
  previewUrl: string
}

type CardSize = 'small' | 'medium' | 'large'
type GroupKey = 'before' | 'during_material' | 'after' | 'untagged'

const PHOTO_SIZE_STORAGE_KEY = 'buildog_photo_card_size'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)
const project = computed(() => projectStore.getProjectById(projectId.value))
const photos = computed(() => projectStore.getPhotos(projectId.value))
const isLoading = computed(() => !projectStore.loaded)

const photoUploadRef = ref<InstanceType<typeof PhotoUpload> | null>(null)
const uploadMemo = ref('')
const uploadTag = ref<ProjectPhotoTag>('untagged')
const pendingFiles = ref<PendingUpload[]>([])
const uploadingPending = ref(false)
const photoCardSize = ref<CardSize>((localStorage.getItem(PHOTO_SIZE_STORAGE_KEY) as CardSize | null) ?? 'medium')

const editingPhoto = ref<ProjectPhoto | null>(null)
const editTag = ref<ProjectPhotoTag>('untagged')
const editMemo = ref('')
const editIsPublic = ref(false)

const selectionMode = ref(false)
const selectedPhotoIds = ref<string[]>([])

const draggingPhotoId = ref<string | null>(null)
const draggingGroupKey = ref<GroupKey | null>(null)

const showQrModal = ref(false)
const qrDataUrl = ref('')

const sizeOptions: { value: CardSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

const tagOptions = Object.entries(PROJECT_PHOTO_TAG_LABELS).map(([value, label]) => ({
  value: value as ProjectPhotoTag,
  label,
}))

const publicUrl = computed(() => {
  const slug = project.value?.publicSlug || projectId.value
  return `${window.location.origin}/p/${slug}`
})

const groupedPhotos = computed(() => {
  const groups: { key: GroupKey; title: string; photos: ProjectPhoto[] }[] = [
    { key: 'before', title: 'ビフォー', photos: [] },
    { key: 'during_material', title: '施工中・材料', photos: [] },
    { key: 'after', title: 'アフター', photos: [] },
    { key: 'untagged', title: 'タグ未設定', photos: [] },
  ]

  for (const photo of photos.value) {
    if (photo.tag === 'before') groups[0].photos.push(photo)
    else if (photo.tag === 'during' || photo.tag === 'material') groups[1].photos.push(photo)
    else if (photo.tag === 'after') groups[2].photos.push(photo)
    else groups[3].photos.push(photo)
  }

  return groups.filter((group) => group.photos.length > 0)
})

onMounted(() => {
  projectStore.subscribePhotos(projectId.value)
})

onBeforeUnmount(() => {
  projectStore.unsubscribePhotos(projectId.value)
  clearPendingFiles()
})

function setPhotoCardSize(size: CardSize) {
  photoCardSize.value = size
  localStorage.setItem(PHOTO_SIZE_STORAGE_KEY, size)
}

function onFilesSelected(files: File[]) {
  const additions = files.map((file, index) => ({
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }))
  pendingFiles.value = [...pendingFiles.value, ...additions].slice(0, 10)
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
    uploadTag.value = 'untagged'
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

async function togglePhotoPublic(photo: ProjectPhoto) {
  await projectStore.updatePhotoVisibility(projectId.value, photo.id, !photo.isPublic)
}

function handlePhotoCardClick(photo: ProjectPhoto) {
  if (selectionMode.value) {
    togglePhotoSelection(photo.id)
    return
  }
  openPhotoModal(photo)
}

function toggleSelectionMode() {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    clearSelectedPhotos()
  }
}

function togglePhotoSelection(photoId: string) {
  const set = new Set(selectedPhotoIds.value)
  if (set.has(photoId)) set.delete(photoId)
  else set.add(photoId)
  selectedPhotoIds.value = [...set]
}

function clearSelectedPhotos() {
  selectedPhotoIds.value = []
}

async function bulkSetVisibility(isPublic: boolean) {
  await projectStore.updatePhotosBulk(projectId.value, selectedPhotoIds.value, { isPublic })
  clearSelectedPhotos()
}

async function bulkSetTag(tag: ProjectPhotoTag) {
  await projectStore.updatePhotosBulk(projectId.value, selectedPhotoIds.value, { tag })
  clearSelectedPhotos()
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

async function setCoverPhoto() {
  if (!editingPhoto.value) return
  await projectStore.setProjectCover(projectId.value, editingPhoto.value.id)
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

async function openQrModal() {
  qrDataUrl.value = await QRCode.toDataURL(publicUrl.value, { width: 360, margin: 1 })
  showQrModal.value = true
}

function closeQrModal() {
  showQrModal.value = false
}

async function downloadSharePdf() {
  if (!project.value) return
  if (!qrDataUrl.value) {
    qrDataUrl.value = await QRCode.toDataURL(publicUrl.value, { width: 360, margin: 1 })
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.setFillColor(15, 23, 32)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setTextColor(255, 122, 26)
  pdf.setFontSize(24)
  pdf.text('Buildog', 20, 28)
  pdf.setTextColor(238, 244, 248)
  pdf.setFontSize(22)
  pdf.text(project.value.name, 20, 46, { maxWidth: 170 })
  pdf.setFontSize(14)
  if (project.value.clientName) {
    pdf.text(`顧客名: ${project.value.clientName}`, 20, 58)
  }
  pdf.addImage(qrDataUrl.value, 'PNG', 55, 80, 100, 100)
  pdf.setFontSize(16)
  pdf.text('スマホで施工写真をご確認いただけます', 32, 195)
  pdf.setFontSize(11)
  pdf.text('QRコードを読み取ると、公開中の施工写真ページが開きます。', 28, 205)
  pdf.text(publicUrl.value, 20, 225, { maxWidth: 170 })
  pdf.save(`buildog-share-${project.value.name}.pdf`)
}

function triggerUploaderFocus() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  photoUploadRef.value?.openPicker()
}

function onDragStart(groupKey: GroupKey, photoId: string) {
  draggingPhotoId.value = photoId
  draggingGroupKey.value = groupKey
}

async function onDrop(groupKey: GroupKey, targetPhotoId: string) {
  if (!draggingPhotoId.value || draggingGroupKey.value !== groupKey || draggingPhotoId.value === targetPhotoId) return

  const section = groupedPhotos.value.find((entry) => entry.key === groupKey)
  if (!section) return

  const reordered = [...section.photos]
  const from = reordered.findIndex((entry) => entry.id === draggingPhotoId.value)
  const to = reordered.findIndex((entry) => entry.id === targetPhotoId)
  if (from === -1 || to === -1) return

  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)

  const flatIds = groupedPhotos.value.flatMap((entry) =>
    entry.key === groupKey ? reordered.map((photo) => photo.id) : entry.photos.map((photo) => photo.id)
  )
  await projectStore.reorderPhotos(projectId.value, flatIds)
  draggingPhotoId.value = null
  draggingGroupKey.value = null
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP')
}
</script>

<style scoped>
.project-detail-view {
  min-height: 100vh;
  padding: 16px 16px 92px;
  display: grid;
  gap: 16px;
  background:
    linear-gradient(180deg, rgba(30, 90, 174, 0.08), transparent 180px),
    var(--bg);
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
.summary-actions,
.group-head,
.hero-actions,
.bulk-head,
.bulk-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-head { align-items: flex-start; }
.page-head-main { flex: 1; }

.page-eyebrow {
  color: var(--accent-strong);
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
.group-count,
.helper-text {
  color: var(--text-sub);
}

.back-btn,
.secondary-btn,
.sort-btn,
.edit-btn,
.close-btn,
.size-btn {
  min-height: 38px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  padding: 0 14px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.secondary-btn--accent { color: var(--accent-strong); }

.state-card,
.summary-card,
.upload-card,
.photos-card,
.modal-card,
.bulk-bar {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow-sm);
}

.state-card { padding: 24px; }

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
  background:
    linear-gradient(180deg, rgba(30, 90, 174, 0.03), transparent),
    var(--bg-card);
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
  background: rgba(30, 90, 174, 0.16);
  padding: 4px;
  cursor: pointer;
}

.toggle-switch.on { background: var(--accent); }

.toggle-thumb {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #fff;
  transform: translateX(0);
  transition: transform 0.15s ease;
}

.toggle-switch.on .toggle-thumb { transform: translateX(22px); }

.upload-card,
.photos-card,
.bulk-bar {
  padding: 16px;
  display: grid;
  gap: 16px;
}

.section-title { font-size: 18px; }

.upload-controls { display: grid; gap: 14px; }

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag-chip {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-sub);
  font-weight: 700;
  cursor: pointer;
}

.tag-chip.active {
  background: var(--warm);
  border-color: var(--warm);
  color: #fff;
}

.tag-chip:disabled {
  opacity: 0.45;
  cursor: default;
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

.pending-actions { display: flex; gap: 8px; }

.pending-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pending-card {
  border-radius: 12px;
  overflow: hidden;
}

.pending-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.upload-btn,
.fab-add-btn {
  min-height: 42px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  padding: 0 16px;
}

.text-btn {
  min-height: 38px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
}

.size-switch {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.size-btn.active {
  background: var(--accent-bg);
  color: var(--accent);
}

.group-stack {
  display: grid;
  gap: 16px;
}

.group-head {
  margin-bottom: 8px;
}

.group-title {
  font-size: 13px;
  font-weight: 800;
}

.photo-grid {
  display: grid;
  gap: 8px;
}

.photo-grid--large {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.photo-grid--medium {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.photo-grid--small {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.photo-card {
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  cursor: pointer;
}

.photo-card--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(255, 122, 26, 0.22);
}

.photo-thumb-wrap {
  position: relative;
}

.photo-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.photo-overlay {
  position: absolute;
  inset: 6px 6px auto 6px;
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.photo-status,
.cover-badge,
.photo-tag,
.check-badge {
  width: fit-content;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.photo-status {
  background: rgba(15, 23, 32, 0.72);
  color: #fff;
}

.photo-status.public {
  background: rgba(84, 176, 125, 0.92);
}

.check-badge {
  background: rgba(15, 23, 32, 0.72);
  color: #fff;
}

.cover-badge {
  background: rgba(255, 122, 26, 0.92);
  color: #fff;
}

.photo-body {
  padding: 6px;
}

.photo-meta-row {
  align-items: flex-start;
}

.photo-tag {
  background: var(--accent-bg);
  color: var(--accent);
}

.photo-caption {
  margin-top: 6px;
  line-height: 1.45;
  color: var(--text-sub);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-card--large .photo-caption {
  font-size: 12px;
}

.photo-card--medium .photo-caption {
  font-size: 10px;
}

.photo-card--small .photo-caption {
  display: none;
}

.photo-actions {
  margin-top: 6px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.mini-toggle {
  min-height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: var(--bg-input);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.mini-toggle.on {
  background: var(--success-bg);
  color: var(--success);
}

.sort-btn {
  width: 32px;
  min-width: 32px;
  padding: 0;
}

.edit-btn {
  color: var(--accent);
}

.bulk-bar {
  gap: 12px;
}

.bulk-head,
.bulk-actions {
  flex-wrap: wrap;
  justify-content: flex-start;
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

.modal-card--narrow {
  width: min(100%, 420px);
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
  min-height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: var(--danger-bg);
  color: var(--danger);
  font-weight: 800;
  cursor: pointer;
}

.qr-wrap {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.qr-image {
  width: 220px;
  height: 220px;
  border-radius: 16px;
  background: #fff;
  padding: 12px;
}

@media (min-width: 900px) {
  .photo-grid--large {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .photo-grid--medium {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .photo-grid--small {
    grid-template-columns: repeat(10, minmax(0, 1fr));
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

  .pending-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
