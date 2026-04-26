<template>
  <div class="public-project-view">
    <header class="pub-header">
      <div class="pub-header-text">
        <p class="pub-badge">Buildog</p>
        <h1 class="pub-title">{{ project?.name || '施工レポート' }}</h1>
        <p v-if="project?.siteAddress" class="pub-meta">{{ project.siteAddress }}</p>
      </div>
    </header>

    <main class="pub-body">
      <div v-if="loading" class="state-msg">読み込み中…</div>
      <div v-else-if="!project" class="state-msg">この施工レポートは公開されていません。</div>

      <template v-else>
        <section class="overview-card">
          <div class="overview-item">
            <span class="overview-label">施工写真</span>
            <span class="overview-value">{{ photos.length }}枚</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">最終更新</span>
            <span class="overview-value overview-value--date">{{ formatDate(project.updatedAt) }}</span>
          </div>
        </section>

        <section class="photo-section">
          <div class="section-head">
            <h2 class="section-title">施工の記録</h2>
            <div class="size-switch">
              <button
                v-for="opt in sizeOptions"
                :key="opt.value"
                class="size-btn"
                :class="{ active: photoSize === opt.value }"
                @click="setPhotoSize(opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>

          <div v-if="photos.length === 0" class="empty-state">
            <img src="/brand/buildog-helmet-mascot.png" alt="" class="empty-mascot" />
            <p class="empty-text">現在、公開中の写真はありません。</p>
            <p class="empty-sub">施工開始後に写真が追加されます。</p>
          </div>

          <template v-else>
            <div v-for="group in photoGroups" :key="group.tag" class="photo-group">
              <h3 class="group-label">{{ group.label }}</h3>
              <div class="photo-grid" :class="`photo-grid--${photoSize}`">
                <article v-for="photo in group.photos" :key="photo.id" class="photo-card" @click="openLightbox(photo)">
                  <div class="photo-wrap">
                    <img :src="photo.url" :alt="group.label" class="photo-image" loading="lazy" />
                    <div v-if="photo.memo" class="photo-memo-badge">メモあり</div>
                  </div>
                </article>
              </div>
            </div>
          </template>
        </section>
      </template>
    </main>

    <!-- ライトボックス -->
    <div v-if="lightboxPhoto" class="lightbox" @click.self="lightboxPhoto = null">
      <div class="lightbox-inner">
        <button class="lightbox-close" @click="lightboxPhoto = null">✕</button>
        <img :src="lightboxPhoto.url" class="lightbox-img" />
        <div v-if="lightboxPhoto.memo" class="lightbox-memo">{{ lightboxPhoto.memo }}</div>
        <p class="lightbox-date">{{ formatDateTime(lightboxPhoto.createdAt) }}</p>
      </div>
    </div>

    <footer class="pub-footer">
      <span class="pub-footer-logo">Buildog</span>
      <p class="pub-footer-copy">施工記録をわかりやすく施主様へ</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { projectStore } from '../store/projects'
import { PROJECT_PHOTO_TAG_LABELS, type BuildogProject, type ProjectPhoto } from '../types'

type PhotoSize = 'small' | 'medium' | 'large'

const PUB_SIZE_KEY = 'buildog_pub_photo_size'
const sizeOptions: { value: PhotoSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

const route = useRoute()
const loading = ref(true)
const project = ref<BuildogProject | null>(null)
const photos = ref<ProjectPhoto[]>([])
const lightboxPhoto = ref<ProjectPhoto | null>(null)
const photoSize = ref<PhotoSize>((localStorage.getItem(PUB_SIZE_KEY) as PhotoSize | null) ?? 'medium')

const TAG_ORDER = ['before', 'during', 'material', 'after', 'unset'] as const

const photoGroups = computed(() => {
  return TAG_ORDER
    .map(tag => ({
      tag,
      label: PROJECT_PHOTO_TAG_LABELS[tag as keyof typeof PROJECT_PHOTO_TAG_LABELS] ?? tag,
      photos: photos.value.filter(p => p.tag === tag),
    }))
    .filter(g => g.photos.length > 0)
})

onMounted(async () => {
  try {
    const result = await projectStore.fetchPublicProject(route.params.projectId as string)
    if (!result) return
    project.value = result.project
    photos.value = result.photos
  } finally {
    loading.value = false
  }
})

function setPhotoSize(size: PhotoSize) {
  photoSize.value = size
  localStorage.setItem(PUB_SIZE_KEY, size)
}

function openLightbox(photo: ProjectPhoto) {
  lightboxPhoto.value = photo
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ja-JP')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.public-project-view {
  min-height: 100vh;
  background: var(--bg);
}

/* ヘッダー */
.pub-header {
  padding: 20px 16px 14px;
  background: linear-gradient(180deg, rgba(30,90,174,0.12), transparent 100%);
}

.pub-header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 1200px;
  margin: 0 auto;
}

