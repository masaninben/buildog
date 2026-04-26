<template>
  <div class="project-list-view">
    <section class="hero">
      <div>
        <p class="hero-eyebrow">Buildog</p>
        <h1 class="hero-title">案件一覧</h1>
      </div>

      <div class="hero-actions">
        <div class="size-switch">
          <button
            v-for="option in sizeOptions"
            :key="option.value"
            class="size-btn"
            :class="{ active: cardSize === option.value }"
            @click="setCardSize(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <button class="create-btn" @click="router.push({ name: 'project-create' })">案件を作成</button>
      </div>
    </section>

    <main class="page-body">
      <div v-if="!projectStore.loaded" class="state-card">読み込み中…</div>

      <div v-else-if="projects.length === 0" class="empty-card">
        <img src="/brand/buildog-bulldog-mascot.jpg" alt="Buildog bulldog mascot" class="empty-mascot" />
        <p class="empty-title">まだ案件がありません</p>
        <p class="empty-copy">最初の案件を作成すると、施工写真のアップロードと顧客共有を始められます。</p>
        <button class="create-btn" @click="router.push({ name: 'project-create' })">最初の案件を作成</button>
      </div>

      <div v-else class="project-grid" :class="`project-grid--${cardSize}`">
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
const defaultSize: CardSize = window.innerWidth <= 768 ? 'small' : 'medium'
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
  background:
    linear-gradient(180deg, rgba(30, 90, 174, 0.08), transparent 200px),
    var(--bg);
}

.hero {
  padding: 18px 16px 10px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.hero-eyebrow {
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.hero-title {
  font-size: clamp(18px, 4vw, 24px);
  line-height: 1.2;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.size-switch {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.size-btn {
  width: 38px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
}

.size-btn.active {
  background: var(--accent);
  color: #fff;
}

.page-body {
  padding: 16px;
}

.project-grid {
  display: grid;
  gap: 10px;
}

.project-grid--large { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.project-grid--medium { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.project-grid--small { grid-template-columns: repeat(5, minmax(0, 1fr)); }

.state-card,
.empty-card {
  border-radius: 24px;
  padding: 28px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.empty-mascot {
  width: 128px;
  height: auto;
  border-radius: 20px;
  object-fit: cover;
  box-shadow: var(--shadow-sm);
}

.empty-title {
  font-size: 18px;
  font-weight: 800;
}

.empty-copy {
  color: var(--text-sub);
  line-height: 1.8;
}

.create-btn {
  flex-shrink: 0;
  height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

@media (min-width: 900px) {
  .project-grid--large {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .project-grid--medium {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .project-grid--small {
    grid-template-columns: repeat(10, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
