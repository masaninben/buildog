<template>
  <div class="scanner-overlay">
    <!-- カメラ映像（全画面） -->
    <video ref="videoEl" class="scanner-video" autoplay playsinline muted />

    <!-- 暗幕オーバーレイ（スキャン帯の上下を暗くする） -->
    <div class="dim-top" />
    <div class="dim-bottom" />

    <!-- バーコード用 横長スキャン帯 -->
    <div class="scan-strip" :class="{ flash: flashActive }">
      <div class="strip-corner sc-tl" />
      <div class="strip-corner sc-tr" />
      <div class="strip-corner sc-bl" />
      <div class="strip-corner sc-br" />
      <div v-if="isScanning" class="scan-line" />
    </div>

    <!-- 上部タイトル -->
    <div class="scanner-top">
      <span class="scanner-title">バーコードをスキャン</span>
    </div>

    <!-- 上部ヒント（スキャン帯の直上） -->
    <div v-if="isScanning && !errorMsg" class="strip-hint-above">
      バーコードをこの帯に合わせてください
    </div>

    <!-- 中央 通知オーバーレイ（一時表示） -->
    <transition name="notify">
      <div v-if="notification" class="scan-notify" :class="notification.type">
        {{ notification.text }}
      </div>
    </transition>

    <!-- エラー -->
    <div v-if="errorMsg" class="scanner-error-box">
      <p class="error-text">{{ errorMsg }}</p>
      <button class="retry-btn" @click="start">もう一度試す</button>
    </div>

    <!-- 下部：大きな戻るボタン -->
    <div class="scanner-bottom">
      <p v-if="!isScanning && !errorMsg" class="scanner-hint">カメラを起動中…</p>
      <button class="close-big-btn" @click="$emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        スキャンをやめる
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

export interface PendingScan {
  barcode: string
  status: 'loading' | 'found' | 'notfound'
  result?: {
    name: string
    creator: string
    imageUrl: string
    category: string
    isbn?: string
    janCode?: string
    externalSource?: string
  }
}

// 親から結果フィードバックを受け取る
const props = defineProps<{
  scanFeedback?: { status: 'found' | 'notfound'; ts: number; message?: string }
}>()

const emit = defineEmits<{
  close:    []
  detected: [barcode: string]
}>()

const videoEl     = ref<HTMLVideoElement | null>(null)
const isScanning  = ref(false)
const flashActive = ref(false)
const errorMsg    = ref('')
const notification = ref<{ text: string; type: 'found' | 'notfound' } | null>(null)

let notifyTimer: ReturnType<typeof setTimeout> | null = null
let lastBarcode = ''
let cooldownTimer: ReturnType<typeof setTimeout> | null = null
let stopFn: (() => void) | null = null

// 親からのフィードバックで通知を出す
watch(() => props.scanFeedback, (fb) => {
  if (!fb) return
  if (fb.status === 'found') {
    showNotify(fb.message ?? 'リストに追加しました ✓', 'found')
  } else {
    showNotify(fb.message ?? 'この商品は見つかりませんでした', 'notfound')
  }
}, { deep: true })

function showNotify(text: string, type: 'found' | 'notfound') {
  notification.value = { text, type }
  if (notifyTimer) clearTimeout(notifyTimer)
  notifyTimer = setTimeout(() => { notification.value = null }, 2000)
}

onMounted(() => start())
onUnmounted(() => {
  stopFn?.()
  if (cooldownTimer) clearTimeout(cooldownTimer)
  if (notifyTimer) clearTimeout(notifyTimer)
})

async function start() {
  errorMsg.value = ''
  isScanning.value = false
  lastBarcode = ''
  stopFn?.()
  stopFn = null

  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()

    // 背面カメラ優先
    let deviceId: string | undefined
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      const back = devices.find(d => /back|rear|environment/i.test(d.label))
      deviceId = back?.deviceId
    } catch { /* デフォルト */ }

    const controls = await reader.decodeFromVideoDevice(
      deviceId,
      videoEl.value!,
      (result) => { if (result) handleDetection(result.getText()) }
    )

    stopFn = () => controls.stop()
    isScanning.value = true

  } catch (e: any) {
    if (e?.name === 'NotAllowedError') {
      errorMsg.value = 'カメラへのアクセスが拒否されました。ブラウザの設定で許可してください。'
    } else if (e?.name === 'NotFoundError') {
      errorMsg.value = 'カメラが見つかりませんでした。'
    } else {
      errorMsg.value = `カメラを起動できませんでした（${e?.message ?? 'unknown'}）`
    }
  }
}

