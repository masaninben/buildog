<template>
  <div class="karte-board">

    <!-- ヘッダー（KarteToolbar 54px の下） -->
    <header class="board-header">
      <button class="back-btn" @click="router.push({ name: 'karte-home' })">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div class="header-title">
        <span class="project-name">{{ boardDoc?.projectName ?? '連絡掲示板' }}</span>
      </div>
      <div class="header-right">
        <div v-if="activeTab === 'chat'" class="header-members">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{{ activeMembers.length }}</span>
        </div>
      </div>
    </header>

    <!-- タブ -->
    <nav class="board-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'photos' }"
        @click="activeTab = 'photos'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        施工記録
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'chat' }"
        @click="switchToChat"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        連絡
        <span v-if="hasUnreadChat && activeTab !== 'chat'" class="tab-unread" />
      </button>
    </nav>

    <!-- ===== 施工記録タブ ===== -->
    <div v-if="activeTab === 'photos'" class="photos-area">
      <div v-if="loadingPhotos" class="area-loading">読み込み中…</div>
      <div v-else-if="visiblePhotoGroups.length === 0" class="area-empty">
        <span>📷</span>
        <p>施工写真はまだありません</p>
        <p class="area-empty-sub">担当業者が写真を追加すると<br>ここに表示されます</p>
      </div>
      <template v-else>
        <section v-for="group in visiblePhotoGroups" :key="group.key" class="photo-group">
          <h3 class="group-label">{{ group.label }}</h3>
          <div class="photo-grid">
            <div
              v-for="photo in group.photos"
              :key="photo.id"
              class="photo-cell"
              @click="openViewer(photo.url)"
            >
              <img :src="photo.url" class="photo-thumb" />
              <p v-if="photo.memo" class="photo-memo">{{ photo.memo }}</p>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- ===== 連絡タブ ===== -->
    <template v-else-if="activeTab === 'chat'">

      <!-- 非参加 -->
      <div v-if="myStatus === 'inactive'" class="inactive-screen">
        <span class="inactive-owl">🦉</span>
        <p class="inactive-title">現在この掲示板には<br>参加していません。</p>
        <p class="inactive-sub">参加するには担当業者に<br>お問い合わせください。</p>
      </div>

      <!-- チャット本体 -->
      <template v-else-if="myStatus === 'active'">
        <div ref="messagesEl" class="messages-area">
          <div v-if="loadingChat" class="msg-loading">読み込み中…</div>
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
                        @click="openViewer(url)"
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

      <!-- 確認中 -->
      <div v-else class="inactive-screen">
        <p class="inactive-sub">確認中…</p>
      </div>

    </template>

    <!-- 写真ビューワー -->
    <Transition name="fade">
      <div v-if="viewerUrl" class="photo-viewer" @click="viewerUrl = null">
        <img :src="viewerUrl" class="viewer-img" />
        <button class="viewer-close" @click.stop="viewerUrl = null">✕</button>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, getDocs, collection, query, where, orderBy } from 'firebase/firestore'
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
import type { BoardMessageDoc, BoardMemberDoc, BoardDoc, ProjectPhoto, ProjectPhotoTag } from '../../types'

const route  = useRoute()
const router = useRouter()

const boardId = route.params.boardId as string
const myUid   = computed(() => authState.user?.uid ?? '')

// ===== タブ =====
const activeTab = ref<'photos' | 'chat'>('photos')

function switchToChat() {
  activeTab.value = 'chat'
  markBoardVisited(boardId)
}

// ===== ボード情報 =====
const boardDoc = ref<BoardDoc | null>(null)

// ===== メンバー =====
const boardMembers  = ref<BoardMemberDoc[]>([])
const activeMembers = computed(() => boardMembers.value.filter((m) => m.status === 'active'))
const myStatus      = ref<'active' | 'inactive' | null>(null)

// ===== 施工写真 =====
const publicPhotos  = ref<ProjectPhoto[]>([])
const loadingPhotos = ref(true)

const TAG_GROUPS: { key: ProjectPhotoTag; label: string }[] = [
  { key: 'before',   label: 'ビフォー（工事前）' },
  { key: 'during',   label: '施工中' },
  { key: 'material', label: '使用材料' },
  { key: 'after',    label: 'アフター（完工）' },
  { key: 'untagged', label: 'その他' },
]

const visiblePhotoGroups = computed(() =>
  TAG_GROUPS
    .map((g) => ({
      ...g,
      photos: publicPhotos.value.filter((p) => p.tag === g.key),
    }))
    .filter((g) => g.photos.length > 0),
)

