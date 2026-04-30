<template>
  <div class="board-chat">
    <!-- ヘッダー -->
    <header class="chat-header">
      <button class="back-btn" @click="router.push({ name: 'project-detail', params: { id: projectId } })">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div class="header-title">
        <span class="project-name">{{ projectName }}</span>
        <span class="header-sub">連絡掲示板</span>
      </div>
      <button class="members-btn" @click="showMembersPanel = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span class="members-count">{{ activeMembers.length }}</span>
      </button>
    </header>

    <!-- メッセージ一覧 -->
    <div ref="messagesEl" class="messages-area">
      <div v-if="loading" class="msg-loading">読み込み中…</div>

      <template v-else>
        <template v-for="(item, i) in groupedMessages" :key="i">
          <!-- 日付区切り -->
          <div v-if="item.type === 'date'" class="date-divider">
            <span>{{ item.label }}</span>
          </div>

          <!-- メッセージバブル -->
          <div
            v-else
            class="msg-row"
            :class="{
              'msg-mine': item.msg!.senderUid === myUid,
              'msg-theirs': item.msg!.senderUid !== myUid,
            }"
          >
            <!-- 相手のメッセージ：名前表示 -->
            <div v-if="item.msg!.senderUid !== myUid" class="sender-name">
              {{ item.msg!.senderName }}
              <span v-if="item.msg!.senderRole === 'client'" class="client-badge">施主</span>
            </div>

            <div class="bubble-wrap">
              <div class="bubble">
                <!-- 写真 -->
                <div v-if="item.msg!.photoUrls?.length" class="bubble-photos">
                  <img
                    v-for="url in item.msg!.photoUrls"
                    :key="url"
                    :src="url"
                    class="bubble-photo"
                    @click="openPhotoViewer(url)"
                  />
                </div>
                <!-- テキスト -->
                <span v-if="item.msg!.text" class="bubble-text">{{ item.msg!.text }}</span>
              </div>
              <div class="msg-meta">
                <span class="msg-time">{{ formatTime(item.msg!.createdAt) }}</span>
                <span v-if="item.msg!.senderUid === myUid && item.msg!.readBy.length > 1" class="read-badge">
                  既読 {{ item.msg!.readBy.length - 1 }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <div v-if="messages.length === 0" class="empty-msg">
          <p>まだメッセージがありません。最初のメッセージを送りましょう。</p>
          <button class="seed-btn" :disabled="seedingDemo" @click="seedDemoData">
            {{ seedingDemo ? '追加中…' : '🧪 デモデータを入れる' }}
          </button>
        </div>
      </template>
    </div>

    <!-- 入力欄 -->
    <div class="input-area">
      <input ref="photoInputEl" type="file" accept="image/*" class="hidden-input" @change="onPhotoSelect" />
      <button class="attach-btn" type="button" :disabled="uploadingPhoto" @click="photoInputEl?.click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>
      <textarea
        ref="textareaEl"
        v-model="inputText"
        class="msg-input"
        placeholder="メッセージを入力…"
        rows="1"
        @keydown.enter.meta.prevent="handleSend"
        @input="autoResize"
      />
      <button
        class="send-btn"
        :disabled="(!inputText.trim() && !uploadingPhoto) || sending"
        @click="handleSend"
      >
        <svg v-if="!uploadingPhoto" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
        <span v-else class="sending-spinner" />
      </button>
    </div>

    <!-- 写真フルスクリーンビュー -->
    <Transition name="fade">
      <div v-if="viewerUrl" class="photo-viewer" @click="viewerUrl = null">
        <img :src="viewerUrl" class="viewer-img" />
      </div>
    </Transition>

    <!-- メンバーパネル -->
    <Transition name="slide">
      <div v-if="showMembersPanel" class="members-overlay" @click.self="showMembersPanel = false">
        <div class="members-panel">
          <div class="panel-head">
            <span class="panel-title">参加メンバー</span>
            <button class="panel-close" @click="showMembersPanel = false">✕</button>
          </div>
          <ul class="member-list">
            <li v-for="m in boardMembers" :key="m.uid" class="member-item">
              <span class="member-dot" :class="m.status === 'active' ? 'active' : 'inactive'" />
              <span class="member-info">
                <span class="member-display">{{ m.displayName }}</span>
                <span class="member-role-label">{{ roleLabel(m.role) }}</span>
              </span>
              <span class="member-status-label">{{ m.status === 'active' ? '参加中' : '非参加' }}</span>
              <button
                v-if="amIManager && m.uid !== myUid"
                class="toggle-status-btn"
                @click="handleToggle(m)"
              >
                {{ m.status === 'active' ? 'OFF' : 'ON' }}
              </button>
            </li>
          </ul>

          <!-- 未追加のプロジェクトメンバー（管理者のみ表示） -->
          <template v-if="amIManager && addableMembers.length > 0">
            <div class="panel-divider" />
            <p class="panel-sub">案件メンバーを追加</p>
            <ul class="member-list">
              <li v-for="m in addableMembers" :key="m.uid" class="member-item">
                <span class="member-dot inactive" />
                <span class="member-info">
                  <span class="member-display">{{ m.displayName || m.email }}</span>
                  <span class="member-role-label">案件メンバー</span>
                </span>
                <button
                  class="toggle-status-btn add-btn"
                  :disabled="addingUids.has(m.uid)"
                  @click="addMemberToBoard(m)"
                >
                  {{ addingUids.has(m.uid) ? '…' : '追加' }}
                </button>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setDoc, addDoc, collection, doc, Timestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { authState } from '../lib/auth'
import { projectStore } from '../store/projects'
import {
  subscribeMessages,
  subscribeBoardMembers,
  sendMessage,
  markMessageRead,
  toggleMemberStatus,
  markBoardVisited,
} from '../services/board'
import type { BoardMessageDoc, BoardMemberDoc, BoardMemberRole, ProjectMember } from '../types'

const route  = useRoute()
const router = useRouter()

const boardId   = route.params.boardId as string
const projectId = route.params.projectId as string

const myUid = computed(() => authState.user?.uid ?? '')

// プロジェクトメンバー（ボードに未追加の人を表示するため）
const projectMembers = computed(() => projectStore.getMembers(projectId))

// プロジェクト情報
const project     = computed(() => projectStore.getProjectById(projectId))
const projectName = computed(() => project.value?.name ?? '')

// メッセージ
const messages   = ref<BoardMessageDoc[]>([])
const loading    = ref(true)
let   unsubMsgs: (() => void) | null = null

// メンバー
const boardMembers = ref<BoardMemberDoc[]>([])
let   unsubMembers: (() => void) | null = null

const activeMembers = computed(() => boardMembers.value.filter((m) => m.status === 'active'))
const amIManager    = computed(() =>
  boardMembers.value.some((m) => m.uid === myUid.value && m.role === 'manager'),
)
const myRole = computed<BoardMemberRole>(() => {
  const me = boardMembers.value.find((m) => m.uid === myUid.value)
  return me?.role ?? 'contractor'
})

// 入力
const inputText      = ref('')
const sending        = ref(false)
const textareaEl     = ref<HTMLTextAreaElement | null>(null)
const photoInputEl   = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)
const viewerUrl      = ref<string | null>(null)

