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
        <span class="cover-fallback-title">{{ project.name }}</span>
      </div>
    </div>

    <div class="card-body">
      <h3 class="card-title">{{ project.name }}</h3>
      <div class="card-footer">
        <span class="card-count">{{ project.photoCount }}枚</span>
        <span class="card-status" :class="{ shared: project.isPublic }">
          {{ project.isPublic ? '公開中' : '非公開' }}
        </span>
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
</script>

<style scoped>
.project-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
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
  aspect-ratio: 1 / 1;
  background:
    radial-gradient(circle at top right, rgba(215, 154, 74, 0.28), transparent 28%),
    linear-gradient(160deg, rgba(30, 90, 174, 0.98), rgba(21, 55, 104, 0.98));
  position: relative;
  overflow: hidden;
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: #fff;
}

.cover-fallback-title {
  font-weight: 800;
  line-height: 1.3;
  font-size: 11px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-body {
  padding: 7px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.card-count {
  font-size: 10px;
  color: var(--text-muted);
}

.card-status {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
}

.card-status.shared {
  background: var(--warm-bg);
  color: var(--accent-strong);
}

/* サイズ別の微調整 */
.project-card--large .card-title { font-size: 12px; }
.project-card--large .card-count { font-size: 11px; }
.project-card--large .card-status { font-size: 10px; padding: 3px 7px; }
.project-card--large .card-body { padding: 9px 10px 10px; gap: 5px; }

.project-card--small .cover-fallback-title { font-size: 10px; }
.project-card--small .card-title { font-size: 10px; -webkit-line-clamp: 1; }
.project-card--small .card-count { display: none; }
.project-card--small .card-status { font-size: 9px; }
.project-card--small .card-body { padding: 5px 6px 6px; gap: 3px; }
</style>
