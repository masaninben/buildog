<template>
  <div class="omap-wrap">
    <div v-if="loading" class="omap-state">読み込み中…</div>
    <div v-else-if="totalOwners === 0" class="omap-state">まだ所有者データがありません</div>
    <template v-else>
      <div ref="mapEl" class="omap-el" />
      <div class="omap-footer">{{ totalOwners }}人が所有 · {{ locationCount }}地域</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { userProfileStore } from '../store/userProfile'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const props = defineProps<{ productId?: string }>()

const mapEl = ref<HTMLElement | null>(null)
const loading = ref(true)
const totalOwners = ref(0)
const locationCount = ref(0)
let mapInstance: L.Map | null = null

async function geocode(prefecture: string, city: string): Promise<[number, number] | null> {
  const key = `penstok_geo_${prefecture}__${city}`
  const cached = localStorage.getItem(key)
  if (cached) return JSON.parse(cached)

  await new Promise(r => setTimeout(r, 250))
  const q = `${city} ${prefecture} Japan`
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=jp&accept-language=ja`,
      { headers: { 'User-Agent': 'Penstok/1.0' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      localStorage.setItem(key, JSON.stringify(coords))
      return coords
    }
  } catch (e) {
    console.warn('geocode error:', e)
  }
  return null
}

async function initMap() {
  if (!props.productId) { loading.value = false; return }

  // 1. データ取得
  const snap = await getDoc(doc(db, 'products', props.productId))
  const locationCounts: Record<string, number> = snap.data()?.locationCounts ?? {}
  const entries = Object.entries(locationCounts).filter(([, v]) => v > 0)

  totalOwners.value = entries.reduce((s, [, v]) => s + v, 0)
  locationCount.value = entries.length

  // 2. loading を false にして mapEl を DOM に出す
  loading.value = false
  if (entries.length === 0) return

  // 3. DOM 更新を待ってから Leaflet 初期化（v-else による条件レンダリング対応）
  await nextTick()
  if (!mapEl.value) return

  const profile = userProfileStore.profile
  let center: [number, number] = [36.2048, 138.2529]
  if (profile?.prefecture && profile?.city) {
    const coords = await geocode(profile.prefecture, profile.city)
    if (coords) center = coords
  }

  if (mapInstance) { mapInstance.remove(); mapInstance = null }
  mapInstance = L.map(mapEl.value, {
    center,
    zoom: 10,
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO',
  }).addTo(mapInstance)

  L.control.attribution({ position: 'bottomright', prefix: false }).addTo(mapInstance)

  // ユーザー自身の位置
  if (profile?.prefecture && profile?.city) {
    const coords = await geocode(profile.prefecture, profile.city)
    if (coords) {
      L.circleMarker(coords, {
        radius: 5, fillColor: '#c9942a', color: '#fff', weight: 1.5, fillOpacity: 1,
      }).bindTooltip('あなたの位置', { direction: 'top' }).addTo(mapInstance)
    }
  }

  // 所有者分布サークル
  const maxCount = Math.max(...entries.map(([, v]) => v))
  for (const [locKey, count] of entries) {
    const [prefecture, city] = locKey.split('__')
    if (!prefecture || !city) continue
    const coords = await geocode(prefecture, city)
    if (!coords) continue

    const radius = 10 + Math.sqrt(count / maxCount) * 22
    L.circleMarker(coords, {
      radius,
      fillColor: '#c9942a',
      color: 'rgba(201,148,42,0.5)',
      weight: 1,
      fillOpacity: 0.2,
    }).bindTooltip(`<b>${prefecture} ${city}</b><br>${count}人が所有`, { direction: 'top' })
      .addTo(mapInstance)
  }
}

onMounted(initMap)
onUnmounted(() => { mapInstance?.remove(); mapInstance = null })
</script>

<style scoped>
.omap-wrap {
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-surface);
}

.omap-el {
  width: 100%;
  height: 200px;
}

.omap-state {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-faint);
}

.omap-footer {
  padding: 5px 10px;
  font-size: 10px;
  color: var(--text-faint);
  text-align: right;
}
</style>
