import { reactive, watch } from 'vue'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { authState } from '../lib/auth'
import type { UserPlan } from '../types'

const TRIAL_DAYS = 30

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
  plan: UserPlan
  trialEndsAt: string
}

const state = reactive({
  profile: null as UserProfile | null,
  loaded: false,
})

watch(
  () => authState.user,
  async (user) => {
    if (!user) {
      state.profile = null
      state.loaded = false
      return
    }

    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
      await setDoc(ref, {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        plan: 'trial',
        trialEndsAt: Timestamp.fromDate(trialEnd),
        createdAtServer: serverTimestamp(),
      })
      state.profile = {
        uid: user.uid,
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        plan: 'trial',
        trialEndsAt: trialEnd.toISOString(),
      }
    } else {
      const data = snap.data()
      const trialEndsAt = data.trialEndsAt instanceof Timestamp
        ? data.trialEndsAt.toDate().toISOString()
        : String(data.trialEndsAt ?? '')

      if (!data.plan) {
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
        await updateDoc(ref, {
          plan: 'trial',
          trialEndsAt: Timestamp.fromDate(trialEnd),
        })
        state.profile = {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          plan: 'trial',
          trialEndsAt: trialEnd.toISOString(),
        }
      } else {
        state.profile = {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          plan: (data.plan as UserPlan) ?? 'trial',
          trialEndsAt,
        }
      }
    }
    state.loaded = true
  },
  { immediate: true },
)

export const userProfileStore = {
  get profile() {
    return state.profile
  },

  get loaded() {
    return state.loaded
  },

  get isTrialExpired(): boolean {
    const p = state.profile
    if (!p || p.plan !== 'trial') return false
    return new Date(p.trialEndsAt) <= new Date()
  },

  get trialDaysRemaining(): number {
    const p = state.profile
    if (!p || p.plan !== 'trial') return 0
    const end = new Date(p.trialEndsAt)
    const now = new Date()
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  },

  get canCreateProject(): boolean {
    const p = state.profile
    if (!p) return false
    if (p.plan === 'unlimited') return true
    return !this.isTrialExpired
  },
}
