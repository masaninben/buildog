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
  sortOrder: number | null
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

// ===== Organization =====

export type OrgPlan = 'trial' | 'unlimited'
export type OrgRole = 'owner' | 'member' | 'viewer'

export interface Organization {
  id: string
  name: string
  ownerId: string
  plan: OrgPlan
  trialEndsAt: string  // ISO date string
  createdAt: string
}

export interface OrgMember {
  uid: string
  role: OrgRole
  displayName: string
  email: string
  joinedAt: string
  canCreateProject: boolean  // オーナーが明示付与しない限り false
}
