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

  // --- 連絡掲示板フィールド ---
  boardId?:               string              // 掲示板ID
  boardLastMessageAt?:    string              // 最終メッセージ日時（バッジ判定用）
  boardLastMessageText?:  string              // 最終メッセージ冒頭（プレビュー用）
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

// ===== Buildog Suite 共通：設備カテゴリ表示名・寿命 =====

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  exterior_wall:      '外壁',
  roof:               '屋根',
  solar_panel:        '太陽光発電',
  storage_battery:    '蓄電池',
  gas_water_heater:   'ガス給湯器',
  eco_cute:           'エコキュート',
  air_conditioner:    'エアコン',
  kitchen:            'キッチン',
  bathroom:           '浴室',
  toilet:             'トイレ',
  washroom:           '洗面台',
  floor:              '床',
  window:             '窓',
  entrance_door:      '玄関ドア',
  ventilation:        '換気設備',
  distribution_board: '分電盤',
  other:              'その他',
}

export const EQUIPMENT_LIFESPAN_YEARS: Record<EquipmentCategory, number> = {
  gas_water_heater:   10,
  eco_cute:           10,
  exterior_wall:      15,
  roof:               20,
  solar_panel:        20,
  storage_battery:    15,
  air_conditioner:    10,
  kitchen:            20,
  bathroom:           20,
  toilet:             20,
  washroom:           15,
  floor:              20,
  window:             20,
  entrance_door:      20,
  ventilation:        15,
  distribution_board: 20,
  other:              10,
}

// ===== Karte：設備ステータス =====

export type EquipmentStatus =
  | 'good'           // 良好
  | 'check_needed'   // 要確認
  | 'warranty_soon'  // 保証期限近い
  | 'replace_soon'   // 交換時期かも
  | 'unknown'        // 未入力

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  good:          '良好',
  check_needed:  '要確認',
  warranty_soon: '保証期限近い',
  replace_soon:  '交換時期かも',
  unknown:       '未入力',
}

// ===== Karte：タイムラインイベント種別 =====

export type TimelineEventType =
  | 'move_in'        // 入居開始
  | 'construction'   // 施工・工事
  | 'repair'         // 修理
  | 'inspection'     // 点検
  | 'replacement'    // 交換
  | 'purchase'       // 購入・設置
  | 'color_decision' // 色決め（Palette連携）
  | 'memo'           // メモ
  | 'photo'          // 写真
  | 'other'          // その他

// ===== Karte：困り事緊急度 =====

export type TroubleUrgency = 'urgent' | 'soon' | 'research'

export const TROUBLE_URGENCY_LABELS: Record<TroubleUrgency, string> = {
  urgent:   '急ぎ',
  soon:     '近いうちに相談したい',
  research: '情報収集したい',
}

// ===== Karte：Firestoreドキュメント型 =====
// 日付はすべて string（ISO）。Firestoreからの取得時に変換する。

export interface KarteHome {
  homeId:           string
  ownerUid:         string
  name:             string           // 例: ○○邸
  areaLabel:        string           // 例: 福岡県福岡市
  builtYear?:       number           // 建築年（西暦）
  movedInDate?:     string           // 入居日
  buildingType?:    string           // 戸建 / マンション / etc
  structure?:       string           // 木造 / RC / etc
  floorArea?:       number           // 延床面積（m²）
  buildogProjectId?: string          // Buildog案件ID（連携時に設定）
  boardId?:         string           // 掲示板ID
  createdAt:        string
  updatedAt:        string
}

export interface KarteEquipment {
  equipmentId:      string
  category:         EquipmentCategory
  name:             string
  maker?:           string
  modelNumber?:     string
  installedDate?:   string           // 設置日
  warrantyExpiry?:  string           // 保証期限
  status:           EquipmentStatus
  photoUrls:        string[]
  memo?:            string
  buildogSourceId?: string           // Buildog由来データID
  createdAt:        string
  updatedAt:        string
}

export interface KarteTimelineEvent {
  eventId:              string
  eventType:            TimelineEventType
  title:                string
  eventDate:            string
  relatedEquipmentIds:  string[]
  photoUrls:            string[]
  memo?:                string
  contractor?:          string       // 施工会社名
  cost?:                number       // 費用（円）
  source:               'manual' | 'buildog' | 'palette'
  buildogProjectId?:    string
  createdAt:            string
}

export interface KarteTrouble {
  troubleId:   string
  ownerUid:    string
  homeId:      string
  category:    EquipmentCategory
  description: string
  urgency:     TroubleUrgency
  photoUrls:   string[]
  areaLabel:   string
  status:      'open' | 'matched' | 'closed'
  createdAt:   string
}

// ===== 連絡掲示板 =====

export type BoardMemberStatus = 'active' | 'inactive'

// manager    : 案件管理者（メンバー参加制御権限あり）
// contractor : Buildog側スタッフ
// client     : 施主（Karteユーザー）
export type BoardMemberRole = 'manager' | 'contractor' | 'client'

export interface BoardDoc {
  boardId:      string
  projectId:    string          // Buildog案件ID
  projectName:  string          // 案件名（表示用・非正規化）
  karteHomeId?: string          // Karte住宅ID
  karteUserId?: string          // 施主のKarteユーザーUID
  createdAt:    string
  updatedAt:    string
}

export interface BoardMemberDoc {
  uid:              string
  role:             BoardMemberRole
  status:           BoardMemberStatus
  displayName:      string       // 表示名（非正規化）
  addedBy:          string       // 招待したuid
  addedAt:          string
  statusChangedAt:  string
}

export interface BoardMessageDoc {
  messageId:   string
  boardId:     string
  senderUid:   string
  senderName:  string           // 非正規化（表示用）
  senderRole:  BoardMemberRole
  text:        string
  photoUrls:   string[]
  readBy:      string[]         // 既読したuidリスト
  createdAt:   string
}
