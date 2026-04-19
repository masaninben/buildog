import { reactive, watch } from 'vue'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { authState } from '../lib/auth'

export type UserRole = 'user' | 'viewer' | 'editor' | 'admin'

export const ROLE_LABELS: Record<UserRole, string> = {
  user:   '一般ユーザー',
  viewer: '商品DB閲覧',
  editor: '商品DB編集',
  admin:  '総合管理者',
}

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
  role: UserRole
  prefecture?: string
  city?: string
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

    if (snap.exists()) {
      const d = snap.data()
      // Auth の最新情報を Firestore に同期（名前・アバターが空の場合）
      const needsSync =
        (user.displayName && d.displayName !== user.displayName) ||
        (user.photoURL && d.photoURL !== user.photoURL)
      if (needsSync) {
        updateDoc(ref, {
          displayName: user.displayName ?? d.displayName ?? '',
          photoURL:    user.photoURL    ?? d.photoURL    ?? '',
        }).catch(() => {})
      }
      state.profile = {
        uid:         user.uid,
        displayName: user.displayName || (d.displayName as string) || '',
        email:       user.email       ?? '',
        photoURL:    user.photoURL    || (d.photoURL as string)    || '',
        role:        (d.role         as UserRole) ?? 'user',
        prefecture:  (d.prefecture   as string)   ?? '',
        city:        (d.city         as string)   ?? '',
      }
    } else {
      const profile = {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        role: 'user' as UserRole,
        createdAt: serverTimestamp(),
      }
      await setDoc(ref, profile)
      state.profile = { uid: user.uid, ...profile }
    }

    state.loaded = true
  },
  { immediate: true },
)

export const userProfileStore = {
  get profile()  { return state.profile },
  get loaded()   { return state.loaded  },
  get role()     { return state.profile?.role ?? 'user' },
  // 商品DBに何らかのアクセス権がある（viewer以上）
  get canAccessAdmin() {
    return ['viewer', 'editor', 'admin'].includes(state.profile?.role ?? '')
  },
  // 商品DBを編集できる
  get isEditor() {
    return ['editor', 'admin'].includes(state.profile?.role ?? '')
  },
  // ユーザー管理など全権限
  get isAdmin()  { return state.profile?.role === 'admin' },

  async updateLocation(prefecture: string, city: string) {
    const uid = state.profile?.uid
    if (!uid) return
    await updateDoc(doc(db, 'users', uid), { prefecture, city })
    if (state.profile) {
      state.profile = { ...state.profile, prefecture, city }
    }
  },
}
