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
      <section class="upload-card">
        <div class="section-head">
          <div>
            <h2 class="section-title">写真を追加 / タグ設定</h2>
            <p v-if="uploadExpanded" class="section-copy">一度に最大10枚。タグ・メモ・カラーを先に揃えてから追加できます。</p>
          </div>
          <button class="upload-toggle-btn" type="button" @click="uploadExpanded = !uploadExpanded">
            {{ uploadExpanded ? '閉じる ▲' : '開く ▼' }}
          </button>
        </div>

        <template v-if="uploadExpanded">
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
                  <span class="chip-dot" :style="{ background: tagColors[tag.value] }" />
                  {{ tag.label }}
                </button>
              </div>
            </div>

            <div class="tag-color-section">
              <button class="tag-color-toggle" type="button" @click="showColorEditor = !showColorEditor">
                <span class="tag-color-toggle-dots">
                  <span v-for="tag in tagOptions" :key="tag.value" class="mini-dot" :style="{ background: tagColors[tag.value] }" />
                </span>
                タグカラー設定 {{ showColorEditor ? '▲' : '▼' }}
              </button>
              <div v-if="showColorEditor" class="tag-color-rows">
                <div v-for="tag in tagOptions" :key="tag.value" class="tag-color-row">
                  <span class="chip-dot" :style="{ background: tagColors[tag.value] }" />
                  <span class="tag-color-label">{{ tag.label }}</span>
                  <input
                    type="color"
                    class="color-input"
                    :value="tagColors[tag.value]"
                    @input="setTagColor(tag.value, ($event.target as HTMLInputElement).value)"
                  />
                  <button class="tag-color-reset" type="button" @click="resetTagColor(tag.value)">リセット</button>
                </div>
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
        </template>
      </section>

      <section class="photos-card">
        <div class="section-head">
          <div>
            <h2 class="section-title">写真構成</h2>
            <p class="section-copy">写真中心で全体像を把握しながら、公開・タグ・並び順をその場で整えられます。</p>
            <p class="section-copy section-copy--hint">写真は長押ししてドラッグすると並び替えできます。</p>
          </div>
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

        <!-- 選択モード（開閉式） -->
        <div class="collapsible-panel">
          <button
            class="panel-toggle-btn"
            :class="{ 'panel-toggle-btn--open': selectionMode }"
            type="button"
            @click="toggleSelectionMode"
          >
            <span class="panel-toggle-label">{{ selectionMode ? '選択モード終了 ▲' : '選択モード ▼' }}</span>
            <span v-if="selectionMode && selectedPhotoIds.length > 0" class="panel-badge">{{ selectedPhotoIds.length }}枚選択中</span>
          </button>

          <div v-if="selectionMode" class="bulk-bar">
            <div class="bulk-head">
              <strong>{{ selectedPhotoIds.length }}枚選択中</strong>
              <button class="text-btn" type="button" @click="clearSelectedPhotos">選択解除</button>
            </div>
            <div class="bulk-actions">
              <button class="secondary-btn" type="button" :disabled="selectedPhotoIds.length === 0" @click="bulkSetVisibility(true)">まとめて公開</button>
              <button class="secondary-btn" type="button" :disabled="selectedPhotoIds.length === 0" @click="bulkSetVisibility(false)">まとめて非公開</button>
              <button class="danger-btn" type="button" :disabled="selectedPhotoIds.length === 0" @click="bulkDelete">まとめて削除</button>
            </div>
            <div class="tag-chips">
              <button
                v-for="tag in tagOptions"
                :key="tag.value"
                type="button"
                class="tag-chip"
                :disabled="selectedPhotoIds.length === 0"
                :style="{ '--chip-color': tagColors[tag.value] }"
                @click="bulkSetTag(tag.value)"
              >
                <span class="chip-dot" :style="{ background: tagColors[tag.value] }" />
                {{ tag.label }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="photos.length === 0" class="timeline-empty">まだ写真がありません</div>

        <div v-else class="group-stack">
          <section v-for="group in groupedPhotos" :key="group.key" class="photo-group">
            <div class="group-head">
              <h3 class="group-title">
                <span class="group-title-dot" :style="{ background: groupTitleColor(group.key) }" />
                {{ group.title }}
              </h3>
              <span class="group-count">{{ group.photos.length }}枚</span>
            </div>

            <div class="photo-grid" :class="`photo-grid--${photoCardSize}`">
              <article
                v-for="(photo, index) in group.photos"
                :key="photo.id"
                class="photo-card"
                :class="[
                  `photo-card--${photoCardSize}`,
                  {
                    'photo-card--selected': selectedPhotoIds.includes(photo.id),
                    'photo-card--dragging': draggingPhotoId === photo.id,
                    'photo-card--drop-target': touchDropPhotoId === photo.id && draggingPhotoId !== photo.id,
                  },
                ]"
                :data-photo-id="photo.id"
                :data-group-key="group.key"
                draggable="true"
                @dragstart="onDragStart(group.key, photo.id)"
                @dragover.prevent
                @drop="onDrop(group.key, photo.id)"
                @pointerdown="onPointerDown($event, group.key, photo.id)"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp($event, group.key, photo.id)"
                @pointercancel="cancelPointerDrag"
                @click="handlePhotoCardClick(photo)"
              >
                <div class="photo-thumb-wrap">
                  <img :src="photo.url" class="photo-image" />
                  <div class="photo-overlay">
                    <div class="photo-overlay-left">
                      <label v-if="selectionMode" class="check-badge" @click.stop>
                        <input type="checkbox" :checked="selectedPhotoIds.includes(photo.id)" @change="togglePhotoSelection(photo.id)" />
                      </label>
                      <span v-else class="drag-badge" aria-hidden="true">⋮⋮</span>
                    </div>
                    <div class="photo-overlay-right">
                      <span v-if="project.coverPhotoId === photo.id" class="cover-badge">代表</span>
                    </div>
                  </div>
                </div>
                <div class="photo-card-foot" @click.stop>
                  <span class="tag-dot" :style="{ background: tagColors[photo.tag] }" :title="PROJECT_PHOTO_TAG_LABELS[photo.tag]" />
                  <div class="photo-foot-right">
                    <span v-if="photo.memo" class="memo-dot" title="メモあり" />
                    <button
                      class="toggle-switch toggle-switch--nano"
                      :class="{ on: photo.isPublic }"
                      type="button"
                      @click="togglePhotoPublic(photo)"
                    >
                      <span class="toggle-thumb" />
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <!-- マスコット代表画像（アフター写真の下） -->
        <div class="mascot-cover-row">
          <span class="field-label">マスコットを代表画像に</span>
          <div class="mascot-cover-options">
            <button
              class="mascot-cover-btn"
              :class="{ 'mascot-cover-btn--active': project.coverPhotoUrl === '/brand/buildog-helmet-mascot.png' && !project.coverPhotoId }"
              type="button"
              @click="setMascotCover('/brand/buildog-helmet-mascot.png')"
            >
              <img src="/brand/buildog-helmet-mascot.png" alt="ヘルメット" class="mascot-thumb" />
              <span class="mascot-label">ヘルメット</span>
            </button>
            <button
              class="mascot-cover-btn"
              :class="{ 'mascot-cover-btn--active': project.coverPhotoUrl === '/brand/normal.png' && !project.coverPhotoId }"
              type="button"
              @click="setMascotCover('/brand/normal.png')"
            >
              <img src="/brand/normal.png" alt="ノーマル" class="mascot-thumb" />
              <span class="mascot-label">ノーマル</span>
            </button>
            <button
              v-if="project.coverPhotoUrl && !project.coverPhotoId"
              class="mascot-cover-btn mascot-cover-btn--clear"
              type="button"
              @click="setMascotCover('')"
            >
              解除
            </button>
          </div>
        </div>
      </section>

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
            <button class="secondary-btn" :class="{ 'secondary-btn--copied': urlCopied }" @click="copyPublicUrl">
              {{ urlCopied ? 'コピーしました ✓' : '公開URLをコピー' }}
            </button>
            <button class="secondary-btn secondary-btn--accent" @click="previewPublicPage">公開ページをプレビュー</button>
            <button class="secondary-btn secondary-btn--accent" @click="openQrModal">QR共有</button>
          </div>
          <code class="share-url">{{ publicUrl }}</code>
        </div>
      </section>

      <!-- 共有メンバー -->
      <section class="sharing-card">
        <div class="section-head">
          <div>
            <h2 class="section-title">共有メンバー</h2>
            <p class="section-copy">案件を共有したいアカウントをメールアドレスで招待できます。</p>
          </div>
        </div>

        <!-- 招待フォーム (オーナーまたはcanInviteメンバー) -->
        <form v-if="canInviteMembers" class="invite-form" @submit.prevent="submitInvite">
          <input
            v-model="inviteEmail"
            class="field-input"
            type="email"
            placeholder="招待するメールアドレス"
            :disabled="inviting"
          />
          <button class="upload-btn" type="submit" :disabled="inviting || !inviteEmail.trim()">
            {{ inviting ? '招待中…' : '招待する' }}
          </button>
        </form>

        <!-- メンバー一覧 -->
        <div v-if="projectMembers.length > 0" class="member-list">
          <div v-for="member in projectMembers" :key="member.uid" class="member-row">
            <div class="member-info">
              <span class="member-name">{{ member.displayName || member.email }}</span>
              <span class="member-email">{{ member.email }}</span>
            </div>
            <div class="member-perms">
              <label class="perm-toggle" :class="{ 'perm-toggle--disabled': !isProjectOwner }">
                <span class="perm-label">編集</span>
                <button
                  class="toggle-switch toggle-switch--sm"
                  :class="{ on: member.canEdit }"
                  type="button"
                  :disabled="!isProjectOwner"
                  @click="isProjectOwner && toggleMemberPerm(member, 'canEdit')"
                >
                  <span class="toggle-thumb" />
                </button>
              </label>
              <label class="perm-toggle" :class="{ 'perm-toggle--disabled': !isProjectOwner }">
                <span class="perm-label">招待</span>
                <button
                  class="toggle-switch toggle-switch--sm"
                  :class="{ on: member.canInvite }"
                  type="button"
                  :disabled="!isProjectOwner"
                  @click="isProjectOwner && toggleMemberPerm(member, 'canInvite')"
                >
                  <span class="toggle-thumb" />
                </button>
              </label>
            </div>
            <button v-if="isProjectOwner" class="remove-member-btn" type="button" @click="removeMember(member)">
              ✕
            </button>
          </div>
        </div>
        <p v-else class="section-copy">まだメンバーはいません。</p>
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
          <button class="secondary-btn" type="button" @click="downloadEditingPhoto">保存 ↓</button>
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
          <button class="upload-btn" type="button" :disabled="generatingPdf" @click="downloadSharePdf">
            {{ generatingPdf ? '生成中…' : 'QRをPDFで共有' }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmModal />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { useRoute, useRouter } from 'vue-router'
import ConfirmModal from '../components/ConfirmModal.vue'
import PhotoUpload from '../components/PhotoUpload.vue'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'
import { projectStore } from '../store/projects'
import { PROJECT_PHOTO_TAG_LABELS, type ProjectMember, type ProjectPhoto, type ProjectPhotoTag } from '../types'

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

const { confirm } = useConfirm()
const { success: toastSuccess, error: toastError } = useToast()

const photoUploadRef = ref<InstanceType<typeof PhotoUpload> | null>(null)
const uploadMemo = ref('')
const uploadTag = ref<ProjectPhotoTag>('untagged')
const pendingFiles = ref<PendingUpload[]>([])
const uploadingPending = ref(false)
const uploadExpanded = ref(window.innerWidth >= 1024)
const photoCardSize = ref<CardSize>((localStorage.getItem(PHOTO_SIZE_STORAGE_KEY) as CardSize | null) ?? 'medium')

const editingPhoto = ref<ProjectPhoto | null>(null)
const editTag = ref<ProjectPhotoTag>('untagged')
const editMemo = ref('')
const editIsPublic = ref(false)

const selectionMode = ref(false)
const selectedPhotoIds = ref<string[]>([])

const draggingPhotoId = ref<string | null>(null)
const draggingGroupKey = ref<GroupKey | null>(null)
const touchDropPhotoId = ref<string | null>(null)
const touchLongPressTimer = ref<number | null>(null)
const suppressClickPhotoId = ref<string | null>(null)
const touchDragging = ref(false)

const showQrModal = ref(false)
const qrDataUrl = ref('')
const showColorEditor = ref(false)
const urlCopied = ref(false)
const generatingPdf = ref(false)

const sizeOptions: { value: CardSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

const tagOptions = Object.entries(PROJECT_PHOTO_TAG_LABELS).map(([value, label]) => ({
  value: value as ProjectPhotoTag,
  label,
}))

const TAG_COLORS_KEY = 'buildog_tag_colors'
const defaultTagColors: Record<ProjectPhotoTag, string> = {
  before: '#ff7a1a',
  during: '#3a8ef6',
  material: '#4ab87a',
  after: '#a463f2',
  untagged: '#888888',
}

function loadTagColors(): Record<ProjectPhotoTag, string> {
  try {
    const stored = localStorage.getItem(TAG_COLORS_KEY)
    return stored ? { ...defaultTagColors, ...JSON.parse(stored) } : { ...defaultTagColors }
  } catch {
    return { ...defaultTagColors }
  }
}

const tagColors = ref<Record<ProjectPhotoTag, string>>(loadTagColors())

function setTagColor(tag: ProjectPhotoTag, color: string) {
  tagColors.value = { ...tagColors.value, [tag]: color }
  localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(tagColors.value))
}

function resetTagColor(tag: ProjectPhotoTag) {
  setTagColor(tag, defaultTagColors[tag])
}

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

// 共有メンバー
const projectMembers = computed(() => projectStore.getMembers(projectId.value))
const isProjectOwner = computed(() => projectStore.isOwner(projectId.value))
const canInviteMembers = computed(() => projectStore.canInvite(projectId.value))
const inviteEmail = ref('')
const inviting = ref(false)

async function submitInvite() {
  if (!inviteEmail.value.trim() || inviting.value) return
  inviting.value = true
  try {
    const result = await projectStore.inviteMember(projectId.value, inviteEmail.value)
    if (result.success) {
      toastSuccess('メンバーを招待しました')
      inviteEmail.value = ''
    } else {
      toastError(result.error ?? '招待に失敗しました')
    }
  } finally {
    inviting.value = false
  }
}

async function toggleMemberPerm(member: ProjectMember, perm: 'canEdit' | 'canInvite') {
  await projectStore.updateMemberPermissions(projectId.value, member.uid, {
    [perm]: !member[perm],
  })
}

async function removeMember(member: ProjectMember) {
  const ok = await confirm({
    title: 'メンバーを削除',
    message: `${member.displayName || member.email} をこの案件から削除しますか？`,
    confirmLabel: '削除',
    danger: true,
  })
  if (!ok) return
  await projectStore.removeMember(projectId.value, member.uid)
  toastSuccess('メンバーを削除しました')
}

onMounted(() => {
  projectStore.subscribePhotos(projectId.value)
  projectStore.subscribeMembers(projectId.value)
})

onBeforeUnmount(() => {
  projectStore.unsubscribePhotos(projectId.value)
  projectStore.unsubscribeMembers(projectId.value)
  clearPendingFiles()
  cancelPointerDrag()
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
    toastSuccess('写真をアップロードしました')
  } catch {
    toastError('アップロードに失敗しました。通信環境を確認してください。')
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

async function togglePhotoPublic(photo: ProjectPhoto) {
  await projectStore.updatePhotoVisibility(projectId.value, photo.id, !photo.isPublic)
}

function handlePhotoCardClick(photo: ProjectPhoto) {
  if (suppressClickPhotoId.value === photo.id) {
    suppressClickPhotoId.value = null
    return
  }
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

async function bulkDelete() {
  if (selectedPhotoIds.value.length === 0) return
  const ok = await confirm({
    title: `${selectedPhotoIds.value.length}枚の写真を削除`,
    message: 'この操作は取り消せません。選択した写真をすべて削除しますか？',
    confirmLabel: '削除する',
    danger: true,
  })
  if (!ok) return
  try {
    await projectStore.deletePhotosBulk(projectId.value, [...selectedPhotoIds.value])
    clearSelectedPhotos()
    toastSuccess('写真を削除しました')
  } catch {
    toastError('削除に失敗しました。')
  }
}

function groupTitleColor(key: GroupKey): string {
  if (key === 'before') return tagColors.value.before
  if (key === 'during_material') return tagColors.value.during
  if (key === 'after') return tagColors.value.after
  return tagColors.value.untagged
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
  try {
    await projectStore.updatePhoto(projectId.value, editingPhoto.value.id, {
      tag: editTag.value,
      memo: editMemo.value,
      isPublic: editIsPublic.value,
    })
    closePhotoModal()
    toastSuccess('変更を保存しました')
  } catch {
    toastError('保存に失敗しました。')
  }
}

async function setCoverPhoto() {
  if (!editingPhoto.value) return
  try {
    await projectStore.setProjectCover(projectId.value, editingPhoto.value.id)
    closePhotoModal()
    toastSuccess('代表画像を設定しました')
  } catch {
    toastError('代表画像の設定に失敗しました。')
  }
}

async function downloadEditingPhoto() {
  if (!editingPhoto.value) return
  try {
    const res = await fetch(editingPhoto.value.url)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date(editingPhoto.value.createdAt).toISOString().slice(0, 10).replace(/-/g, '')
    a.download = `buildog_${dateStr}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // silent
  }
}

async function deleteEditingPhoto() {
  if (!editingPhoto.value) return
  const ok = await confirm({
    title: 'この写真を削除',
    message: '削除した写真は元に戻せません。',
    confirmLabel: '削除する',
    danger: true,
  })
  if (!ok) return
  try {
    await projectStore.deletePhoto(projectId.value, editingPhoto.value.id)
    closePhotoModal()
    toastSuccess('写真を削除しました')
  } catch {
    toastError('削除に失敗しました。')
  }
}

async function setMascotCover(url: string) {
  await projectStore.setCustomCover(projectId.value, url)
}

async function copyPublicUrl() {
  await navigator.clipboard.writeText(publicUrl.value)
  urlCopied.value = true
  setTimeout(() => { urlCopied.value = false }, 2200)
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
  if (!project.value || generatingPdf.value) return
  generatingPdf.value = true

  try {
    const qrSrc = qrDataUrl.value || await QRCode.toDataURL(publicUrl.value, { width: 400, margin: 1 })
    if (!qrDataUrl.value) qrDataUrl.value = qrSrc

    await document.fonts.ready

    const W = 1240
    const H = 1754
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    const f = (size: number, weight = '400') =>
      `${weight} ${size}px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`

    const NAVY = '#08162a'
    const BLUE = '#1e5aae'
    const ORANGE = '#d79a4a'
    const TEXT = '#132748'
    const MUTED = '#5a6b82'
    const LIGHT_BG = '#eef3fb'
    const WHITE = '#ffffff'
    const CREAM = '#f5f8fd'

    const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    const fitText = (text: string, maxW: number, size: number, weight = '900'): number => {
      let s = size
      ctx.font = f(s, weight)
      while (ctx.measureText(text).width > maxW && s > 22) { s -= 2; ctx.font = f(s, weight) }
      return s
    }

    const [mascot, qrImg] = await Promise.all([loadImg('/brand/buildog-helmet-mascot.png'), loadImg(qrSrc)])

    // ── Background ──
    ctx.fillStyle = CREAM
    ctx.fillRect(0, 0, W, H)

    // ─────────────────────────────────────
    // 1. HEADER  0–220
    // ─────────────────────────────────────
    const HEADER_H = 220
    const hGrad = ctx.createLinearGradient(0, 0, W, 0)
    hGrad.addColorStop(0, '#060f1e')
    hGrad.addColorStop(1, '#1a4a94')
    ctx.fillStyle = hGrad
    ctx.fillRect(0, 0, W, HEADER_H)

    // Orange top strip
    ctx.fillStyle = ORANGE
    ctx.fillRect(0, 0, W, 8)

    // Buildog badge (top-right)
    ctx.fillStyle = ORANGE
    ctx.font = f(24, '900')
    ctx.textAlign = 'right'
    ctx.fillText('Buildog', W - 54, 52)
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.font = f(16)
    ctx.fillText('施工写真共有サービス', W - 54, 76)
    ctx.textAlign = 'left'

    // Sub label
    ctx.fillStyle = 'rgba(255,255,255,0.48)'
    ctx.font = f(21, '500')
    ctx.fillText('施工写真のご報告', 54, 56)

    // Project name (auto-fit)
    const nameSize = fitText(project.value.name, W - 108 - 220, 60)
    ctx.fillStyle = WHITE
    ctx.font = f(nameSize, '900')
    ctx.fillText(project.value.name, 54, 138)

    // Client / address
    const subInfo = [project.value.clientName, project.value.siteAddress].filter(Boolean).join('  /  ')
    if (subInfo) {
      ctx.fillStyle = 'rgba(255,255,255,0.62)'
      ctx.font = f(21)
      const short = subInfo.length > 44 ? subInfo.slice(0, 44) + '…' : subInfo
      ctx.fillText(short, 54, 188)
    }

    // ─────────────────────────────────────
    // 2. PROMO  220–430
    // ─────────────────────────────────────
    const PROMO_Y = HEADER_H
    const PROMO_H = 210
    ctx.fillStyle = WHITE
    ctx.fillRect(0, PROMO_Y, W, PROMO_H)

    // Orange left accent
    ctx.fillStyle = ORANGE
    ctx.fillRect(54, PROMO_Y + 28, 6, 108)

    ctx.fillStyle = TEXT
    ctx.font = f(37, '900')
    ctx.fillText('いつでも・何度でも', 76, PROMO_Y + 78)
    ctx.fillText('スマホで確認できます', 76, PROMO_Y + 128)

    ctx.fillStyle = MUTED
    ctx.font = f(20)
    ctx.fillText('施工の記録を写真でわかりやすくまとめました。', 76, PROMO_Y + 166)
    ctx.fillText('大切な施工の証拠として、いつでもご覧いただけます。', 76, PROMO_Y + 194)

    // Mascot (overlaps header bottom + promo top)
    const M = 230
    ctx.drawImage(mascot, W - M - 36, PROMO_Y - 50, M, M)

    // ─────────────────────────────────────
    // 3. CTA BAND  430–480
    // ─────────────────────────────────────
    const CTA_Y = PROMO_Y + PROMO_H
    const CTA_H = 50
    ctx.fillStyle = LIGHT_BG
    ctx.fillRect(0, CTA_Y, W, CTA_H)
    ctx.fillStyle = BLUE
    ctx.font = f(22, '700')
    ctx.textAlign = 'center'
    ctx.fillText('▼  QRコードをスマホで読み取ってください  ▼', W / 2, CTA_Y + 34)
    ctx.textAlign = 'left'

    // ─────────────────────────────────────
    // 4. QR SECTION  480–870
    // ─────────────────────────────────────
    const QR_Y = CTA_Y + CTA_H
    const QR_SECTION_H = 390
    ctx.fillStyle = LIGHT_BG
    ctx.fillRect(0, QR_Y, W, QR_SECTION_H)

    const QR_SIZE = 280
    const QR_X = (W - QR_SIZE) / 2
    const QR_IMG_Y = QR_Y + 40

    ctx.save()
    ctx.shadowColor = 'rgba(30,90,174,0.20)'
    ctx.shadowBlur = 32
    ctx.shadowOffsetY = 8
    rr(QR_X - 28, QR_IMG_Y - 28, QR_SIZE + 56, QR_SIZE + 56, 24)
    ctx.fillStyle = WHITE
    ctx.fill()
    ctx.restore()

    ctx.drawImage(qrImg, QR_X, QR_IMG_Y, QR_SIZE, QR_SIZE)

    ctx.fillStyle = TEXT
    ctx.font = f(26, '700')
    ctx.textAlign = 'center'
    ctx.fillText('スマホのカメラをQRコードに向けるだけ', W / 2, QR_IMG_Y + QR_SIZE + 52)
    ctx.fillStyle = MUTED
    ctx.font = f(20)
    ctx.fillText('インターネット接続があればいつでもアクセス可能です', W / 2, QR_IMG_Y + QR_SIZE + 86)
    ctx.textAlign = 'left'

    // ─────────────────────────────────────
    // 5. STEP GUIDE  870–1170
    // ─────────────────────────────────────
    const STEPS_Y = QR_Y + QR_SECTION_H
    const STEPS_H = 300
    ctx.fillStyle = WHITE
    ctx.fillRect(0, STEPS_Y, W, STEPS_H)

    ctx.fillStyle = TEXT
    ctx.font = f(26, '900')
    ctx.textAlign = 'center'
    ctx.fillText('QRコードの読み方', W / 2, STEPS_Y + 50)
    ctx.textAlign = 'left'

    ctx.strokeStyle = 'rgba(30,90,174,0.10)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(100, STEPS_Y + 66)
    ctx.lineTo(W - 100, STEPS_Y + 66)
    ctx.stroke()

    const steps = [
      ['1', 'カメラアプリを起動する', 'スマホの標準カメラアプリを開きます'],
      ['2', 'QRコードにカメラを向ける', 'QRコードに近づけると自動で認識されます（目安：5〜10cm）'],
      ['3', '表示されたURLをタップする', 'バナーが表示されたらタップ。施工写真ページが開きます'],
    ]

    steps.forEach(([num, title, desc], i) => {
      const sy = STEPS_Y + 94 + i * 66
      const sx = 94

      ctx.beginPath()
      ctx.arc(sx, sy + 6, 24, 0, Math.PI * 2)
      ctx.fillStyle = BLUE
      ctx.fill()

      ctx.fillStyle = WHITE
      ctx.font = f(22, '700')
      ctx.textAlign = 'center'
      ctx.fillText(num, sx, sy + 14)
      ctx.textAlign = 'left'

      ctx.fillStyle = TEXT
      ctx.font = f(23, '700')
      ctx.fillText(title, sx + 44, sy + 6)
      ctx.fillStyle = MUTED
      ctx.font = f(19)
      ctx.fillText(desc, sx + 44, sy + 32)
    })

    ctx.fillStyle = MUTED
    ctx.font = f(17)
    ctx.fillText('※ iPhone（iOS 11以降）は標準カメラアプリ、AndroidはカメラアプリまたはブラウザのQR読み取りから', 90, STEPS_Y + STEPS_H - 18)

    // ─────────────────────────────────────
    // 6. URL BOX  1170–1280
    // ─────────────────────────────────────
    const URL_Y = STEPS_Y + STEPS_H
    const URL_H = 110
    ctx.fillStyle = '#eaeff8'
    ctx.fillRect(0, URL_Y, W, URL_H)

    ctx.fillStyle = MUTED
    ctx.font = f(18, '500')
    ctx.textAlign = 'center'
    ctx.fillText('ブラウザから直接アクセスする場合', W / 2, URL_Y + 30)

    rr(90, URL_Y + 44, W - 180, 46, 12)
    ctx.fillStyle = WHITE
    ctx.fill()

    ctx.fillStyle = BLUE
    ctx.font = f(19, '700')
    const urlDisp = publicUrl.value.length > 58 ? publicUrl.value.slice(0, 58) + '…' : publicUrl.value
    ctx.fillText(urlDisp, W / 2, URL_Y + 74)
    ctx.textAlign = 'left'

    // ─────────────────────────────────────
    // 7. FOOTER  1280–1754
    // ─────────────────────────────────────
    const FOOTER_Y = URL_Y + URL_H
    const fGrad = ctx.createLinearGradient(0, FOOTER_Y, 0, H)
    fGrad.addColorStop(0, '#08162a')
    fGrad.addColorStop(1, '#0e2450')
    ctx.fillStyle = fGrad
    ctx.fillRect(0, FOOTER_Y, W, H - FOOTER_Y)

    // Decorative mascot (ghost)
    ctx.globalAlpha = 0.12
    const FM = 380
    ctx.drawImage(mascot, W - FM - 20, FOOTER_Y + (H - FOOTER_Y - FM) / 2, FM, FM)
    ctx.globalAlpha = 1

    // Orange divider line
    ctx.fillStyle = ORANGE
    ctx.fillRect(54, FOOTER_Y + 12, 60, 4)

    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.font = f(19)
    ctx.fillText('この写真レポートは施工会社よりご提供しています', 54, FOOTER_Y + 60)

    ctx.fillStyle = WHITE
    ctx.font = f(46, '900')
    ctx.fillText('施工にお立ち会い', 54, FOOTER_Y + 148)
    ctx.fillText('いただきありがとうございました。', 54, FOOTER_Y + 210)

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = f(21)
    ctx.fillText('ご不明な点がございましたら、お気軽にお問い合わせください。', 54, FOOTER_Y + 264)

    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(54, FOOTER_Y + 296)
    ctx.lineTo(W - 54, FOOTER_Y + 296)
    ctx.stroke()

    ctx.fillStyle = ORANGE
    ctx.font = f(28, '900')
    ctx.fillText('Buildog', 54, FOOTER_Y + 358)
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.font = f(17)
    ctx.fillText('施工写真共有サービス  |  buildog-jp.web.app', 54, FOOTER_Y + 390)

    const imgData = canvas.toDataURL('image/jpeg', 0.94)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
    pdf.save(`buildog-share-${project.value.name}.pdf`)
  } finally {
    generatingPdf.value = false
  }
}

function triggerUploaderFocus() {
  uploadExpanded.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => photoUploadRef.value?.openPicker(), 80)
}

function onDragStart(groupKey: GroupKey, photoId: string) {
  draggingPhotoId.value = photoId
  draggingGroupKey.value = groupKey
  touchDropPhotoId.value = photoId
}

async function onDrop(groupKey: GroupKey, targetPhotoId: string) {
  if (!draggingPhotoId.value || draggingGroupKey.value !== groupKey || draggingPhotoId.value === targetPhotoId) {
    cancelPointerDrag()
    return
  }

  const section = groupedPhotos.value.find((entry) => entry.key === groupKey)
  if (!section) {
    cancelPointerDrag()
    return
  }

  const reordered = [...section.photos]
  const from = reordered.findIndex((entry) => entry.id === draggingPhotoId.value)
  const to = reordered.findIndex((entry) => entry.id === targetPhotoId)
  if (from === -1 || to === -1) {
    cancelPointerDrag()
    return
  }

  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)

  const flatIds = groupedPhotos.value.flatMap((entry) =>
    entry.key === groupKey ? reordered.map((photo) => photo.id) : entry.photos.map((photo) => photo.id)
  )
  await projectStore.reorderPhotos(projectId.value, flatIds)
  cancelPointerDrag()
}

function onPointerDown(event: PointerEvent, groupKey: GroupKey, photoId: string) {
  if (event.pointerType !== 'touch' || selectionMode.value) return
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  clearLongPressTimer()
  touchLongPressTimer.value = window.setTimeout(() => {
    draggingPhotoId.value = photoId
    draggingGroupKey.value = groupKey
    touchDropPhotoId.value = photoId
    touchDragging.value = true
    suppressClickPhotoId.value = photoId
  }, 220)
}

function onPointerMove(event: PointerEvent) {
  if (!touchDragging.value || event.pointerType !== 'touch') return
  event.preventDefault()
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-photo-id]') as HTMLElement | null
  if (!target) return
  const groupKey = target.dataset.groupKey as GroupKey | undefined
  if (!groupKey || groupKey !== draggingGroupKey.value) return
  touchDropPhotoId.value = target.dataset.photoId ?? null
}

async function onPointerUp(event: PointerEvent, groupKey: GroupKey, photoId: string) {
  clearLongPressTimer()
  if (!touchDragging.value || event.pointerType !== 'touch') return
  event.preventDefault()
  await onDrop(groupKey, touchDropPhotoId.value || photoId)
}

function clearLongPressTimer() {
  if (touchLongPressTimer.value) {
    window.clearTimeout(touchLongPressTimer.value)
    touchLongPressTimer.value = null
  }
}

function cancelPointerDrag() {
  clearLongPressTimer()
  draggingPhotoId.value = null
  draggingGroupKey.value = null
  touchDropPhotoId.value = null
  touchDragging.value = false
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

.section-copy--hint {
  margin-top: 4px;
  font-size: 12px;
}

.back-btn,
.secondary-btn,
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
.secondary-btn--copied {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--success);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

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
  touch-action: manipulation;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.photo-card--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(255, 122, 26, 0.22);
}

.photo-card--dragging {
  opacity: 0.82;
  transform: scale(0.98);
  box-shadow: 0 0 0 2px rgba(30, 90, 174, 0.2);
}

.photo-card--drop-target {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(30, 90, 174, 0.22);
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

.photo-overlay-left,
.photo-overlay-right {
  display: flex;
  gap: 6px;
}

.cover-badge,
.photo-tag,
.check-badge,
.drag-badge {
  width: fit-content;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.check-badge {
  background: rgba(15, 23, 32, 0.72);
  color: #fff;
}

.drag-badge {
  background: rgba(15, 23, 32, 0.72);
  color: #fff;
  letter-spacing: 0.06em;
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

.photo-switch-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.photo-status-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

/* 選択モード開閉パネル */
.collapsible-panel {
  display: grid;
  gap: 10px;
}

.panel-toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  width: fit-content;
  transition: background 0.12s, border-color 0.12s;
}

.panel-toggle-btn--open {
  background: var(--accent-bg);
  border-color: var(--border-accent);
  color: var(--accent-strong);
}

.panel-toggle-label { white-space: nowrap; }

.panel-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.bulk-bar {
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  display: grid;
}

.bulk-head,
.bulk-actions {
  flex-wrap: wrap;
  justify-content: flex-start;
}

/* グループタイトルのカラードット */
.group-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.group-title-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
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

.modal-head {
  position: sticky;
  top: -16px;
  z-index: 2;
  margin: -16px -16px 0;
  padding: calc(12px + env(safe-area-inset-top)) 16px 10px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
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

.toggle-switch--mini {
  width: 44px;
  height: 26px;
  padding: 3px;
}

.toggle-switch--mini .toggle-thumb {
  width: 20px;
  height: 20px;
}

.toggle-switch--mini.on .toggle-thumb {
  transform: translateX(18px);
}

/* 写真カード下部フッター（写真の外側） */
.photo-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  height: 30px;
}

.photo-foot-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* タグドット */
.tag-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

/* チップ内ドット */
.chip-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 2px;
  vertical-align: middle;
}

/* メモありインジケータ */
.memo-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd166;
  flex-shrink: 0;
}

/* ナノサイズトグル (写真カードフッター) */
.toggle-switch--nano {
  width: 34px;
  height: 19px;
  padding: 2px;
  flex-shrink: 0;
}

.toggle-switch--nano .toggle-thumb {
  width: 15px;
  height: 15px;
}

.toggle-switch--nano.on .toggle-thumb {
  transform: translateX(15px);
}

/* アップロードカード開閉ボタン */
.upload-toggle-btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* タグカラー設定 */
.tag-color-section {
  display: grid;
  gap: 10px;
}

.tag-color-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  width: fit-content;
}

.tag-color-toggle-dots {
  display: flex;
  gap: 3px;
}

.mini-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.tag-color-rows {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.tag-color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tag-color-label {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
}

.color-input {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-input);
  cursor: pointer;
}

.tag-color-reset {
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* マスコット代表画像 */
.mascot-cover-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.mascot-cover-options {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.mascot-cover-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 2px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  cursor: pointer;
  transition: border-color 0.15s;
}

.mascot-cover-btn--active {
  border-color: var(--accent);
}

.mascot-cover-btn--clear {
  height: 32px;
  padding: 0 12px;
  flex-direction: row;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  border-style: dashed;
}

.mascot-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}

.mascot-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
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

@media (max-width: 640px) {
  .tag-chip {
    min-height: 30px;
    padding: 0 10px;
    font-size: 11px;
  }

  .modal-card {
    max-height: calc(100vh - 12px);
    padding: 12px;
    gap: 10px;
  }

  .modal-head {
    top: -12px;
    margin: -12px -12px 0;
    padding: calc(10px + env(safe-area-inset-top)) 12px 8px;
  }

  .modal-title {
    font-size: 16px;
  }

  .close-btn,
  .secondary-btn,
  .upload-btn,
  .danger-btn {
    min-height: 36px;
    padding-inline: 12px;
    font-size: 12px;
  }

  .field-input,
  .field-textarea {
    padding: 12px;
    font-size: 14px;
  }

  .modal-image {
    border-radius: 12px;
  }
}

/* ===== 共有メンバー ===== */
.sharing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invite-form {
  display: flex;
  gap: 10px;
}

.invite-form .field-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-input);
  color: var(--text);
  padding: 12px 14px;
  outline: none;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  border-radius: 14px;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.member-name {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 12px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-perms {
  display: flex;
  gap: 14px;
  flex-shrink: 0;
}

.perm-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.perm-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 700;
}

.toggle-switch--sm {
  width: 36px;
  height: 20px;
}

.toggle-switch--sm .toggle-thumb {
  width: 14px;
  height: 14px;
  top: 3px;
  left: 3px;
}

.toggle-switch--sm.on .toggle-thumb {
  left: calc(100% - 17px);
}

.perm-toggle--disabled {
  opacity: 0.5;
}

.remove-member-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: var(--danger-bg);
  color: var(--danger);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