function openPhotoViewer(url: string) {
  viewerUrl.value = url
}
const messagesEl = ref<HTMLElement | null>(null)

// UI
const showMembersPanel = ref(false)

// ===== グループ化（日付区切り付き） =====
type GroupItem =
  | { type: 'date'; label: string; msg?: undefined }
  | { type: 'msg'; msg: BoardMessageDoc; label?: undefined }

const groupedMessages = computed<GroupItem[]>(() => {
  const items: GroupItem[] = []
  let lastDate = ''
  for (const msg of messages.value) {
    const dateStr = formatDate(msg.createdAt)
    if (dateStr !== lastDate) {
      items.push({ type: 'date', label: dateStr })
      lastDate = dateStr
    }
    items.push({ type: 'msg', msg })
  }
  return items
})

// ===== 日付・時刻フォーマット =====
function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ===== ロール表示 =====
function roleLabel(role: BoardMemberRole): string {
  if (role === 'manager') return '管理者'
  if (role === 'client')  return '施主'
  return '参加者'
}

// ===== 送信 =====
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value) return

  const name = authState.user?.displayName ?? 'メンバー'
  sending.value = true
  try {
    await sendMessage(boardId, projectId, myUid.value, name, myRole.value, text)
    inputText.value = ''
    if (textareaEl.value) {
      textareaEl.value.style.height = 'auto'
    }
  } finally {
    sending.value = false
  }
}