.pub-badge {
  color: var(--accent-strong);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pub-title {
  font-size: clamp(20px, 5vw, 36px);
  font-weight: 900;
  line-height: 1.2;
}

.pub-meta {
  font-size: 13px;
  color: var(--text-sub);
}

/* ボディ */
.pub-body {
  padding: 12px 12px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1200px;
  margin: 0 auto;
}

.state-msg {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

/* 概要カード */
.overview-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px 16px;
  display: flex;
  gap: 24px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.overview-value {
  font-size: 24px;
  font-weight: 900;
}

.overview-value--date {
  font-size: 16px;
}

/* 写真セクション */
.photo-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 900;
}

/* サイズスイッチ */
.size-switch {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.size-btn {
  width: 32px;
  height: 26px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.size-btn.active {
  background: var(--accent);
  color: #fff;
}

/* 空状態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
}

.empty-mascot {
  width: 100px;
  border-radius: 16px;
}

.empty-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-sub);
}

.empty-sub {
  font-size: 13px;
  color: var(--text-muted);
}

/* タググループ */
.photo-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent-strong);
  padding: 4px 10px;
  background: var(--accent-bg);
  border-radius: 999px;
  width: fit-content;
}

/* 写真グリッド */
.photo-grid {
  display: grid;
  gap: 6px;
}

/* 大: 1→2→3→4 */
.photo-grid--large {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

/* 中（デフォルト）: 2→3→4→5 */
.photo-grid--medium {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 小: 3→4→5→6 */
.photo-grid--small {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (min-width: 480px) {
  .photo-grid--large  { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 640px) {
  .photo-grid--large  { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .photo-grid--medium { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .photo-grid--small  { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 900px) {
  .pub-body { padding: 16px 16px 48px; }
  .pub-header { padding: 24px 16px 16px; }
  .photo-grid--large  { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .photo-grid--medium { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .photo-grid--small  { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

@media (min-width: 1200px) {
  .photo-grid--large  { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .photo-grid--medium { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .photo-grid--small  { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}

.photo-card {
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-surface);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.photo-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.photo-wrap {
  position: relative;
}

.photo-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.photo-memo-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(0,0,0,0.52);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

/* ライトボックス */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lightbox-inner {
  position: relative;
  width: min(100%, 720px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lightbox-close {
  position: absolute;
  top: -44px;
  right: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.16);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.lightbox-img {
  width: 100%;
  border-radius: 16px;
  object-fit: contain;
  max-height: 80vh;
}

.lightbox-memo {
  font-size: 14px;
  color: rgba(255,255,255,0.88);
  line-height: 1.7;
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 14px;
}

.lightbox-date {
  font-size: 12px;
  color: rgba(255,255,255,0.48);
  text-align: right;
}

/* フッター */
.pub-footer {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  max-width: 1200px;
  margin: 0 auto;
}

.pub-footer-logo {
  font-size: 14px;
  font-weight: 900;
  color: var(--accent-strong);
  letter-spacing: 0.04em;
}

.pub-footer-copy {
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .pub-header {
    padding: 16px 12px 10px;
  }

  .pub-body {
    padding: 10px 10px 28px;
  }

  .pub-footer {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}
</style>
