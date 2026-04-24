import { reactive, watch } from 'vue'
import { doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, collection, query, where, limit } from 'firebase/firestore'
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
  username?: string
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
        username:    (d.username     as string)   ?? '',
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

  async updateUsername(username: string): Promise<{ ok: boolean; error?: string }> {
    const uid = state.profile?.uid
    if (!uid) return { ok: false, error: 'ログインが必要です' }
    const trimmed = username.trim().toLowerCase()
    if (trimmed && !/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      return { ok: false, error: '3〜20文字の英数字・アンダースコアのみ使用できます' }
    }
    // 重複チェック
    if (trimmed) {
      const q = query(collection(db, 'users'), where('username', '==', trimmed), limit(1))
      const snap = await getDocs(q)
      if (!snap.empty && snap.docs[0].id !== uid) {
        return { ok: false, error: 'このユーザー名はすでに使われています' }
      }
    }
    await updateDoc(doc(db, 'users', uid), { username: trimmed })
    if (state.profile) {
      state.profile = { ...state.profile, username: trimmed }
    }
    return { ok: true }
  },

  // ユーザー名 or UID から uid を解決
  async resolveUid(handle: string): Promise<string | null> {
    // Firebase UID は28文字の英数字
    if (/^[A-Za-z0-9]{20,}$/.test(handle)) return handle
    // ユーザー名で検索
    const q = query(collection(db, 'users'), where('username', '==', handle.toLowerCase()), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) return snap.docs[0].id
    return null
  },
}