// ===== 写真添付 =====
async function onPhotoSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''

  uploadingPhoto.value = true
  try {
    const compressed = await compressImage(file)
    const filename = `${Date.now()}.jpg`
    const fileRef = storageRef(storage, `boards/${boardId}/photos/${filename}`)
    await uploadBytes(fileRef, compressed)
    const url = await getDownloadURL(fileRef)
    const name = authState.user?.displayName ?? 'メンバー'
    await sendMessage(boardId, projectId, myUid.value, name, myRole.value, '', [url])
  } catch (e) {
    console.error('[chat] photo upload failed:', e)
  } finally {
    uploadingPhoto.value = false
  }
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const scale  = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(bitmap.width  * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}

// ===== テキストエリア自動リサイズ =====
function autoResize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

// ===== メンバーON/OFF =====
async function handleToggle(m: BoardMemberDoc) {
  await toggleMemberStatus(boardId, m.uid, m.status)
}

// ===== ボードに未追加のプロジェクトメンバー =====
const addableMembers = computed<ProjectMember[]>(() => {
  const boardUids = new Set(boardMembers.value.map((m) => m.uid))
  return projectMembers.value.filter((m) => !boardUids.has(m.uid))
})

const addingUids = ref<Set<string>>(new Set())

async function addMemberToBoard(m: ProjectMember) {
  if (addingUids.value.has(m.uid)) return
  addingUids.value = new Set([...addingUids.value, m.uid])
  try {
    await setDoc(doc(db, `boards/${boardId}/members/${m.uid}`), {
      uid:             m.uid,
      role:            'contractor' as BoardMemberRole,
      status:          'active',
      displayName:     m.displayName || m.email,
      addedBy:         myUid.value,
      addedAt:         Timestamp.now(),
      statusChangedAt: Timestamp.now(),
    })
  } finally {
    const next = new Set(addingUids.value)
    next.delete(m.uid)
    addingUids.value = next
  }
}

