import { reactive, watch } from 'vue'
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { authState } from '../lib/auth'
import type { BuildogProject, CreateProjectPayload, ProjectMember, ProjectPhoto, ProjectPhotoTag } from '../types'

const state = reactive({
  projects: [] as BuildogProject[],
  loaded: false,
  photosByProject: {} as Record<string, ProjectPhoto[]>,
  membersByProject: {} as Record<string, ProjectMember[]>,
})

let ownedUnsub: Unsubscribe | null = null
let userDocUnsub: Unsubscribe | null = null
const photoUnsubscribes = new Map<string, Unsubscribe>()
const memberUnsubscribes = new Map<string, Unsubscribe>()

let ownedProjects: BuildogProject[] = []
let sharedProjects: BuildogProject[] = []

function mergeAndSetProjects() {
  const ownedIds = new Set(ownedProjects.map((p) => p.id))
  state.projects = sortProjects([
    ...ownedProjects,
    ...sharedProjects.filter((p) => !ownedIds.has(p.id)),
  ])
}

function projectsRef() {
  return collection(db, 'projects')
}

function projectRef(projectId: string) {
  return doc(db, 'projects', projectId)
}

function projectPhotosRef(projectId: string) {
  return collection(db, 'projects', projectId, 'photos')
}

function projectMembersRef(projectId: string) {
  return collection(db, 'projects', projectId, 'members')
}