async function fetchPhotos(projectId: string) {
  loadingPhotos.value = true
  try {
    const snap = await getDocs(
      query(
        collection(db, `projects/${projectId}/photos`),
        where('isPublic', '==', true),
        orderBy('sortOrder', 'asc'),
      ),
    )
    publicPhotos.value = snap.docs.map((d) => {
      const data = d.data()
      return {
        id:          d.id,
        url:         String(data.url ?? ''),
        storagePath: String(data.storagePath ?? ''),
        createdAt:   data.createdAt?.toDate?.()?.toISOString?.() ?? '',
        uploadedBy:  String(data.uploadedBy ?? ''),
        isPublic:    true,
        tag:         (data.tag ?? 'untagged') as ProjectPhotoTag,
        memo:        String(data.memo ?? ''),
        sortOrder:   typeof data.sortOrder === 'number' ? data.sortOrder : null,
      } as ProjectPhoto
    })
  } catch (e) {
    console.error('[karte-board] fetchPhotos failed:', e)
  } finally {
    loadingPhotos.value = false
  }
}

// ===== チャット =====
const messages   = ref<BoardMessageDoc[]>([])
const loadingChat = ref(true)
let   unsubMsgs:    (() => void) | null = null
let   unsubMembers: (() => void) | null = null

const hasUnreadChat = computed(() =>
  messages.value.some((m) => !m.readBy.includes(myUid.value)),
)

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

// ===== 写真ビューワー =====
const viewerUrl = ref<string | null>(null)
function openViewer(url: string) { viewerUrl.value = url }

// ===== メッセージ送信 =====
const inputText      = ref('')
const sending        = ref(false)
const textareaEl     = ref<HTMLTextAreaElement | null>(null)
const photoInputEl   = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)
const messagesEl     = ref<HTMLElement | null>(null)

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
    // 施工写真を取得
    await fetchPhotos(d.projectId)
  }

  // 自分のステータス確認
  myStatus.value = await getMyBoardStatus(boardId, myUid.value)

  if (myStatus.value === 'active') {
    unsubMsgs = subscribeMessages(boardId, (msgs) => {
      messages.value = msgs
      loadingChat.value = false
      // 連絡タブが開いているときだけ既読にする
      if (activeTab.value === 'chat') {
        const uid = myUid.value
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

// タブを連絡に切り替えたとき未読をまとめて既読にする
watch(activeTab, (tab) => {
  if (tab === 'chat') {
    const uid = myUid.value
    messages.value.forEach((msg) => {
      if (!msg.readBy.includes(uid)) {
        markMessageRead(boardId, msg.messageId, uid).catch(() => {})
      }
    })
    scrollToBottom()
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
  z-index: 20;
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
}

.project-name {
  font-weight: 700;
  font-size: 15px;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.header-right { flex-shrink: 0; }

.header-members {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(27, 58, 92, 0.5);
  font-size: 13px;
  font-weight: 700;
}
.header-members svg { width: 16px; height: 16px; }

/* タブ */
.board-tabs {
  position: fixed;
  top: 106px; /* 54 + 52 */
  left: 0;
  right: 0;
  z-index: 20;
  height: 44px;
  display: flex;
  background: #fff;
  border-bottom: 1px solid rgba(27, 58, 92, 0.08);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: rgba(27, 58, 92, 0.44);
  cursor: pointer;
  position: relative;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.tab-btn svg { width: 16px; height: 16px; }

.tab-btn.active {
  color: #2d6a4f;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #2d6a4f;
  border-radius: 2px 2px 0 0;
}

.tab-unread {
  width: 7px;
  height: 7px;
  background: #f4a261;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ===== 施工記録タブ ===== */
.photos-area {
  padding-top: 150px; /* 54 + 52 + 44 */
  padding-bottom: 32px;
  min-height: 100vh;
}

.area-loading,
.area-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 24px;
  text-align: center;
  font-size: 14px;
  color: rgba(27, 58, 92, 0.44);
}
.area-empty span { font-size: 40px; }
.area-empty p { font-weight: 600; color: rgba(27, 58, 92, 0.6); }
.area-empty-sub { font-size: 12px; line-height: 1.7; }

.photo-group {
  padding: 0 16px;
  margin-bottom: 28px;
}

.group-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.44);
  letter-spacing: 0.04em;
  margin-bottom: 10px;
  padding-left: 2px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.photo-cell {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(27, 58, 92, 0.06);
  cursor: zoom-in;
}

.photo-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.photo-memo {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.55);
  padding: 6px 10px 8px;
  line-height: 1.5;
  word-break: break-word;
}

/* ===== 連絡タブ ===== */

/* 非参加 */
.inactive-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 24px;
  padding-top: 160px;
  text-align: center;
}
.inactive-owl   { font-size: 52px; }
.inactive-title { font-size: 16px; font-weight: 700; color: #1b3a5c; line-height: 1.7; }
.inactive-sub   { font-size: 13px; color: rgba(27,58,92,0.5); line-height: 1.7; }

/* メッセージエリア */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 150px 14px calc(80px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 100vh;
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

/* 入力欄 */
.hidden-input { display: none; }

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
  z-index: 10;
}

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

.sending-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 写真ビューワー */
.photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.viewer-img {
  max-width: 96vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
}
.viewer-close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.18);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