// ===== 最下部スクロール =====
function scrollToBottom() {
  nextTick(() => {
    const el = messagesEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(messages, () => scrollToBottom(), { deep: false })

// ===== デモデータ投入 =====
const seedingDemo = ref(false)

async function seedDemoData() {
  if (seedingDemo.value) return
  seedingDemo.value = true
  try {
    const DEMO_UID_A = 'demo-user-tanaka'
    const DEMO_UID_B = 'demo-user-client'
    const myUid  = authState.user?.uid ?? ''
    const myName = authState.user?.displayName ?? 'あなた'

    // デモメンバー追加
    await setDoc(doc(db, `boards/${boardId}/members/${DEMO_UID_A}`), {
      uid: DEMO_UID_A, role: 'contractor', status: 'active',
      displayName: '田中 一郎', addedBy: myUid,
      addedAt: Timestamp.now(), statusChangedAt: Timestamp.now(),
    })
    await setDoc(doc(db, `boards/${boardId}/members/${DEMO_UID_B}`), {
      uid: DEMO_UID_B, role: 'client', status: 'active',
      displayName: '山田 様（施主）', addedBy: myUid,
      addedAt: Timestamp.now(), statusChangedAt: Timestamp.now(),
    })

    // デモメッセージ（過去風に時刻をずらす）
    const base = Date.now() - 60 * 60 * 1000  // 1時間前から
    const msgs = [
      { uid: DEMO_UID_A, name: '田中 一郎', role: 'contractor', text: 'おはようございます！本日9時に現場入りします。資材の搬入も確認済みです。', offset: 0 },
      { uid: myUid,      name: myName,       role: 'manager',    text: 'ありがとうございます。天気も問題なさそうですね。よろしくお願いします！', offset: 5 },
      { uid: DEMO_UID_B, name: '山田 様（施主）', role: 'client', text: 'よろしくお願いします。騒音が出る作業はだいたい何時ごろまでになりますか？', offset: 12 },
      { uid: myUid,      name: myName,       role: 'manager',    text: '本日は17時ごろまでを予定しています。大きな音が出る作業は午前中に集中させます。', offset: 15 },
      { uid: DEMO_UID_A, name: '田中 一郎', role: 'contractor', text: '外壁の下地処理が完了しました。明日から塗装に入れます。', offset: 180 },
    ]

    for (const m of msgs) {
      const ts = Timestamp.fromMillis(base + m.offset * 60 * 1000)
      await addDoc(collection(db, `boards/${boardId}/messages`), {
        boardId, senderUid: m.uid, senderName: m.name, senderRole: m.role,
        text: m.text, photoUrls: [], readBy: [m.uid], createdAt: ts,
      })
    }
  } catch (e) {
    console.error('[seed] failed:', e)
    alert('デモデータの追加に失敗しました。コンソールを確認してください。')
  } finally {
    seedingDemo.value = false
  }
}

// ===== ライフサイクル =====
onMounted(() => {
  unsubMsgs = subscribeMessages(boardId, (msgs) => {
    messages.value = msgs
    loading.value  = false
    // 未読メッセージを既読にする
    const uid = myUid.value
    if (uid) {
      msgs.forEach((msg) => {
        if (!msg.readBy.includes(uid)) {
          markMessageRead(boardId, msg.messageId, uid).catch(() => {})
        }
      })
    }
  }, () => { loading.value = false })
  unsubMembers = subscribeBoardMembers(boardId, (members) => {
    boardMembers.value = members
  })
  projectStore.subscribeMembers(projectId)
  markBoardVisited(boardId)
})

onUnmounted(() => {
  unsubMsgs?.()
  unsubMembers?.()
  projectStore.unsubscribeMembers(projectId)
})
</script>

<style scoped>
.board-chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg, #f3f6fb);
}

/* ヘッダー */
.chat-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: var(--toolbar-bg, linear-gradient(90deg, rgba(30,90,174,0.96), rgba(21,55,104,0.96)));
  border-bottom: 1px solid var(--toolbar-border, rgba(255,255,255,0.18));
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}

.back-btn svg {
  width: 22px;
  height: 22px;
}

.header-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.project-name {
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-sub {
  color: rgba(255, 255, 255, 0.65);
  font-size: 11px;
}

.members-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 4px 10px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
}

.members-btn svg {
  width: 16px;
  height: 16px;
}

.members-count {
  font-weight: 700;
}

/* メッセージエリア */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 72px 14px 80px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-loading {
  text-align: center;
  color: var(--text-muted, rgba(19,39,72,0.52));
  margin-top: 40px;
  font-size: 14px;
}

.empty-msg {
  text-align: center;
  color: var(--text-muted, rgba(19,39,72,0.52));
  margin: auto;
  font-size: 14px;
  line-height: 1.7;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.seed-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px dashed rgba(19, 39, 72, 0.25);
  background: transparent;
  color: var(--text-muted, rgba(19,39,72,0.52));
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.seed-btn:hover:not(:disabled) {
  background: rgba(19, 39, 72, 0.05);
}
.seed-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* 日付区切り */
.date-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 8px;
  color: var(--text-muted, rgba(19,39,72,0.52));
  font-size: 11px;
  font-weight: 600;
}
.date-divider::before,
.date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border, rgba(24,49,91,0.12));
}

/* メッセージ行 */
.msg-row {
  display: flex;
  flex-direction: column;
  max-width: 72%;
  gap: 2px;
}

.msg-row.msg-mine {
  align-self: flex-end;
  align-items: flex-end;
}

.msg-row.msg-theirs {
  align-self: flex-start;
  align-items: flex-start;
}

