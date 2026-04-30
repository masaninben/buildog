<template>
  <div class="karte-board">
    <!-- ヘッダー -->
    <header class="board-header">
      <button class="back-btn" @click="router.push({ name: 'karte-home' })">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div class="header-title">
        <span class="project-name">{{ boardDoc?.projectName ?? '連絡掲示板' }}</span>
        <span class="header-sub">施工担当からの連絡</span>
      </div>
      <div class="header-members">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>{{ activeMembers.length }}</span>
      </div>
    </header>

    <!-- 非参加状態 -->
    <div v-if="myStatus === 'inactive'" class="inactive-screen">
      <span class="inactive-owl">🦉</span>
      <p class="inactive-title">現在この掲示板には<br>参加していません。</p>
      <p class="inactive-sub">参加するには担当業者に<br>お問い合わせください。</p>
    </div>

    <!-- チャット本体 -->
    <template v-else-if="myStatus === 'active'">
      <div ref="messagesEl" class="messages-area">
        <div v-if="loading" class="msg-loading">読み込み中…</div>

        <template v-else>
          <template v-for="(item, i) in groupedMessages" :key="i">
            <div v-if="item.type === 'date'" class="date-divider">
              <span>{{ item.label }}</span>
            </div>

            <div
              v-else
              class="msg-row"
              :class="{
                'msg-mine':   item.msg!.senderUid === myUid,
                'msg-theirs': item.msg!.senderUid !== myUid,
              }"
            >
              <div v-if="item.msg!.senderUid !== myUid" class="sender-name">
                {{ item.msg!.senderName }}
                <span v-if="item.msg!.senderRole !== 'client'" class="contractor-badge">担当</span>
              </div>
              <div class="bubble-wrap">
                <div class="bubble">
                  <div v-if="item.msg!.photoUrls?.length" class="bubble-photos">
                    <img
                      v-for="url in item.msg!.photoUrls"
                      :key="url"
                      :src="url"
                      class="bubble-photo"
                      @click="openPhotoViewer(url)"
                    />
                  </div>
                  <span v-if="item.msg!.text" class="bubble-text">{{ item.msg!.text }}</span>
                </div>
                <div class="msg-meta">
                  <span class="msg-time">{{ formatTime(item.msg!.createdAt) }}</span>
                </div>
              </div>
            </div>
          </template>

          <div v-if="messages.length === 0" class="empty-msg">
            まだメッセージがありません。
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
          @input="autoResize"
          @keydown.enter.meta.prevent="handleSend"
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
    </template>

    <!-- ステータス確認中 -->
    <div v-else class="inactive-screen">
      <p class="inactive-sub">確認中…</p>
    </div>

    <!-- 写真フルスクリーンビュー -->
    <Transition name="fade">
      <div v-if="viewerUrl" class="photo-viewer" @click="viewerUrl = null">
        <img :src="viewerUrl" class="viewer-img" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { authState } from '../../lib/auth'
import {
  subscribeMessages,
  subscribeBoardMembers,
  sendMessage,
  markMessageRead,
  getMyBoardStatus,
  markBoardVisited,
} from '../../services/board'
import type { BoardMessageDoc, BoardMemberDoc, BoardDoc } from '../../types'

const route  = useRoute()
const router = useRouter()

const boardId = route.params.boardId as string
const myUid   = computed(() => authState.user?.uid ?? '')

const boardDoc     = ref<BoardDoc | null>(null)
const myStatus     = ref<'active' | 'inactive' | null>(null)
const boardMembers = ref<BoardMemberDoc[]>([])
const activeMembers = computed(() => boardMembers.value.filter((m) => m.status === 'active'))

const messages   = ref<BoardMessageDoc[]>([])
const loading        = ref(true)
const inputText      = ref('')
const sending        = ref(false)
const textareaEl     = ref<HTMLTextAreaElement | null>(null)
const messagesEl     = ref<HTMLElement | null>(null)
const photoInputEl   = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)
const viewerUrl      = ref<string | null>(null)

function openPhotoViewer(url: string) { viewerUrl.value = url }

let unsubMsgs:    (() => void) | null = null
let unsubMembers: (() => void) | null = null

// ===== グループ化（日付区切り） =====
type GroupItem =
  | { type: 'date'; label: string; msg?: undefined }
  | { type: 'msg';  msg: BoardMessageDoc; label?: undefined }

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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ===== 送信 =====
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  const name = authState.user?.displayName ?? '施主'
  sending.value = true
  try {
    await sendMessage(boardId, boardDoc.value?.projectId ?? '', myUid.value, name, 'client', text)
    inputText.value = ''
    if (textareaEl.value) textareaEl.value.style.height = 'auto'
  } finally {
    sending.value = false
  }
}

