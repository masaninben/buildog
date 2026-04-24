import { reactive, watch } from 'vue'
import {
  addDoc,
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
  type Unsubscribe,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { db } from '../lib/firebase'
import { storage } from '../lib/firebase'
import { authState } from '../lib/auth'
import type { BuildogProject, CreateProjectPayload, ProjectPhoto, ProjectPhotoTag } from '../types'

const state = reactive({
  projects: [] as BuildogProject[],
  loaded: false,
  photosByProject: {} as Record<string, ProjectPhoto[]>,
})

let projectsUnsubscribe: Unsubscribe | null = null
const photoUnsubscribes = new Map<string, Unsubscribe>()

function projectsRef() {
  return collection(db, 'projects')
}

function projectRef(projectId: string) {
  return doc(db, 'projects', projectId)
}

function projectPhotosRef(projectId: string) {
  return collection(db, 'projects', projectId, 'photos')
}

function sortProjects(projects: BuildogProject[]) {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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
    photoCount: Number(data.photoCount ?? 0),
  }
}

function normalizePhoto(id: string, data: Record<string, unknown>): ProjectPhoto {
  return {
    id,
    url: String(data.url ?? ''),
    storagePath: String(data.storagePath ?? ''),
    createdAt: toIsoString(data.createdAt),
    uploadedBy: String(data.uploadedBy ?? ''),
    isPublic: Boolean(data.isPublic),
    tag: (data.tag as ProjectPhotoTag) ?? 'other',
    memo: String(data.memo ?? ''),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : null,
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

watch(
  () => authState.user,
  (user) => {
    if (projectsUnsubscribe) {
      projectsUnsubscribe()
      projectsUnsubscribe = null
    }
    photoUnsubscribes.forEach((unsubscribe) => unsubscribe())
    photoUnsubscribes.clear()
    state.projects = []
    state.loaded = false
    state.photosByProject = {}

    if (!user) return

    projectsUnsubscribe = onSnapshot(query(projectsRef(), where('ownerId', '==', user.uid)), (snapshot) => {
      state.projects = sortProjects(
        snapshot.docs.map((entry) => normalizeProject(entry.id, entry.data()))
      )
      state.loaded = true
    })
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
    return state.projects.find((project) => project.id === id)
  },

  getPhotos(projectId: string) {
    return state.photosByProject[projectId] ?? []
  },

  subscribePhotos(projectId: string) {
    const uid = authState.user?.uid
    if (!uid || photoUnsubscribes.has(projectId)) return

    const unsubscribe = onSnapshot(
      query(projectPhotosRef(projectId), orderBy('createdAt', 'asc')),
      (snapshot) => {
        state.photosByProject[projectId] = sortPhotos(
          snapshot.docs.map((entry) => normalizePhoto(entry.id, entry.data()))
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
      photoCount: 0,
    })

    await updateDoc(projectRef(ref.id), {
      publicSlug: ref.id,
    })
    return ref.id
  },

  async addPhotos(projectId: string, files: File[], options?: { memo?: string; tag?: ProjectPhotoTag }) {
    const uid = authState.user?.uid
    if (!uid || files.length === 0) return

    const currentPhotos = sortPhotos(state.photosByProject[projectId] ?? [])
    const startOrder = currentPhotos.reduce((max, photo) => Math.max(max, photo.sortOrder ?? 0), 0) + 1
    let coverPhotoUrl = ''

    for (const [index, file] of files.entries()) {
      const photoDoc = doc(projectPhotosRef(projectId))
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `projects/${projectId}/${photoDoc.id}.${ext}`
      const fileRef = storageRef(storage, storagePath)

      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      coverPhotoUrl = url

      await setDoc(photoDoc, {
        url,
        storagePath,
        createdAt: serverTimestamp(),
        uploadedBy: uid,
        isPublic: false,
        tag: options?.tag ?? 'other',
        memo: options?.memo?.trim() ?? '',
        sortOrder: startOrder + index,
      })
    }

    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
      coverPhotoUrl,
      photoCount: increment(files.length),
    })
  },

  async updateProject(projectId: string, fields: Partial<Pick<BuildogProject, 'name' | 'clientName' | 'siteAddress' | 'isPublic'>>) {
    const uid = authState.user?.uid
    if (!uid) return
    const project = state.projects.find((entry) => entry.id === projectId)
    if (!project || project.ownerId !== uid) return

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (fields.name !== undefined) payload.name = fields.name.trim()
    if (fields.clientName !== undefined) payload.clientName = fields.clientName.trim()
    if (fields.siteAddress !== undefined) payload.siteAddress = fields.siteAddress.trim()
    if (fields.isPublic !== undefined) payload.isPublic = fields.isPublic

    await updateDoc(projectRef(projectId), payload)
  },

  async updatePhotoVisibility(projectId: string, photoId: string, isPublic: boolean) {
    const uid = authState.user?.uid
    if (!uid) return
    const project = state.projects.find((entry) => entry.id === projectId)
    if (!project || project.ownerId !== uid) return

    await updateDoc(doc(db, 'projects', projectId, 'photos', photoId), {
      isPublic,
    })
    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
    })
  },

  async updatePhoto(projectId: string, photoId: string, fields: Partial<Pick<ProjectPhoto, 'tag' | 'memo' | 'isPublic' | 'sortOrder'>>) {
    const uid = authState.user?.uid
    if (!uid) return
    const project = state.projects.find((entry) => entry.id === projectId)
    if (!project || project.ownerId !== uid) return

    const payload: Record<string, unknown> = {}
    if (fields.tag !== undefined) payload.tag = fields.tag
    if (fields.memo !== undefined) payload.memo = fields.memo.trim()
    if (fields.isPublic !== undefined) payload.isPublic = fields.isPublic
    if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder

    await updateDoc(doc(db, 'projects', projectId, 'photos', photoId), payload)
    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
    })
  },

  async deletePhoto(projectId: string, photoId: string) {
    const uid = authState.user?.uid
    if (!uid) return
    const project = state.projects.find((entry) => entry.id === projectId)
    if (!project || project.ownerId !== uid) return

    const photo = (state.photosByProject[projectId] ?? []).find((entry) => entry.id === photoId)
    if (!photo) return

    if (photo.storagePath) {
      await deleteObject(storageRef(storage, photo.storagePath)).catch(() => {})
    }
    await deleteDoc(doc(db, 'projects', projectId, 'photos', photoId))

    const nextPhotos = sortPhotos((state.photosByProject[projectId] ?? []).filter((entry) => entry.id !== photoId))
    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
      coverPhotoUrl: nextPhotos[0]?.url ?? '',
      photoCount: increment(-1),
    })
  },

  async movePhoto(projectId: string, photoId: string, direction: 'up' | 'down') {
    const uid = authState.user?.uid
    if (!uid) return
    const project = state.projects.find((entry) => entry.id === projectId)
    if (!project || project.ownerId !== uid) return

    const ordered = sortPhotos(state.photosByProject[projectId] ?? [])
    const currentIndex = ordered.findIndex((entry) => entry.id === photoId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= ordered.length) return

    const next = [...ordered]
    const [moved] = next.splice(currentIndex, 1)
    next.splice(targetIndex, 0, moved)

    await Promise.all(
      next.map((photo, index) =>
        updateDoc(doc(db, 'projects', projectId, 'photos', photo.id), {
          sortOrder: index + 1,
        })
      )
    )

    await updateDoc(projectRef(projectId), {
      updatedAt: serverTimestamp(),
    })
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
        .map((entry) => normalizePhoto(entry.id, entry.data()))
        .filter((photo) => photo.isPublic),
    )

    return { project, photos }
  },
}
