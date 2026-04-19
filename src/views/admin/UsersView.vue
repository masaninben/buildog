<template>
  <div class="users-view">
    <div class="page-header">
      <h1 class="page-title">ユーザー管理</h1>
      <span class="badge">{{ users.length }}人</span>
    </div>

    <!-- 権限の説明 -->
    <div class="role-legend">
      <div v-for="(label, role) in ROLE_LABELS" :key="role" class="legend-item">
        <span class="role-chip" :class="`role-${role}`">{{ label }}</span>
        <span class="legend-desc">{{ ROLE_DESC[role] }}</span>
      </div>
    </div>

    <div v-if="loading" class="state-msg">読み込み中…</div>
    <div v-else class="users-list">
      <div v-for="u in users" :key="u.uid" class="user-card" :class="{ 'is-me': u.uid === currentUid }">

        <!-- ヘッダー行 -->
        <div class="card-header">
          <div class="avatar-wrap">
            <img v-if="u.photoURL" :src="u.photoURL" class="avatar" />
            <div v-else class="avatar-empty">{{ u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?' }}</div>
          </div>
          <div class="card-title">
            <span class="user-name">{{ u.displayName || '(表示名なし)' }}</span>
            <span v-if="u.uid === currentUid" class="me-badge">自分</span>
          </div>
          <div class="role-controls">
            <span class="role-chip" :class="`role-${u.role}`">{{ ROLE_LABELS[u.role] }}</span>
            <select
              class="role-select"
              :value="u.role"
              :disabled="u.uid === currentUid || saving === u.uid"
              @change="updateRole(u.uid, ($event.target as HTMLSelectElement).value as UserRole)"
            >
              <option v-for="(label, r) in ROLE_LABELS" :key="r" :value="r">{{ label }}</option>
            </select>
          </div>
        </div>

        <!-- 全フィールドグリッド -->
        <div class="fields-grid">
          <div class="field-row">
            <span class="field-key">UID</span>
            <span class="field-val monospace">{{ u.uid }}</span>
          </div>
          <div class="field-row">
            <span class="field-key">メール</span>
            <span class="field-val">{{ u.email || '—' }}</span>
          </div>
          <div class="field-row">
            <span class="field-key">表示名</span>
            <span class="field-val">{{ u.displayName || '—' }}</span>
          </div>
          <div class="field-row">
            <span class="field-key">都道府県</span>
            <span class="field-val">{{ u.prefecture || '—' }}</span>
          </div>
          <div class="field-row">
            <span class="field-key">市区町村</span>
            <span class="field-val">{{ u.city || '—' }}</span>
          </div>
          <div class="field-row">
            <span class="field-key">登録日</span>
            <span class="field-val">{{ u.createdAt }}</span>
          </div>
          <div class="field-row">
            <span class="field-key">アバターURL</span>
            <span class="field-val url-val">{{ u.photoURL || '—' }}</span>
          </div>
          <!-- 未知フィールドも表示 -->
          <template v-for="(val, key) in u.extra" :key="key">
            <div class="field-row extra">
              <span class="field-key">{{ key }}</span>
              <span class="field-val">{{ val }}</span>
            </div>
          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { collection, onSnapshot, updateDoc, doc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { authState } from '../../lib/auth'
import { type UserRole, ROLE_LABELS } from '../../store/userProfile'

const ROLE_DESC: Record<UserRole, string> = {
  user:   '棚の管理のみ',
  viewer: '商品DBを閲覧できる',
  editor: '商品DBを編集できる',
  admin:  'ユーザー管理を含む全権限',
}

// 既知フィールド（個別表示するもの）
const KNOWN_FIELDS = new Set([
  'uid', 'displayName', 'email', 'photoURL', 'role',
  'prefecture', 'city', 'createdAt',
])

interface UserRow {
  uid: string
  displayName: string
  email: string
  photoURL: string
  role: UserRole
  createdAt: string
  prefecture: string
  city: string
  extra: Record<string, string>   // 未知フィールド
  _createdMs: number
}

const users = ref<UserRow[]>([])
const loading = ref(true)
const saving = ref<string | null>(null)
const currentUid = authState.user?.uid

let unsub: Unsubscribe | null = null

onMounted(() => {
  unsub = onSnapshot(collection(db, 'users'), (snap) => {
    const rows = snap.docs.map(d => {
      const data = d.data()

      // 既知フィールド以外をすべて extra に
      const extra: Record<string, string> = {}
      for (const [k, v] of Object.entries(data)) {
        if (!KNOWN_FIELDS.has(k)) {
          extra[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')
        }
      }

      return {
        uid:         d.id,
        displayName: (data.displayName as string) ?? '',
        email:       (data.email       as string) ?? '',
        photoURL:    (data.photoURL    as string) ?? '',
        role:        (data.role        as UserRole) ?? 'user',
        createdAt:   data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString().split('T')[0]
          : '—',
        prefecture:  (data.prefecture  as string) ?? '',
        city:        (data.city        as string) ?? '',
        extra,
        _createdMs:  data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0,
      }
    })
    rows.sort((a, b) => b._createdMs - a._createdMs)
    users.value = rows
    loading.value = false
  })
})

onUnmounted(() => { unsub?.() })

async function updateRole(uid: string, role: UserRole) {
  saving.value = uid
  try {
    await updateDoc(doc(db, 'users', uid), { role })
    const u = users.value.find(u => u.uid === uid)
    if (u) u.role = role
  } finally {
    saving.value = null
  }
}
</script>

<style scoped>
.users-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 24px 64px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #2c2315;
}

.badge {
  background: #f0ece4;
  color: #8b6914;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}

/* 権限説明 */
.role-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 10px;
  padding: 14px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-desc {
  font-size: 11px;
  color: #b0a090;
  white-space: nowrap;
}

/* ユーザーカード */
.state-msg {
  text-align: center;
  padding: 48px 0;
  font-size: 13px;
  color: #b0a090;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  overflow: hidden;
}

.user-card.is-me {
  border: 2px solid rgba(139, 105, 20, 0.25);
}

/* カードヘッダー */
.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid #f5f2ec;
}

.avatar-wrap { flex-shrink: 0; }

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-empty {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #e8e0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #8b6914;
}

.card-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 700;
  color: #2c2315;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: #8b6914;
  background: #fdf3dc;
  padding: 2px 8px;
  border-radius: 10px;
}

.role-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 全フィールドグリッド */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 20px;
  border-bottom: 1px solid #f5f2ec;
  border-right: 1px solid #f5f2ec;
}

.field-row:nth-child(even) {
  border-right: none;
}

.field-row.extra {
  background: #fdf8f0;
}

.field-key {
  font-size: 10px;
  color: #c0b8a8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 600;
}

.field-val {
  font-size: 12px;
  color: #2c2315;
  word-break: break-all;
  line-height: 1.5;
}

.field-val.monospace {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: #6b5a3a;
}

.url-val {
  font-size: 10px;
  color: #4a6da8;
  word-break: break-all;
}

/* 権限チップ */
.role-chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.role-user   { background: #f0ece4; color: #a09070; }
.role-viewer { background: #e8f0fe; color: #4a6da8; }
.role-editor { background: #e8f5e9; color: #3a7a3a; }
.role-admin  { background: #fce8e6; color: #c0392b; }

.role-select {
  height: 30px;
  padding: 0 8px;
  border: 1.5px solid #e0dbd0;
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: #2c2315;
  background: #faf8f4;
  cursor: pointer;
  outline: none;
}
.role-select:disabled { opacity: 0.4; cursor: default; }

/* レスポンシブ */
@media (max-width: 600px) {
  .users-view { padding: 16px 14px 64px; }
  .fields-grid { grid-template-columns: 1fr; }
  .field-row { border-right: none; }
  .role-legend { gap: 10px; }
  .card-header { flex-wrap: wrap; }
}
</style>
