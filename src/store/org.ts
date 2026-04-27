import { reactive, watch } from 'vue'
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
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
  isOwner: false,
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

/** オーナーの既存プロジェクトに orgId が未設定のものがあれば一括バックフィル */
async function backfillProjectOrgIds(uid: string, orgId: string) {
  const snap = await getDocs(
    query(collection(db, 'projects'), where('ownerId', '==', uid))
  )
  const batch = writeBatch(db)
  let count = 0
  for (const docSnap of snap.docs) {
    if (!docSnap.data().orgId) {
      batch.update(docSnap.ref, { orgId })
      count++
    }
  }
  if (count > 0) await batch.commit()
}

watch(
  () => authState.user,
  async (user) => {
    unsubMembers?.()
    if (!user) {
      state.org = null
      state.members = []
      state.isOwner = false
      state.loaded = false
      return
    }

    // ① 自分がオーナーの組織を検索
    const ownerSnap = await getDocs(
      query(collection(db, 'organizations'), where('ownerId', '==', user.uid))
    )

    if (!ownerSnap.empty) {
      // オーナーとして既存組織を発見
      state.org = normalizeOrg(ownerSnap.docs[0].id, ownerSnap.docs[0].data() as Record<string, unknown>)
      state.isOwner = true
      // 既存プロジェクトへ orgId をバックフィル（初回のみ実質動作）
      await backfillProjectOrgIds(user.uid, state.org.id)
    } else {
      // ② メンバーとして所属している組織を collection group で検索
      const memberSnap = await getDocs(
        query(collectionGroup(db, 'members'), where('uid', '==', user.uid))
      )

      if (!memberSnap.empty) {
        // メンバーとして所属している組織が見つかった
        const orgRef = memberSnap.docs[0].ref.parent.parent!
        const orgSnap = await getDoc(orgRef)
        if (orgSnap.exists()) {
          state.org = normalizeOrg(orgSnap.id, orgSnap.data() as Record<string, unknown>)
        }
        state.isOwner = false
      } else {
        // ③ どこにも所属していない → 新規オーナーとして組織を自動作成
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
        state.isOwner = true
      }
    }

    if (state.org) subscribeMembersOf(state.org.id)
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

  get isOwner(): boolean {
    return state.isOwner
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

  /** ログインユーザーが新規案件を作成できるか */
  get canCreateProject(): boolean {
    if (!authState.user) return false
    if (state.isOwner) return true
    const me = state.members.find((m) => m.uid === authState.user!.uid)
    return me?.canCreateProject ?? false
  },

  async addMemberByEmail(
    email: string,
    role: OrgRole = 'member',
    canCreateProject = false,
  ): Promise<{ success: boolean; error?: string }> {
    if (!state.org) return { success: false, error: '組織が読み込まれていません' }
    if (!state.isOwner) return { success: false, error: 'オーナーのみ操作できます' }
    if (state.members.length >= MAX_MEMBERS) {
      return { success: false, error: `メンバーは最大${MAX_MEMBERS}人までです` }
    }

    const trimmed = email.trim().toLowerCase()
    if (trimmed === authState.user?.email?.toLowerCase()) {
      return { success: false, error: 'オーナー自身は追加できません' }
    }
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

  async removeMember(uid: string): Promise<void> {
    if (!state.org || !state.isOwner) return
    await deleteDoc(doc(membersRef(state.org.id), uid))
  },

  async updateMember(uid: string, patch: Partial<Pick<OrgMember, 'role' | 'canCreateProject'>>): Promise<void> {
    if (!state.org || !state.isOwner) return
    await updateDoc(doc(membersRef(state.org.id), uid), patch)
  },
}