function handleDetection(barcode: string) {
  if (barcode === lastBarcode) return

  lastBarcode = barcode
  if (cooldownTimer) clearTimeout(cooldownTimer)
  cooldownTimer = setTimeout(() => { lastBarcode = '' }, 3000)

  // 視覚・触覚フィードバック
  flashActive.value = true
  setTimeout(() => { flashActive.value = false }, 400)
  if ('vibrate' in navigator) navigator.vibrate(60)

  emit('detected', barcode)
}
</script>

<style scoped>
.scanner-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: #000;
  display: flex;
  flex-direction: column;
}

/* カメラ（全画面） */
.scanner-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 上下の暗幕 — スキャン帯(38〜62%)以外を暗くする */
.dim-top,
.dim-bottom {
  position: absolute;
  left: 0; right: 0;
  background: rgba(0, 0, 0, 0.65);
  pointer-events: none;
  z-index: 1;
}
.dim-top    { top: 0;   height: 38%; }
.dim-bottom { top: 62%; bottom: 0; }

/* バーコード用 横長スキャン帯 */
.scan-strip {
  position: absolute;
  top: 38%; left: 5%; right: 5%; height: 24%;
  pointer-events: none;
  z-index: 2;
  transition: box-shadow 0.12s;
  border-radius: 4px;
}
.scan-strip.flash {
  box-shadow: 0 0 0 3px #4caf50, 0 0 24px rgba(76,175,80,0.55);
}

/* 四隅マーカー */
.strip-corner {
  position: absolute;
  width: 22px; height: 22px;
  border-color: rgba(255,255,255,0.95); border-style: solid; border-width: 0;
}
.sc-tl { top:0;    left:0;  border-top-width:3px; border-left-width:3px;  border-top-left-radius:3px; }
.sc-tr { top:0;    right:0; border-top-width:3px; border-right-width:3px; border-top-right-radius:3px; }
.sc-bl { bottom:0; left:0;  border-bottom-width:3px; border-left-width:3px;  border-bottom-left-radius:3px; }
.sc-br { bottom:0; right:0; border-bottom-width:3px; border-right-width:3px; border-bottom-right-radius:3px; }

/* スキャンライン（横スライド） */
.scan-line {
  position: absolute;
  top: 8%; bottom: 8%; width: 2px;
  background: linear-gradient(to bottom, transparent, #f0c040 25%, #fff 50%, #f0c040 75%, transparent);
  box-shadow: 0 0 10px rgba(240,192,64,0.9);
  border-radius: 1px;
  animation: scanH 2s ease-in-out infinite;
}
@keyframes scanH {
  0%   { left: 3%; }
  50%  { left: 94%; }
  100% { left: 3%; }
}

/* 帯の直上ヒント */
.strip-hint-above {
  position: absolute;
  top: 32%;
  left: 0; right: 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
  z-index: 3;
  letter-spacing: 0.03em;
}

/* 上部 */
.scanner-top {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 4;
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top, 20px));
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.scanner-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  letter-spacing: 0.04em;
}

/* 通知オーバーレイ */
.scan-notify {
  position: absolute;
  top: 68%;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 28px;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  white-space: pre-line;
  max-width: 80%;
  pointer-events: none;
  z-index: 10;
}
.scan-notify.found    { background: rgba(76,175,80,0.9);   color: #fff; }
.scan-notify.notfound { background: rgba(180,60,40,0.88);  color: #fff; }

.notify-enter-active  { transition: opacity 0.2s, transform 0.2s; }
.notify-leave-active  { transition: opacity 0.3s; }
.notify-enter-from    { opacity: 0; transform: translate(-50%, calc(-50% + 8px)); }
.notify-leave-to      { opacity: 0; }

/* エラー */
.scanner-error-box {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
}
.error-text { font-size: 14px; color: #f09090; text-align: center; line-height: 1.7; }
.retry-btn {
  height: 44px; padding: 0 28px;
  background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.4);
  border-radius: 22px; color: #fff; font-size: 14px; font-weight: 600;
  font-family: inherit; cursor: pointer;
}

/* 下部 */
.scanner-bottom {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 4;
  padding: 20px 24px;
  padding-bottom: max(28px, env(safe-area-inset-bottom, 28px));
  background: linear-gradient(to top, rgba(0,0,0,0.82) 60%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.scanner-hint {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  text-align: center;
}

/* 大きな戻るボタン */
.close-big-btn {
  width: 100%;
  max-width: 340px;
  height: 60px;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.35);
  border-radius: 16px;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.03em;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.close-big-btn:active { background: rgba(255,255,255,0.25); }
.close-big-btn svg { width: 22px; height: 22px; flex-shrink: 0; }
</style>