function sortProjects(projects: BuildogProject[]) {
  return [...projects].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER
    if (aOrder !== bOrder) return aOrder - bOrder
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function sortPhotos(photos: ProjectPhoto[]) {
  return [...photos].sort((a, b) => {
    const orderDiff = (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
    if (orderDiff !== 0) return orderDiff
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function normalizeProject(id: string, data: Record<string, unknown>): BuildogProject {
  return {
    id,
    name: String(data.name ?? ''),
    clientName: String(data.clientName ?? ''),
    siteAddress: String(data.siteAddress ?? ''),
    ownerId: String(data.ownerId ?? ''),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt ?? data.createdAt),
    isPublic: Boolean(data.isPublic),
    publicSlug: String(data.publicSlug ?? ''),
    coverPhotoUrl: String(data.coverPhotoUrl ?? ''),
    coverPhotoId: String(data.coverPhotoId ?? ''),
    photoCount: Number(data.photoCount ?? 0),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : null,
    // Karte連携フィールド
    karteInviteEmail: data.karteInviteEmail ? String(data.karteInviteEmail) : undefined,
    karteInvitedAt:   data.karteInvitedAt   ? toIsoString(data.karteInvitedAt)   : undefined,
    karteUserId:      data.karteUserId       ? String(data.karteUserId)       : undefined,
    karteLinkedAt:    data.karteLinkedAt     ? toIsoString(data.karteLinkedAt)     : undefined,
    karteStatus:      data.karteStatus       ? (data.karteStatus as BuildogProject['karteStatus']) : undefined,
    // 掲示板フィールド
    boardId:              data.boardId              ? String(data.boardId)              : undefined,
    boardLastMessageAt:   data.boardLastMessageAt   ? toIsoString(data.boardLastMessageAt)   : undefined,
    boardLastMessageText: data.boardLastMessageText ? String(data.boardLastMessageText) : undefined,
  }
}

function normalizePhoto(id: string, data: Record<string, unknown>): ProjectPhoto {
  const rawTag = String(data.tag ?? 'untagged')
  const tag: ProjectPhotoTag = rawTag === 'other' ? 'untagged' : (
    rawTag === 'before' || rawTag === 'during' || rawTag === 'after' || rawTag === 'material' || rawTag === 'untagged'
      ? rawTag
      : 'untagged'
  )
  return {
    id,
    url: String(data.url ?? ''),
    storagePath: String(data.storagePath ?? ''),
    createdAt: toIsoString(data.createdAt),
    uploadedBy: String(data.uploadedBy ?? ''),
    isPublic: Boolean(data.isPublic),
    tag,
    memo: String(data.memo ?? ''),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : null,
  }
}

function normalizeMember(uid: string, data: Record<string, unknown>): ProjectMember {
  return {
    uid,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    canEdit: Boolean(data.canEdit ?? false),
    canArchive: Boolean(data.canArchive ?? false),
    canInvite: Boolean(data.canInvite ?? false),
    joinedAt: data.joinedAt instanceof Timestamp
      ? data.joinedAt.toDate().toISOString()
      : String(data.joinedAt ?? ''),
  }
}

function toIsoString(value: unknown) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return ''
}

function clearAll() {
  ownedUnsub?.()
  ownedUnsub = null
  userDocUnsub?.()
  userDocUnsub = null
  photoUnsubscribes.forEach((u) => u())
  photoUnsubscribes.clear()
  memberUnsubscribes.forEach((u) => u())
  memberUnsubscribes.clear()
  ownedProjects = []
  sharedProjects = []
  state.projects = []
  state.photosByProject = {}
  state.membersByProject = {}
  state.loaded = false
}

watch(
  () => authState.user,
  (user) => {
    clearAll()
    if (!user) return

    // 自分がオーナーの案件
    ownedUnsub = onSnapshot(
      query(projectsRef(), where('ownerId', '==', user.uid)),
      (snap) => {
        ownedProjects = snap.docs.map((d) => normalizeProject(d.id, d.data() as Record<string, unknown>))
        mergeAndSetProjects()
        state.loaded = true
      },
    )

    // 自分が共有された案件（users/{uid}.sharedProjectIds で管理）
    userDocUnsub = onSnapshot(
      doc(db, 'users', user.uid),
      async (userSnap) => {
        const sharedIds: string[] = userSnap.data()?.sharedProjectIds ?? []
        if (sharedIds.length === 0) {
          sharedProjects = []
          mergeAndSetProjects()
          state.loaded = true
          return
        }
        const ownedIds = new Set(ownedProjects.map((p) => p.id))
        const toFetch = sharedIds.filter((id) => !ownedIds.has(id))
        const fetched = await Promise.all(toFetch.map((id) => getDoc(projectRef(id))))
        sharedProjects = fetched
          .filter((d) => d.exists())
          .map((d) => normalizeProject(d.id, d.data() as Record<string, unknown>))
        mergeAndSetProjects()
        state.loaded = true
      },
      (err) => {
        console.error('[projectStore] userDoc subscription error:', err)
        state.loaded = true
      },
    )
  },
  { immediate: true },
)

export const projectStore = {
  get projects() {
    return state.projects
  },

  get loaded() {
    return state.loaded
  },

  getProjectById(id: string) {
    return state.projects.find((p) => p.id === id)
  },

  getPhotos(projectId: string) {
    return state.photosByProject[projectId] ?? []
  },

  getMembers(projectId: string): ProjectMember[] {
    return state.membersByProject[projectId] ?? []
  },

  isOwner(projectId: string): boolean {
    const uid = authState.user?.uid
    if (!uid) return false
    return state.projects.find((p) => p.id === projectId)?.ownerId === uid
  },

  myMemberData(projectId: string): ProjectMember | undefined {
    const uid = authState.user?.uid
    if (!uid) return undefined
    return state.membersByProject[projectId]?.find((m) => m.uid === uid)
  },

  canEditPhotos(projectId: string): boolean {
    return this.isOwner(projectId) || (this.myMemberData(projectId)?.canEdit ?? false)
  },

  canInvite(projectId: string): boolean {
    return this.isOwner(projectId) || (this.myMemberData(projectId)?.canInvite ?? false)
  },

  subscribePhotos(projectId: string) {
    const uid = authState.user?.uid
    if (!uid || photoUnsubscribes.has(projectId)) return

    const unsubscribe = onSnapshot(
      query(projectPhotosRef(projectId), orderBy('createdAt', 'asc')),
      (snapshot) => {
        state.photosByProject[projectId] = sortPhotos(
          snapshot.docs.map((entry) => normalizePhoto(entry.id, entry.data())),
        )
      },
    )
    photoUnsubscribes.set(projectId, unsubscribe)
  },

  unsubscribePhotos(projectId: string) {
    const unsubscribe = photoUnsubscribes.get(projectId)
    if (!unsubscribe) return
    unsubscribe()
    photoUnsubscribes.delete(projectId)
  },

  subscribeMembers(projectId: string) {
    if (memberUnsubscribes.has(projectId)) return
    const unsub = onSnapshot(projectMembersRef(projectId), (snap) => {
      state.membersByProject[projectId] = snap.docs.map((d) =>
        normalizeMember(d.id, d.data() as Record<string, unknown>),
      )
    })
    memberUnsubscribes.set(projectId, unsub)
  },

  unsubscribeMembers(projectId: string) {
    const unsub = memberUnsubscribes.get(projectId)
    if (!unsub) return
    unsub()
    memberUnsubscribes.delete(projectId)
  },

  async createProject(payload: CreateProjectPayload) {
    const uid = authState.user?.uid
    if (!uid) return null

    const ref = await addDoc(projectsRef(), {
      name: payload.name.trim(),
      clientName: payload.clientName?.trim() ?? '',
      siteAddress: payload.siteAddress?.trim() ?? '',
      ownerId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPublic: false,
      publicSlug: '',
      coverPhotoUrl: '',
      coverPhotoId: '',
      photoCount: 0,
    })

    await updateDoc(projectRef(ref.id), { publicSlug: ref.id })
    return ref.id
  },

  async refreshProjectCover(projectId: string) {
    const project = state.projects.find((p) => p.id === projectId)
    let currentPhotos = sortPhotos(state.photosByProject[projectId] ?? [])
    if (currentPhotos.length === 0) {
      const snap = await getDocs(projectPhotosRef(projectId))
      currentPhotos = sortPhotos(snap.docs.map((d) => normalizePhoto(d.id, d.data())))
    }

    let cover: ProjectPhoto | undefined
    if (project?.coverPhotoId) {
      cover = currentPhotos.find((p) => p.id === project.coverPhotoId)
    }
    if (!cover) {
      cover = currentPhotos.find((p) => p.isPublic) ?? [...currentPhotos].reverse()[0]
    }

    await updateDoc(projectRef(projectId), {
      coverPhotoId: cover?.id ?? '',
      coverPhotoUrl: cover?.url ?? '',
      updatedAt: serverTimestamp(),
    })
  },

  async addPhotos(projectId: string, files: File[], options?: { memo?: string; tag?: ProjectPhotoTag }) {
    const uid = authState.user?.uid
    if (!uid || files.length === 0) return
    if (!this.canEditPhotos(projectId)) return

    const currentPhotos = sortPhotos(state.photosByProject[projectId] ?? [])
    const startOrder = currentPhotos.reduce((max, p) => Math.max(max, p.sortOrder ?? 0), 0) + 1
    for (const [index, file] of files.entries()) {
      const photoDoc = doc(projectPhotosRef(projectId))
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `projects/${projectId}/${photoDoc.id}.${ext}`
      const fileRef = storageRef(storage, storagePath)

      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)

      await setDoc(photoDoc, {
        url,
        storagePath,
        createdAt: serverTimestamp(),
        uploadedBy: uid,
        isPublic: false,
        tag: options?.tag ?? 'untagged',
        memo: options?.memo?.trim() ?? '',
        sortOrder: startOrder + index,
      })
    }

    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
      photoCount: increment(files.length),
    })
    await this.refreshProjectCover(projectId)
  },

  async updateProject(projectId: string, fields: Partial<Pick<BuildogProject, 'name' | 'clientName' | 'siteAddress' | 'isPublic'>>) {
    const uid = authState.user?.uid
    if (!uid) return
    if (!this.isOwner(projectId)) return

    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() }
    if (fields.name !== undefined) payload.name = fields.name.trim()
    if (fields.clientName !== undefined) payload.clientName = fields.clientName.trim()
    if (fields.siteAddress !== undefined) payload.siteAddress = fields.siteAddress.trim()
    if (fields.isPublic !== undefined) payload.isPublic = fields.isPublic

    await updateDoc(projectRef(projectId), payload)
  },

  async updatePhotoVisibility(projectId: string, photoId: string, isPublic: boolean) {
    if (!this.canEditPhotos(projectId)) return
    await updateDoc(doc(db, 'projects', projectId, 'photos', photoId), { isPublic })
    await updateDoc(projectRef(projectId), { updatedAt: serverTimestamp() })
    await this.refreshProjectCover(projectId)
  },

  async updatePhoto(projectId: string, photoId: string, fields: Partial<Pick<ProjectPhoto, 'tag' | 'memo' | 'isPublic' | 'sortOrder'>>) {
    if (!this.canEditPhotos(projectId)) return

    const payload: Record<string, unknown> = {}
    if (fields.tag !== undefined) payload.tag = fields.tag
    if (fields.memo !== undefined) payload.memo = fields.memo.trim()
    if (fields.isPublic !== undefined) payload.isPublic = fields.isPublic
    if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder

    await updateDoc(doc(db, 'projects', projectId, 'photos', photoId), payload)
    await updateDoc(projectRef(projectId), { updatedAt: serverTimestamp() })
    if (fields.isPublic !== undefined) {
      await this.refreshProjectCover(projectId)
    }
  },

  async updatePhotosBulk(
    projectId: string,
    photoIds: string[],
    fields: Partial<Pick<ProjectPhoto, 'tag' | 'isPublic'>>,
  ) {
    if (!this.canEditPhotos(projectId) || photoIds.length === 0) return

    const payload: Record<string, unknown> = {}
    if (fields.tag !== undefined) payload.tag = fields.tag
    if (fields.isPublic !== undefined) payload.isPublic = fields.isPublic
    if (Object.keys(payload).length === 0) return

    await Promise.all(
      photoIds.map((photoId) =>
        updateDoc(doc(db, 'projects', projectId, 'photos', photoId), payload),
      ),
    )
    await updateDoc(projectRef(projectId), { updatedAt: serverTimestamp() })
    if (fields.isPublic !== undefined) {
      await this.refreshProjectCover(projectId)
    }
  },

  async setProjectCover(projectId: string, photoId: string) {
    if (!this.canEditPhotos(projectId)) return
    const photo = (state.photosByProject[projectId] ?? []).find((p) => p.id === photoId)
    if (!photo) return

    await updateDoc(projectRef(projectId), {
      coverPhotoId: photo.id,
      coverPhotoUrl: photo.url,
      updatedAt: serverTimestamp(),
    })
  },

  async reorderProjects(orderedIds: string[]) {
    const uid = authState.user?.uid
    if (!uid) return
    const batch = writeBatch(db)
    orderedIds.forEach((id, index) => {
      batch.update(projectRef(id), { sortOrder: index + 1 })
    })
    await batch.commit()
  },

  async deletePhotosBulk(projectId: string, photoIds: string[]) {
    if (!this.canEditPhotos(projectId) || photoIds.length === 0) return

    const project = state.projects.find((p) => p.id === projectId)
    const photos = state.photosByProject[projectId] ?? []
    const batch = writeBatch(db)
    for (const photoId of photoIds) {
      const photo = photos.find((p) => p.id === photoId)
      if (!photo) continue
      batch.delete(doc(db, 'projects', projectId, 'photos', photoId))
      if (photo.storagePath) {
        deleteObject(storageRef(storage, photo.storagePath)).catch(() => {})
      }
    }
    batch.update(projectRef(projectId), {
      photoCount: increment(-photoIds.length),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    if (project?.coverPhotoId && photoIds.includes(project.coverPhotoId)) {
      await this.refreshProjectCover(projectId)
    }
  },

  async setCustomCover(projectId: string, url: string) {
    if (!this.canEditPhotos(projectId)) return
    await updateDoc(projectRef(projectId), {
      coverPhotoId: '',
      coverPhotoUrl: url,
      updatedAt: serverTimestamp(),
    })
  },

  async deletePhoto(projectId: string, photoId: string) {
    if (!this.canEditPhotos(projectId)) return

    const photo = (state.photosByProject[projectId] ?? []).find((p) => p.id === photoId)
    if (!photo) return

    if (photo.storagePath) {
      await deleteObject(storageRef(storage, photo.storagePath)).catch(() => {})
    }
    await deleteDoc(doc(db, 'projects', projectId, 'photos', photoId))
    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
      photoCount: increment(-1),
    })

    const project = state.projects.find((p) => p.id === projectId)
    if (project?.coverPhotoId === photoId) {
      await updateDoc(projectRef(projectId), { coverPhotoId: '' })
    }
    await this.refreshProjectCover(projectId)
  },

  async movePhoto(projectId: string, photoId: string, direction: 'up' | 'down') {
    if (!this.canEditPhotos(projectId)) return

    const ordered = sortPhotos(state.photosByProject[projectId] ?? [])
    const currentIndex = ordered.findIndex((p) => p.id === photoId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= ordered.length) return

    const next = [...ordered]
    const [moved] = next.splice(currentIndex, 1)
    next.splice(targetIndex, 0, moved)

    await Promise.all(
      next.map((photo, index) =>
        updateDoc(doc(db, 'projects', projectId, 'photos', photo.id), { sortOrder: index + 1 }),
      ),
    )
    await updateDoc(projectRef(projectId), { updatedAt: serverTimestamp() })
  },

  async reorderPhotos(projectId: string, orderedIds: string[]) {
    if (!this.canEditPhotos(projectId)) return

    await Promise.all(
      orderedIds.map((photoId, index) =>
        updateDoc(doc(db, 'projects', projectId, 'photos', photoId), { sortOrder: index + 1 }),
      ),
    )
    await updateDoc(projectRef(projectId), { updatedAt: serverTimestamp() })
  },

  async fetchPublicProject(projectIdOrSlug: string) {
    let projectSnap = await getDoc(projectRef(projectIdOrSlug))
    if (!projectSnap.exists()) {
      const slugSnap = await getDocs(query(projectsRef(), where('publicSlug', '==', projectIdOrSlug), limit(1)))
      if (slugSnap.empty) return null
      projectSnap = slugSnap.docs[0]
    }

    const project = normalizeProject(projectSnap.id, projectSnap.data() as Record<string, unknown>)
    if (!project.isPublic) return null

    const photoSnap = await getDocs(projectPhotosRef(project.id))
    const photos = sortPhotos(
      photoSnap.docs
        .map((d) => normalizePhoto(d.id, d.data()))
        .filter((p) => p.isPublic),
    )

    return { project, photos }
  },

  // ===== メンバー管理 =====

  async inviteMember(
    projectId: string,
    email: string,
    permissions: Pick<ProjectMember, 'canEdit' | 'canArchive' | 'canInvite'> = { canEdit: false, canArchive: false, canInvite: false },
  ): Promise<{ success: boolean; error?: string }> {
    const uid = authState.user?.uid
    if (!uid) return { success: false, error: '未ログインです' }
    if (!this.canInvite(projectId)) return { success: false, error: '招待権限がありません' }

    const trimmed = email.trim().toLowerCase()
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) return { success: false, error: '案件が見つかりません' }

    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('email', '==', trimmed)),
    )
    if (usersSnap.empty) {
      return { success: false, error: 'このメールアドレスのユーザーが見つかりません。先にBuildog登録が必要です。' }
    }

    const userDoc = usersSnap.docs[0]
    const inviteeUid = userDoc.id
    const data = userDoc.data()

    if (inviteeUid === project.ownerId) {
      return { success: false, error: 'オーナー自身は招待できません' }
    }

    const existing = state.membersByProject[projectId]?.find((m) => m.uid === inviteeUid)
    if (existing) return { success: false, error: 'すでにメンバーです' }

    await Promise.all([
      setDoc(doc(projectMembersRef(projectId), inviteeUid), {
        uid: inviteeUid,
        email: trimmed,
        displayName: String(data.displayName ?? email),
        canEdit: permissions.canEdit,
        canArchive: permissions.canArchive,
        canInvite: permissions.canInvite,
        joinedAt: serverTimestamp(),
      }),
      // 招待されたユーザーの sharedProjectIds に追加
      updateDoc(doc(db, 'users', inviteeUid), {
        sharedProjectIds: arrayUnion(projectId),
      }),
    ])

    return { success: true }
  },

  async removeMember(projectId: string, memberUid: string): Promise<void> {
    if (!this.isOwner(projectId)) return
    await Promise.all([
      deleteDoc(doc(projectMembersRef(projectId), memberUid)),
      // 削除されたユーザーの sharedProjectIds から除去
      updateDoc(doc(db, 'users', memberUid), {
        sharedProjectIds: arrayRemove(projectId),
      }),
    ])
  },

  async updateMemberPermissions(
    projectId: string,
    memberUid: string,
    patch: Partial<Pick<ProjectMember, 'canEdit' | 'canArchive' | 'canInvite'>>,
  ): Promise<void> {
    if (!this.isOwner(projectId)) return
    await updateDoc(doc(projectMembersRef(projectId), memberUid), patch)
  },
}
