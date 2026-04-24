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

withDefaults(defineProps<{ project: BuildogProject; size?: 'small' | 'medium' }>(), {
  size: 'small',
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
  border: 1px solid var(--border-faint);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.project-card--small .cover-wrap {
  aspect-ratio: 1.2 / 1;
}

.project-card--small .card-body {
  padding: 10px;
  gap: 8px;
}

.project-card--small .card-title {
  font-size: 14px;
}

.project-card--small .card-meta,
.project-card--small .card-footer {
  font-size: 11px;
}

.project-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-accent);
}

.cover-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  background:
    linear-gradient(135deg, rgba(255, 122, 26, 0.14), rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, rgba(18, 26, 34, 0.85), rgba(18, 26, 34, 0.95));
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
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  color: #fff;
}

.cover-fallback-badge {
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.cover-fallback-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.4;
}

.card-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  line-height: 1.4;
}

.card-status {
  flex-shrink: 0;
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.card-status.shared {
  background: rgba(255, 122, 26, 0.14);
  color: var(--accent);
}

.card-meta {
  color: var(--text-sub);
  font-size: 13px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
