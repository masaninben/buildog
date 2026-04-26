<template>
  <article class="project-card" :class="`project-card--${size}`" @click="$emit('click', project)">
    <div class="cover-wrap">
      <img
        v-if="project.coverPhotoUrl"
        :src="project.coverPhotoUrl"
        :alt="project.name"
        class="cover-img"
      />
      <div v-else class="cover-fallback">
        <span class="cover-fallback-badge">Buildog</span>
        <span class="cover-fallback-title">{{ project.name }}</span>
      </div>
    </div>

    <div class="card-body">
      <div class="card-top">
        <h3 class="card-title">{{ project.name }}</h3>
        <span class="card-status" :class="{ shared: project.isPublic }">
          {{ project.isPublic ? '公開中' : '非公開' }}
        </span>
      </div>
      <p v-if="project.siteAddress" class="card-meta">{{ project.siteAddress }}</p>
      <p v-else-if="project.clientName" class="card-meta">{{ project.clientName }}</p>
      <div class="card-footer">
        <span>{{ project.photoCount }}枚</span>
        <span>{{ formatDate(project.updatedAt) }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { BuildogProject } from '../types'

withDefaults(defineProps<{ project: BuildogProject; size?: 'small' | 'medium' | 'large' }>(), {
  size: 'medium',
})
defineEmits<{ click: [project: BuildogProject] }>()

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ja-JP')
}
</script>

<style scoped>
.project-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-accent);
}

.cover-wrap {
  width: 100%;
  background:
    radial-gradient(circle at top right, rgba(215, 154, 74, 0.28), transparent 28%),
    linear-gradient(160deg, rgba(30, 90, 174, 0.98), rgba(21, 55, 104, 0.98));
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  color: #fff;
}

.cover-fallback-badge {
  width: fit-content;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.cover-fallback-title {
  font-weight: 800;
  line-height: 1.4;
}

.card-body {
  display: flex;
  flex-direction: column;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-status {
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-weight: 700;
}

.card-status.shared {
  background: var(--warm-bg);
  color: var(--accent-strong);
}

.card-meta {
  color: var(--text-sub);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
}

.project-card--large .cover-wrap {
  aspect-ratio: 1.2 / 1;
}

.project-card--large .card-body {
  padding: 10px;
  gap: 8px;
}

.project-card--large .cover-fallback-title,
.project-card--large .card-title {
  font-size: 14px;
}

.project-card--large .card-meta,
.project-card--large .card-footer,
.project-card--large .card-status {
  font-size: 11px;
}

.project-card--large .card-status {
  padding: 4px 7px;
}

.project-card--medium .cover-wrap {
  aspect-ratio: 1 / 1;
}

.project-card--medium .card-body {
  padding: 8px;
  gap: 6px;
}

.project-card--medium .cover-fallback-title,
.project-card--medium .card-title {
  font-size: 12px;
}

.project-card--medium .card-meta,
.project-card--medium .card-footer,
.project-card--medium .card-status {
  font-size: 10px;
}

.project-card--medium .card-status {
  padding: 3px 6px;
}

.project-card--small .cover-wrap {
  aspect-ratio: 1 / 1;
}

.project-card--small .card-body {
  padding: 6px;
  gap: 4px;
}

.project-card--small .cover-fallback-title,
.project-card--small .card-title {
  font-size: 10px;
}

.project-card--small .card-meta {
  display: none;
}

.project-card--small .card-footer,
.project-card--small .card-status {
  font-size: 9px;
}

.project-card--small .card-status {
  padding: 2px 5px;
}
</style>
