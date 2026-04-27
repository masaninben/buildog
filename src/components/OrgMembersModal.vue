<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title">メンバー管理</span>
        <button class="close-btn" type="button" @click="$emit('close')">✕</button>
      </div>

      <!-- メンバー一覧 -->
      <div class="member-list">
        <!-- オーナー（自分） -->
        <div class="member-row member-row--owner">
          <div class="member-avatar">{{ ownerInitial }}</div>
          <div class="member-info">
            <p class="member-name">{{ ownerName }}<span class="role-badge role-badge--owner">オーナー</span></p>
            <p class="member-email">{{ ownerEmail }}</p>
          </div>
        </div>

        <!-- メンバー一覧 -->
        <div v-for="member in members" :key="member.uid" class="member-row">
          <div class="member-avatar">{{ initial(member.displayName || member.email) }}</div>
          <div class="member-info">
            <p class="member-name">{{ member.displayName || member.email }}</p>
            <p class="member-email">{{ member.email }}</p>
          </div>
          <div class="member-controls">
            <label class="perm-toggle" :title="member.canCreateProject ? '案件作成: 許可中' : '案件作成: 禁止中'">
              <input
                type="checkbox"
                :checked="member.canCreateProject"
                @change="toggleCreatePermission(member)"
              />
              <span class="perm-label">案件追加</span>
            </label>
            <button class="remove-btn" type="button" @click="confirmRemove(member)">削除</button>
          </div>
        </div>

        <p v-if="members.length === 0" class="empty-text">メンバーはまだいません</p>
      </div>

      <p class="seat-count">{{ members.length }} / 10 席使用中</p>

      <!-- メンバー追加フォーム -->
      <div class="add-section">
        <p class="add-label">メンバーを追加</p>
        <p class="add-note">追加するユーザーは事前にBuildog登録が必要です</p>
        <div class="add-row">
          <input
            v-model="inviteEmail"
            class="add-input"
            type="email"
            placeholder="メールアドレス"
            :disabled="adding"
            @keydown.enter.prevent="addMember"
          />
          <button
            class="add-btn"
            type="button"
            :disabled="adding || !inviteEmail.trim() || members.length >= 10"
            @click="addMember"
          >
            {{ adding ? '追加中…' : '追加' }}
          </button>
        </div>
        <p v-if="addError" class="add-error">{{ addError }}</p>
      </div>
    </div>
  </div>

  <ConfirmModal />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmModal from './ConfirmModal.vue'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'
import { authState } from '../lib/auth'
import { orgStore } from '../store/org'
import type { OrgMember } from '../types'

defineEmits<{ close: [] }>()

const { confirm } = useConfirm()
const { success: toastSuccess, error: toastError } = useToast()

const inviteEmail = ref('')
const adding = ref(false)
const addError = ref('')

const members = computed(() => orgStore.members)
const ownerName = computed(() => authState.user?.displayName || authState.user?.email || 'オーナー')
const ownerEmail = computed(() => authState.user?.email || '')
const ownerInitial = computed(() => initial(ownerName.value))

function initial(name: string): string {
  return (name || '?').charAt(0).toUpperCase()
}

async function addMember() {
  const email = inviteEmail.value.trim()
  if (!email || adding.value) return
  adding.value = true
  addError.value = ''
  try {
    const result = await orgStore.addMemberByEmail(email)
    if (result.success) {
      inviteEmail.value = ''
      toastSuccess(`${email} をメンバーに追加しました`)
    } else {
      addError.value = result.error ?? '追加に失敗しました'
    }
  } catch {
    addError.value = '追加に失敗しました。通信環境を確認してください。'
  } finally {
    adding.value = false
  }
}

async function toggleCreatePermission(member: OrgMember) {
  await orgStore.updateMember(member.uid, { canCreateProject: !member.canCreateProject })
  const label = !member.canCreateProject ? '許可' : '禁止'
  toastSuccess(`${member.displayName || member.email} の案件追加を${label}しました`)
}

async function confirmRemove(member: OrgMember) {
  const ok = await confirm({
    title: `${member.displayName || member.email} を削除`,
    message: 'このメンバーを組織から削除しますか？',
    confirmLabel: '削除する',
    danger: true,
  })
  if (!ok) return
  try {
    await orgStore.removeMember(member.uid)
    toastSuccess('メンバーを削除しました')
  } catch {
    toastError('削除に失敗しました。')
  }
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
  width: min(100%, 480px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
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

/* メンバー一覧 */
.member-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.1s;
}
.member-row:hover {
  background: var(--bg-surface);
}
.member-row--owner {
  background: var(--accent-bg);
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.role-badge--owner {
  background: var(--accent-bg);
  color: var(--accent);
}

.member-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.perm-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.perm-toggle input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.perm-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
  white-space: nowrap;
}

.remove-btn {
  font-size: 12px;
  font-weight: 700;
  color: var(--danger);
  background: transparent;
  border: 1px solid var(--danger);
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.12s;
}
.remove-btn:hover {
  background: var(--danger-bg);
}

.seat-count {
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
}

.empty-text {
  padding: 12px;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

/* 追加フォーム */
.add-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  border-radius: 14px;
}

.add-label {
  font-size: 13px;
  font-weight: 800;
}

.add-note {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.add-row {
  display: flex;
  gap: 8px;
}

.add-input {
  flex: 1;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-input);
  color: var(--text);
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}
.add-input::placeholder {
  color: var(--text-placeholder);
}
.add-input:focus {
  border-color: var(--accent);
}

.add-btn {
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.12s;
}
.add-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.add-error {
  font-size: 13px;
  color: var(--danger);
  line-height: 1.5;
}
</style>