.sender-name {
  font-size: 11px;
  color: var(--text-muted, rgba(19,39,72,0.52));
  padding-left: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.client-badge {
  font-size: 10px;
  background: rgba(47, 143, 97, 0.15);
  color: #2f8f61;
  border-radius: 4px;
  padding: 0 4px;
  font-weight: 600;
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.msg-mine .bubble-wrap {
  align-items: flex-end;
}

.bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bubble-text {
  white-space: pre-wrap;
}

.bubble-photos {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble-photo {
  max-width: 220px;
  max-height: 220px;
  border-radius: 10px;
  object-fit: cover;
  cursor: zoom-in;
  display: block;
}

.msg-mine .bubble {
  background: #1e5aae;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-theirs .bubble {
  background: var(--bg-card, #fff);
  color: var(--text, #132748);
  border: 1px solid var(--border, rgba(24,49,91,0.12));
  border-bottom-left-radius: 4px;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.msg-time {
  font-size: 10px;
  color: var(--text-faint, rgba(19,39,72,0.34));
}

.read-badge {
  font-size: 10px;
  color: #1e5aae;
  font-weight: 600;
}

.hidden-input { display: none; }

.attach-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--border, rgba(24,49,91,0.12));
  background: var(--bg-input, #f8fbff);
  color: var(--text-muted, rgba(19,39,72,0.52));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.attach-btn:hover { background: var(--bg-hover); }
.attach-btn:disabled { opacity: 0.4; cursor: default; }
.attach-btn svg { width: 18px; height: 18px; }

/* 写真ビューワー */
.photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.viewer-img {
  max-width: 96vw;
  max-height: 92vh;
  object-fit: contain;
  border-radius: 8px;
}

.sending-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 入力欄 */
.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: var(--bg-card, #fff);
  border-top: 1px solid var(--border, rgba(24,49,91,0.12));
}

.msg-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--border, rgba(24,49,91,0.12));
  border-radius: 20px;
  padding: 9px 14px;
  font-size: 14px;
  background: var(--bg-input, #f8fbff);
  color: var(--text, #132748);
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s;
  max-height: 120px;
  overflow-y: auto;
}

.msg-input:focus {
  border-color: var(--accent, #1e5aae);
}

.send-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  border: none;
  background: #1e5aae;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}

/* メンバーパネル */
.members-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--overlay, rgba(11,26,50,0.52));
  display: flex;
  align-items: flex-end;
}

.members-panel {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: var(--bg-card, #fff);
  border-radius: 20px 20px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border, rgba(24,49,91,0.12));
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text, #132748);
}

.panel-close {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-surface, #edf3f8);
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-muted, rgba(19,39,72,0.52));
}

.member-list {
  list-style: none;
  padding: 8px 0;
  max-height: 50vh;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
}

.member-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.member-dot.active   { background: #2f8f61; }
.member-dot.inactive { background: var(--border, rgba(24,49,91,0.12)); }

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.member-display {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #132748);
}

.member-role-label {
  font-size: 11px;
  color: var(--text-muted, rgba(19,39,72,0.52));
}

.member-status-label {
  font-size: 12px;
  color: var(--text-muted, rgba(19,39,72,0.52));
}

.toggle-status-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border, rgba(24,49,91,0.12));
  background: transparent;
  color: var(--accent, #1e5aae);
  cursor: pointer;
}

.toggle-status-btn.add-btn {
  border-color: var(--accent, #1e5aae);
  color: var(--accent, #1e5aae);
}

.toggle-status-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.panel-divider {
  height: 1px;
  background: var(--border, rgba(24,49,91,0.1));
  margin: 4px 18px;
}

.panel-sub {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, rgba(19,39,72,0.5));
  padding: 8px 18px 4px;
  letter-spacing: 0.03em;
}

/* アニメーション */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}
.slide-enter-active .members-panel,
.slide-leave-active .members-panel {
  transition: transform 0.25s ease;
}
.slide-enter-from .members-panel,
.slide-leave-to .members-panel {
  transform: translateY(100%);
}
</style>
