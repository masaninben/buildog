<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title">アカウント</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="profile-row">
        <div class="avatar-wrap">
          <img v-if="profile?.photoURL" :src="profile.photoURL" class="avatar-img" />
          <span v-else class="avatar-placeholder">{{ initial }}</span>
        </div>
        <div class="profile-info">
          <p class="profile-name">{{ profile?.displayName || 'Buildog User' }}</p>
          <p class="profile-email">{{ profile?.email }}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-value">{{ projects.length }}</span>
          <span class="summary-label">案件数</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ totalPhotos }}</span>
          <span class="summary-label">写真数</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ sharedProjects }}</span>
          <span class="summary-label">公開中</span>
        </div>
      </div>

      <p class="help-text">Buildogでは案件ごとに施工写真を整理し、顧客には公開URLで共有できます。</p>

      <button class="signout-btn" @click="handleSignOut">ログアウト</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from '../lib/auth'
import { projectStore } from '../store/projects'
import { userProfileStore } from '../store/userProfile'

defineEmits<{ close: [] }>()

const router = useRouter()
const profile = computed(() => userProfileStore.profile)
const projects = computed(() => projectStore.projects)
const totalPhotos = computed(() => projects.value.reduce((sum, project) => sum + project.photoCount, 0))
const sharedProjects = computed(() => projects.value.filter((project) => project.isPublic).length)
const initial = computed(() => (profile.value?.displayName || profile.value?.email || '?').charAt(0).toUpperCase())

async function handleSignOut() {
  await signOut()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 200;
}

.modal-card {
  width: min(100%, 440px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-header,
.profile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
}

.avatar-wrap {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-weight: 800;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-row {
  justify-content: flex-start;
  gap: 14px;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-name {
  font-size: 16px;
  font-weight: 700;
}

.profile-email {
  color: var(--text-sub);
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.summary-card {
  border-radius: 14px;
  padding: 14px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.summary-value {
  font-size: 20px;
  font-weight: 900;
}

.summary-label,
.help-text {
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.7;
}

.signout-btn {
  height: 46px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
</style>
