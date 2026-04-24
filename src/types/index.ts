// ---- カテゴリ ----

export type ItemCategory =
  | 'book'
  | 'music'
  | 'video'
  | 'game'
  | 'electronics'
  | 'camera'
  | 'shoes'
  | 'clothing'
  | 'bag'
  | 'watch'
  | 'instrument'
  | 'hobby'
  | 'sports'
  | 'furniture'
  | 'vehicle'
  | 'other'

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  book:        '本',
  music:       'CD・DVD',
  video:       '映像',
  game:        'ゲーム',
  electronics: '家電・ガジェット',
  camera:      'カメラ',
  shoes:       '靴',
  clothing:    '衣類',
  bag:         'バッグ・財布',
  watch:       '時計・アクセサリー',
  instrument:  '楽器',
  hobby:       'おもちゃ・ホビー・トレカ',
  sports:      'スポーツ・アウトドア',
  furniture:   '家具・インテリア',
  vehicle:     '自動車・バイク',
  other:       'その他',
}

export const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  book:        '📚',
  music:       '🎵',
  video:       '🎬',
  game:        '🎮',
  electronics: '💡',
  camera:      '📷',
  shoes:       '👟',
  clothing:    '👗',
  bag:         '👜',
  watch:       '⌚',
  instrument:  '🎸',
  hobby:       '🧸',
  sports:      '⚽',
  furniture:   '🛋',
  vehicle:     '🚗',
  other:       '📦',
}

// ---- 棚アイテム ----

export interface ShelfItem {
  id: string
  productId?: string      // products/ コレクションへの参照
  name: string            // 商品名
  creator: string         // 著者 / アーティスト / メーカー
  imageUrl: string        // 商品画像 URL
  category: ItemCategory  // カテゴリ
  status: 'owned' | 'archived'
  addedAt: string         // 棚に追加した日 YYYY-MM-DD
  acquiredAt?: string     // 取得日（addedAt より遡れる）YYYY-MM-DD
  archivedAt?: string     // 手放した日 YYYY-MM-DD
  disposalMethod?: 'resale' | 'gift' | 'donation' | 'recycle' | 'disposal'
  notes?: string          // メモ
  customImageUrl?: string // ユーザーが撮影・アップロードした画像（優先表示）
  customTitle?: string    // ユーザー独自タイトル（product名を上書き）
  acquirePrice?: number   // 取得金額（円）
  sellPrice?: number      // 売却・譲渡時の金額（円）
  showOnMap?: boolean     // 位置情報をマップに反映するか（undefined = true）
  showOnPublic?: boolean  // 公開棚に表示するか（undefined = true）
}
