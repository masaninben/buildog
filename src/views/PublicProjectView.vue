<template>
  <div class="public-project-view">
    <header class="pub-header">
      <div>
        <p class="pub-badge">Buildog Public</p>
        <h1 class="pub-title">{{ project?.name || '公開案件' }}</h1>
        <p v-if="project" class="pub-meta">{{ [project.clientName, project.siteAddress].filter(Boolean).join(' / ') }}</p>
      </div>
      <a href="/login" class="pub-login-btn">施工会社ログイン</a>
    </header>

    <main class="pub-body">
      <div v-if="loading" class="state-card">読み込み中…</div>
      <div v-else-if="!project" class="state-card">この案件は公開されていません。</div>

      <template v-else>
        <section class="overview-card">
          <div class="overview-item">
            <span class="overview-label">公開写真</span>
            <span class="overview-value">{{ photos.length }}枚</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">最終更新</span>
            <span class="overview-value">{{ formatDate(project.updatedAt) }}</span>
          </div>
        </section>

        <section class="timeline-card">
          <div class="section-head">
            <h2 class="section-title">施工写真</h2>
            <p class="section-copy">公開されている写真だけを、工事の順番どおりに表示しています。</p>
          </div>

          <div v-if="photos.length === 0" class="state-card state-card--inner">公開中の写真はまだありません。</div>

          <div v-else class="photo-grid">
            <article v-for="photo in photos" :key="photo.id" class="photo-card">
              <img :src="photo.url" class="photo-image" />
              <div class="photo-body">
                <div class="photo-top">
                  <p class="photo-tag">{{ PROJECT_PHOTO_TAG_LABELS[photo.tag] }}</p>
                  <p class="photo-date">{{ formatDateTime(photo.createdAt) }}</p>
                </div>
                <p v-if="photo.memo" class="photo-caption">{{ photo.memo }}</p>
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { projectStore } from '../store/projects'
import { PROJECT_PHOTO_TAG_LABELS, type BuildogProject, type ProjectPhoto } from '../types'

const route = useRoute()
const loading = ref(true)
const project = ref<BuildogProject | null>(null)
const photos = ref<ProjectPhoto[]>([])

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ja-JP')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP')
}
</script>

<style scoped>
.public-project-view {
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(255, 122, 26, 0.06), transparent 220px), var(--bg);
}

.pub-header {
  padding: 24px 16px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pub-badge {
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.pub-title {
  font-size: clamp(24px, 6vw, 40px);
  line-height: 1.15;
}

.pub-meta,
.section-copy,
.photo-date {
  color: var(--text-sub);
}

.pub-login-btn {
  height: 40px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--accent);
  text-decoration: none;
  font-weight: 700;
}

.pub-body {
  padding: 16px;
  display: grid;
  gap: 16px;
}

.overview-card,
.timeline-card,
.state-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
}

.overview-card {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-item {
  display: grid;
  gap: 8px;
}

.overview-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.overview-value {
  font-size: 22px;
  font-weight: 900;
}

.timeline-card,
.state-card {
  padding: 16px;
}

.state-card--inner {
  padding: 20px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 18px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.photo-card {
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
}

.photo-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.photo-body {
  padding: 10px;
  display: grid;
  gap: 8px;
}

.photo-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.photo-caption {
  font-size: 12px;
  line-height: 1.7;
}

.photo-tag {
  width: fit-content;
  padding: 5px 9px;
  border-radius: 999px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
}

@media (min-width: 900px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .pub-header,
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
