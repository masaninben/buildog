import { reactive, watch } from 'vue'
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { authState } from '../lib/auth'
import type { Organization } from '../types'

const TRIAL_DAYS = 30

const state = reactive({
  org: null as Organization | null,
  loaded: false,
})

function normalizeOrg(id: string, data: Record<string, unknown>): Organization {
  return {
    id,
    name: String(data.name ?? ''),
    ownerId: String(data.ownerId ?? ''),
    plan: (data.plan as Organization['plan']) ?? 'trial',
    trialEndsAt: data.trialEndsAt instanceof Timestamp
      ? data.trialEndsAt.toDate().toISOString()
      : String(data.trialEndsAt ?? ''),
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : String(data.createdAt ?? ''),
  }
}

watch(
  () => authState.user,
  async (user) => {
    if (!user) {
      state.org = null
      state.loaded = false
      return
    }

    // 自分がオーナーの組織を検索
    const q = query(collection(db, 'organizations'), where('ownerId', '==', user.uid))
    const snap = await getDocs(q)

    if (!snap.empty) {
      const docSnap = snap.docs[0]
      state.org = normalizeOrg(docSnap.id, docSnap.data() as Record<string, unknown>)
    } else {
      // 初回ログイン: 組織を自動作成（試用期間スタート）
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

      const ref = await addDoc(collection(db, 'organizations'), {
        name: user.displayName ?? user.email ?? '新しい組織',
        ownerId: user.uid,
        plan: 'trial',
        trialEndsAt: Timestamp.fromDate(trialEnd),
        createdAt: serverTimestamp(),
      })

      state.org = {
        id: ref.id,
        name: user.displayName ?? user.email ?? '新しい組織',
        ownerId: user.uid,
        plan: 'trial',
        trialEndsAt: trialEnd.toISOString(),
        createdAt: new Date().toISOString(),
      }
    }

    state.loaded = true
  },
  { immediate: true },
)

export const orgStore = {
  get org(): Organization | null {
    return state.org
  },

  get loaded(): boolean {
    return state.loaded
  },

  /** 試用期間の残り日数（0 = 期限切れまたは無制限プラン） */
  get trialDaysRemaining(): number {
    if (!state.org || state.org.plan !== 'trial') return 0
    const end = new Date(state.org.trialEndsAt)
    const now = new Date()
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  },

  /** 試用期間が終了しているか */
  get isTrialExpired(): boolean {
    if (!state.org || state.org.plan !== 'trial') return false
    return new Date(state.org.trialEndsAt) <= new Date()
  },
}
