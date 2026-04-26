<template>
  <div class="project-list-view">
    <section class="list-header">
      <div class="list-header-left">
        <p class="list-eyebrow">Buildog</p>
        <h1 class="list-title">案件一覧</h1>
      </div>
      <div class="list-header-right">
        <div class="size-switch">
          <button
            v-for="option in sizeOptions"
            :key="option.value"
            class="size-btn"
            :class="{ active: cardSize === option.value }"
            @click="setCardSize(option.value)"
          >{{ option.label }}</button>
        </div>
        <button class="create-btn" @click="router.push({ name: 'project-create' })">+ 新しい案件</button>
      </div>
    </section>

    <main class="list-body">
      <div v-if="!projectStore.loaded" class="loading-state">読み込み中…</div>

      <div v-else class="project-grid" :class="`project-grid--${cardSize}`">
        <!-- 空状態カード -->
        <article
          v-if="projects.length === 0"
          class="empty-card"
          @click="router.push({ name: 'project-create' })"
        >
          <div class="empty-visual">
            <img src="/brand/buildog-helmet-mascot.png" alt="" class="empty-mascot" />
          </div>
          <div class="empty-body">
            <p class="empty-label">案件を作成</p>
          </div>
        </article>

        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :size="cardSize"
          @click="openProject"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProjectCard from '../components/ProjectCard.vue'
import { projectStore } from '../store/projects'
import type { BuildogProject } from '../types'

type CardSize = 'small' | 'medium' | 'large'

const STORAGE_KEY = 'buildog_project_card_size'
const sizeOptions: { value: CardSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

const router = useRouter()
const projects = computed(() => projectStore.projects)
const defaultSize: CardSize = window.innerWidth <= 768 ? 'medium' : 'medium'
const cardSize = ref<CardSize>((localStorage.getItem(STORAGE_KEY) as CardSize | null) ?? defaultSize)

function setCardSize(size: CardSize) {
  cardSize.value = size
  localStorage.setItem(STORAGE_KEY, size)
}

function openProject(project: BuildogProject) {
  router.push({ name: 'project-detail', params: { id: project.id } })
}
</script>

<style scoped>
.project-list-view {
  min-height: 100vh;
  background: var(--bg);
}

/* ヘッダー */
.list-header {
  padding: 14px 14px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.list-eyebrow {
  color: var(--accent-strong);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.list-title {
  font-size: clamp(16px, 4vw, 22px);
  font-weight: 900;
  line-height: 1.2;
}

.list-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.size-switch {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.size-btn {
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 8px;
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

.create-btn {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

/* グリッド */
.list-body {
  padding: 8px 10px 24px;
}

.loading-state {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.project-grid {
  display: grid;
  gap: 8px;
}

/* 大: スマホ2 / タブレット3 / PC4 */
.project-grid--large {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 中: スマホ2 / タブレット4 / PC5 */
.project-grid--medium {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 小: スマホ3 / タブレット4 / PC6 */
.project-grid--small {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* タブレット (601px〜) */
@media (min-width: 601px) {
  .project-grid--large  { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .project-grid--medium { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .project-grid--small  { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

/* PC (1024px〜) */
@media (min-width: 1024px) {
  .list-body { padding: 10px 16px 32px; }
  .project-grid--large  { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .project-grid--medium { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .project-grid--small  { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}

/* ワイドPC (1440px〜) */
@media (min-width: 1440px) {
  .project-grid--large  { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .project-grid--medium { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .project-grid--small  { grid-template-columns: repeat(8, minmax(0, 1fr)); }
}

/* 空状態カード（案件カードと同サイズ） */
.empty-card {
  background: var(--bg-card);
  border: 1.5px dashed var(--border);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.empty-card:hover {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.empty-visual {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-subtle);
}

.empty-mascot {
  width: 70%;
  object-fit: contain;
  border-radius: 8px;
}

.empty-body {
  padding: 7px 8px 8px;
}

.empty-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 480px) {
  .list-header {
    padding: 12px 10px 8px;
  }
}
</style>
