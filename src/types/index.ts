export interface BuildogProject {
  id: string
  name: string
  clientName: string
  siteAddress: string
  ownerId: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  publicSlug: string
  coverPhotoUrl: string
  coverPhotoId: string
  photoCount: number
}

export type ProjectPhotoTag = 'before' | 'during' | 'after' | 'material' | 'untagged'

export const PROJECT_PHOTO_TAG_LABELS: Record<ProjectPhotoTag, string> = {
  before: 'ビフォー',
  during: '施工中',
  after: 'アフター',
  material: '材料',
  untagged: 'タグ未設定',
}

export interface ProjectPhoto {
  id: string
  url: string
  storagePath: string
  createdAt: string
  uploadedBy: string
  isPublic: boolean
  tag: ProjectPhotoTag
  memo: string
  sortOrder: number | null
}

export interface CreateProjectPayload {
  name: string
  clientName?: string
  siteAddress?: string
}