async function onPhotoSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''
  uploadingPhoto.value = true
  try {
    const compressed = await compressImage(file)
    const fileRef = storageRef(storage, `boards/${boardId}/photos/${Date.now()}.jpg`)
    await uploadBytes(fileRef, compressed)
    const url = await getDownloadURL(fileRef)
    const name = authState.user?.displayName ?? '施主'
    await sendMessage(boardId, boardDoc.value?.projectId ?? '', myUid.value, name, 'client', '', [url])
  } catch (e) {
    console.error('[karte-board] photo upload failed:', e)
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

function autoResize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(messages, () => scrollToBottom())

// ===== ライフサイクル =====
onMounted(async () => {
  // ボードドキュメント取得
  const boardSnap = await getDoc(doc(db, `boards/${boardId}`))
  if (boardSnap.exists()) {
    const d = boardSnap.data()
    boardDoc.value = {
      boardId,
      projectId:   d.projectId   ?? '',
      projectName: d.projectName ?? '',
      karteHomeId: d.karteHomeId,
      karteUserId: d.karteUserId,
      createdAt:   d.createdAt?.toDate?.()?.toISOString?.() ?? '',
      updatedAt:   d.updatedAt?.toDate?.()?.toISOString?.() ?? '',
    }
  }

  // 自分のメンバーステータスを確認
  myStatus.value = await getMyBoardStatus(boardId, myUid.value)

  if (myStatus.value === 'active') {
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
    })
    unsubMembers = subscribeBoardMembers(boardId, (members) => {
      boardMembers.value = members
    })
    markBoardVisited(boardId)
  }
})

onUnmounted(() => {
  unsubMsgs?.()
  unsubMembers?.()
})
</script>

<style scoped>
.karte-board {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f9f9f7;
}

/* ヘッダー */
.board-header {
  position: fixed;
  top: 54px; /* KarteToolbar */
  left: 0;
  right: 0;
  z-index: 10;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid rgba(27, 58, 92, 0.08);
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
  color: #1b3a5c;
  flex-shrink: 0;
}
.back-btn svg { width: 22px; height: 22px; }

.header-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.project-name {
  font-weight: 700;
  font-size: 14px;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-sub {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.45);
}

.header-members {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(27, 58, 92, 0.5);
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.header-members svg { width: 16px; height: 16px; }

/* 非参加 */
.inactive-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 24px;
  padding-top: 120px;
}
.inactive-owl   { font-size: 52px; }
.inactive-title { font-size: 16px; font-weight: 700; color: #1b3a5c; text-align: center; line-height: 1.7; }
.inactive-sub   { font-size: 13px; color: rgba(27,58,92,0.5); text-align: center; line-height: 1.7; }

/* メッセージエリア */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 116px 14px calc(72px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-loading,
.empty-msg {
  text-align: center;
  color: rgba(27, 58, 92, 0.4);
  margin: auto;
  font-size: 14px;
  padding: 40px 20px;
}

/* 日付区切り */
.date-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 8px;
  color: rgba(27, 58, 92, 0.4);
  font-size: 11px;
  font-weight: 600;
}
.date-divider::before,
.date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(27, 58, 92, 0.09);
}

/* メッセージ */
.msg-row {
  display: flex;
  flex-direction: column;
  max-width: 72%;
  gap: 2px;
}
.msg-row.msg-mine   { align-self: flex-end; align-items: flex-end; }
.msg-row.msg-theirs { align-self: flex-start; align-items: flex-start; }

.sender-name {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.45);
  padding-left: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.contractor-badge {
  font-size: 10px;
  background: rgba(30, 90, 174, 0.1);
  color: #1e5aae;
  border-radius: 4px;
  padding: 0 4px;
  font-weight: 600;
}

.bubble-wrap { display: flex; flex-direction: column; gap: 2px; }
.msg-mine .bubble-wrap { align-items: flex-end; }

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

.bubble-text { white-space: pre-wrap; }

.bubble-photos { display: flex; flex-direction: column; gap: 4px; }

.bubble-photo {
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
  object-fit: cover;
  cursor: zoom-in;
  display: block;
}
.msg-mine .bubble {
  background: #2d6a4f;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg-theirs .bubble {
  background: #fff;
  color: #1b3a5c;
  border: 1px solid rgba(27, 58, 92, 0.1);
  border-bottom-left-radius: 4px;
}

.msg-meta { display: flex; align-items: center; gap: 6px; }
.msg-time { font-size: 10px; color: rgba(27, 58, 92, 0.35); }

.hidden-input { display: none; }

.attach-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid rgba(27, 58, 92, 0.14);
  background: #f9f9f7;
  color: rgba(27, 58, 92, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.attach-btn:disabled { opacity: 0.4; cursor: default; }
.attach-btn svg { width: 18px; height: 18px; }

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
  background: #fff;
  border-top: 1px solid rgba(27, 58, 92, 0.08);
}

.msg-input {
  flex: 1;
  resize: none;
  border: 1px solid rgba(27, 58, 92, 0.14);
  border-radius: 20px;
  padding: 9px 14px;
  font-size: 14px;
  background: #f9f9f7;
  color: #1b3a5c;
  line-height: 1.5;
  outline: none;
  max-height: 120px;
  overflow-y: auto;
}
.msg-input:focus { border-color: #2d6a4f; }

.send-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  border: none;
  background: #2d6a4f;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}
.send-btn:disabled { opacity: 0.4; cursor: default; }
.send-btn svg { width: 20px; height: 20px; }
</style>
