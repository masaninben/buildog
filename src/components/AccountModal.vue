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

      <!-- プラン・試用期間 -->
      <div class="plan-section">
        <div class="plan-row">
          <span class="plan-label">プラン</span>
          <span class="plan-badge" :class="planBadgeClass">{{ planLabel }}</span>
        </div>
        <template v-if="org?.plan === 'trial' && !isTrialExpired">
          <div class="trial-bar-wrap">
            <div class="trial-bar">
              <div class="trial-progress" :style="{ width: trialProgressPct + '%' }" />
            </div>
            <span class="trial-days">残り {{ trialDays }} 日</span>
          </div>
          <p class="plan-note">試用期間終了後もデータはそのまま保持されます。継続利用はご連絡ください。</p>
        </template>
        <template v-else-if="isTrialExpired">
          <p class="plan-expired">試用期間が終了しました。継続利用はお問い合わせください。</p>
        </template>
      </div>

      <!-- オーナーのみ: メンバー管理ボタン -->
      <button v-if="isOwner" class="members-btn" type="button" @click="showMembersModal = true">
        メンバー管理
        <span class="members-count">{{ memberCount }} 人</span>
      </button>

      <button class="signout-btn" @click="handleSignOut">ログアウト</button>
    </div>
  </div>

  <OrgMembersModal v-if="showMembersModal" @close="showMembersModal = false" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from '../lib/auth'
import { orgStore } from '../store/org'
import { projectStore } from '../store/projects'
import { userProfileStore } from '../store/userProfile'
import OrgMembersModal from './OrgMembersModal.vue'

defineEmits<{ close: [] }>()

const router = useRouter()
const profile = computed(() => userProfileStore.profile)
const projects = computed(() => projectStore.projects)
const totalPhotos = computed(() => projects.value.reduce((sum, project) => sum + project.photoCount, 0))
const sharedProjects = computed(() => projects.value.filter((project) => project.isPublic).length)
const initial = computed(() => (profile.value?.displayName || profile.value?.email || '?').charAt(0).toUpperCase())

const org = computed(() => orgStore.org)
const trialDays = computed(() => orgStore.trialDaysRemaining)
const isTrialExpired = computed(() => orgStore.isTrialExpired)
const isOwner = computed(() => orgStore.isOwner)
const memberCount = computed(() => orgStore.memberCount)
const showMembersModal = ref(false)

const TRIAL_DAYS = 30
const trialProgressPct = computed(() => {
  if (!org.value || org.value.plan !== 'trial') return 100
  const used = TRIAL_DAYS - trialDays.value
  return Math.min(100, Math.round((used / TRIAL_DAYS) * 100))
})

const planLabel = computed(() => {
  if (!org.value) return '—'
  if (org.value.plan === 'unlimited') return '無制限プラン'
  if (isTrialExpired.value) return '試用期間終了'
  return '無料トライアル'
})

const planBadgeClass = computed(() => {
  if (!org.value) return ''
  if (org.value.plan === 'unlimited') return 'plan-badge--active'
  if (isTrialExpired.value) return 'plan-badge--expired'
  return 'plan-badge--trial'
})

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

.members-btn {
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  transition: background 0.12s;
}
.members-btn:hover {
  background: var(--bg-hover);
}
.members-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-faint);
  border-radius: 999px;
  padding: 2px 10px;
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

/* プランセクション */
.plan-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  border-radius: 14px;
}

.plan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.plan-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
}

.plan-badge--trial {
  background: var(--warm-bg);
  color: var(--warm);
  border: 1px solid var(--warm-border);
}

.plan-badge--active {
  background: var(--success-bg);
  color: var(--success);
}

.plan-badge--expired {
  background: var(--danger-bg);
  color: var(--danger);
}

.trial-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.trial-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.trial-progress {
  height: 100%;
  border-radius: 999px;
  background: var(--warm);
  transition: width 0.3s ease;
}

.trial-days {
  font-size: 12px;
  font-weight: 800;
  color: var(--warm);
  flex-shrink: 0;
}

.plan-note {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

.plan-expired {
  font-size: 13px;
  font-weight: 700;
  color: var(--danger);
  line-height: 1.6;
}
</style>
