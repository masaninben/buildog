// ===== Buildog Suite 共通：設備カテゴリコード =====
// Buildog・Buildog Palette・Buildog Karteで統一して使用
export type EquipmentCategory =
  | 'exterior_wall'      // 外壁
  | 'roof'               // 屋根
  | 'solar_panel'        // 太陽光発電
  | 'storage_battery'    // 蓄電池
  | 'gas_water_heater'   // ガス給湯器
  | 'eco_cute'           // エコキュート
  | 'air_conditioner'    // エアコン
  | 'kitchen'            // キッチン
  | 'bathroom'           // 浴室
  | 'toilet'             // トイレ
  | 'washroom'           // 洗面台
  | 'floor'              // 床
  | 'window'             // 窓
  | 'entrance_door'      // 玄関ドア
  | 'ventilation'        // 換気設備
  | 'distribution_board' // 分電盤
  | 'other'              // その他

// Karte連携状態
export type KarteStatus = 'none' | 'invited' | 'linked'

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

  // --- Karte連携フィールド ---
  karteInviteEmail?:  string        // 施主招待送信先メール
  karteInvitedAt?:    string        // 招待送信日時（ISO string）
  karteUserId?:       string        // 紐付いたKarteユーザーUID
  karteLinkedAt?:     string        // 連携完了日時（ISO string）
  karteStatus?:       KarteStatus   // 連携状態

  // --- Buildog Palette連携フィールド ---
  // 注: 次回セッションで実装予定。型定義のみ先行追加
  paletteProjectId?:  string        // Palette案件ID
  palettePatternUrl?: string        // 決定パターン画像URL
  paletteColorName?:  string        // カラー名
  paletteColorHex?:   string        // HEXコード（例: #FFFFFF）

  // --- 工程カレンダーフィールド ---
  // 注: 工程カレンダー実装時に使用予定。型定義のみ先行追加
  constructionStartDate?:  string              // 施工開始日（ISO string）
  constructionEndDate?:    string              // 施工完了日（ISO string）
  equipmentCategories?:    EquipmentCategory[] // 施工設備カテゴリ
  constructionMemo?:       string              // 施工内容メモ
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

// ===== User Plan =====

export type UserPlan = 'trial' | 'unlimited'

// ===== Project Members =====

export interface ProjectMember {
  uid: string
  email: string
  displayName: string
  canEdit: boolean
  canArchive: boolean
  canInvite: boolean
  joinedAt: string
}
