import { reactive, watch } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { authState } from '../lib/auth'
import type { OrgMember, OrgRole, Organization } from '../types'

const TRIAL_DAYS = 30
const MAX_MEMBERS = 10

const state = reactive({
  org: null as Organization | null,
  members: [] as OrgMember[],
  loaded: false,
})

let unsubMembers: Unsubscribe | null = null

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

function normalizeMember(uid: string, data: Record<string, unknown>): OrgMember {
  return {
    uid,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    role: (data.role as OrgRole) ?? 'member',
    canCreateProject: Boolean(data.canCreateProject ?? false),
    joinedAt: data.joinedAt instanceof Timestamp
      ? data.joinedAt.toDate().toISOString()
      : String(data.joinedAt ?? ''),
  }
}

function membersRef(orgId: string) {
  return collection(db, 'organizations', orgId, 'members')
}

function subscribeMembersOf(orgId: string) {
  unsubMembers?.()
  unsubMembers = onSnapshot(membersRef(orgId), (snap) => {
    state.members = snap.docs.map((d) => normalizeMember(d.id, d.data() as Record<string, unknown>))
  })
}

watch(
  () => authState.user,
  async (user) => {
    unsubMembers?.()
    if (!user) {
      state.org = null
      state.members = []
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

    subscribeMembersOf(state.org!.id)
    state.loaded = true
  },
  { immediate: true },
)

export const orgStore = {
  get org(): Organization | null {
    return state.org
  },

  get members(): OrgMember[] {
    return state.members
  },

  get loaded(): boolean {
    return state.loaded
  },

  get memberCount(): number {
    return state.members.length
  },

  /** 試用期間の残り日数 */
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

  /** ログインユーザーが組織のオーナーか */
  get isOwner(): boolean {
    return !!state.org && state.org.ownerId === authState.user?.uid
  },

  /** ログインユーザーが新規案件を作成できるか */
  get canCreateProject(): boolean {
    if (!authState.user) return false
    // オーナーは常に可
    if (this.isOwner) return true
    // メンバーは canCreateProject が付与されている場合のみ
    const me = state.members.find((m) => m.uid === authState.user!.uid)
    return me?.canCreateProject ?? false
  },

  /**
   * メールアドレスでBuildog登録済みユーザーを検索してメンバーに追加
   * ルール上 users コレクションは認証済みユーザーが読み取り可
   */
  async addMemberByEmail(
    email: string,
    role: OrgRole = 'member',
    canCreateProject = false,
  ): Promise<{ success: boolean; error?: string }> {
    if (!state.org) return { success: false, error: '組織が読み込まれていません' }
    if (!this.isOwner) return { success: false, error: 'オーナーのみ操作できます' }
    if (state.members.length >= MAX_MEMBERS) {
      return { success: false, error: `メンバーは最大${MAX_MEMBERS}人までです` }
    }

    const trimmed = email.trim().toLowerCase()
    if (trimmed === authState.user?.email?.toLowerCase()) {
      return { success: false, error: 'オーナー自身は追加できません' }
    }

    // 既に追加済みか確認
    if (state.members.some((m) => m.email.toLowerCase() === trimmed)) {
      return { success: false, error: 'すでにメンバーに追加されています' }
    }

    // users コレクションからメールで検索
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('email', '==', trimmed))
    )

    if (usersSnap.empty) {
      return { success: false, error: 'このメールアドレスのユーザーが見つかりません。先にBuildog登録が必要です。' }
    }

    const userDoc = usersSnap.docs[0]
    const uid = userDoc.id
    const data = userDoc.data()

    await setDoc(doc(membersRef(state.org.id), uid), {
      uid,
      email: trimmed,
      displayName: String(data.displayName ?? email),
      role,
      canCreateProject,
      joinedAt: serverTimestamp(),
    })

    return { success: true }
  },

  /** メンバーを削除 */
  async removeMember(uid: string): Promise<void> {
    if (!state.org || !this.isOwner) return
    await deleteDoc(doc(membersRef(state.org.id), uid))
  },

  /** メンバーの権限を更新 */
  async updateMember(uid: string, patch: Partial<Pick<OrgMember, 'role' | 'canCreateProject'>>): Promise<void> {
    if (!state.org || !this.isOwner) return
    await updateDoc(doc(membersRef(state.org.id), uid), patch)
  },
}
