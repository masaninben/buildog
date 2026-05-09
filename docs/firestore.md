# Firestoreデータ設計

## コレクション構造

```
users/{uid}
  ├── homes/{homeId}
  │     ├── equipments/{equipmentId}
  │     ├── timeline_events/{eventId}
  │     └── documents/{documentId}
  └── troubles/{troubleId}
```

---

## 型定義（src/types/index.ts）

```typescript
import { Timestamp } from 'firebase/firestore';

// ===== Suite共通：設備カテゴリコード =====
// Buildog・Karteで使用するコード値
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
  | 'other';             // その他

// カテゴリの日本語表示名マップ
export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  exterior_wall: '外壁',
  roof: '屋根',
  solar_panel: '太陽光発電',
  storage_battery: '蓄電池',
  gas_water_heater: 'ガス給湯器',
  eco_cute: 'エコキュート',
  air_conditioner: 'エアコン',
  kitchen: 'キッチン',
  bathroom: '浴室',
  toilet: 'トイレ',
  washroom: '洗面台',
  floor: '床',
  window: '窓',
  entrance_door: '玄関ドア',
  ventilation: '換気設備',
  distribution_board: '分電盤',
  other: 'その他',
};

// カテゴリ別標準寿命年数（コンテキスト提案の判定に使用）
export const EQUIPMENT_LIFESPAN_YEARS: Record<EquipmentCategory, number> = {
  gas_water_heater: 10,
  eco_cute: 10,
  exterior_wall: 15,
  roof: 20,
  solar_panel: 20,
  storage_battery: 15,
  air_conditioner: 10,
  kitchen: 20,
  bathroom: 20,
  toilet: 20,
  washroom: 15,
  floor: 20,
  window: 20,
  entrance_door: 20,
  ventilation: 15,
  distribution_board: 20,
  other: 10,
};

// ===== 設備ステータス =====
export type EquipmentStatus =
  | 'good'          // 良好
  | 'check_needed'  // 要確認
  | 'warranty_soon' // 保証期限近い
  | 'replace_soon'  // 交換時期かも
  | 'unknown';      // 未入力

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  good: '良好',
  check_needed: '要確認',
  warranty_soon: '保証期限近い',
  replace_soon: '交換時期かも',
  unknown: '未入力',
};

// ステータス色（TailwindCSSクラス）
export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  good: 'text-green-700 bg-green-50',
  check_needed: 'text-orange-600 bg-orange-50',
  warranty_soon: 'text-yellow-700 bg-yellow-50',
  replace_soon: 'text-red-600 bg-red-50',
  unknown: 'text-gray-500 bg-gray-100',
};

// ===== タイムラインイベント種別 =====
export type TimelineEventType =
  | 'move_in'        // 入居開始
  | 'construction'   // 施工・工事
  | 'repair'         // 修理
  | 'inspection'     // 点検
  | 'replacement'    // 交換
  | 'purchase'       // 購入・設置
  | 'memo'           // メモ
  | 'photo'          // 写真
  | 'other';         // その他

// ===== 困り事緊急度 =====
export type TroubleUrgency = 'urgent' | 'soon' | 'research';

export const TROUBLE_URGENCY_LABELS: Record<TroubleUrgency, string> = {
  urgent: '急ぎ',
  soon: '近いうちに相談したい',
  research: '情報収集したい',
};

// ===== Firestoreドキュメント型 =====

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export interface HomeDoc {
  homeId: string;
  ownerUid: string;
  name: string;                  // 例: ○○邸
  areaLabel: string;             // 例: 福岡県福岡市（詳細住所不要）
  builtYear?: number;            // 建築年（西暦）
  movedInDate?: Timestamp;       // 入居日
  buildingType?: string;         // 戸建 / マンション / etc
  structure?: string;            // 木造 / RC / etc
  floorArea?: number;            // 延床面積（m²）
  buildogProjectId?: string;     // Buildog案件ID（連携時に設定）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EquipmentDoc {
  equipmentId: string;
  category: EquipmentCategory;
  name: string;
  maker?: string;
  modelNumber?: string;
  installedDate?: Timestamp;
  warrantyExpiry?: Timestamp;
  status: EquipmentStatus;
  photoUrls: string[];
  memo?: string;
  buildogSourceId?: string;      // Buildog由来データID（連携時に設定）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimelineEventDoc {
  eventId: string;
  eventType: TimelineEventType;
  title: string;
  eventDate: Timestamp;
  relatedEquipmentIds: string[];
  photoUrls: string[];
  memo?: string;
  contractor?: string;           // 施工会社名
  cost?: number;                 // 費用（円）
  source: 'manual' | 'buildog';
  buildogProjectId?: string;
  createdAt: Timestamp;
}

export interface TroubleDoc {
  troubleId: string;
  ownerUid: string;
  homeId: string;
  category: EquipmentCategory;
  description: string;
  urgency: TroubleUrgency;
  photoUrls: string[];
  areaLabel: string;
  status: 'open' | 'matched' | 'closed';
  createdAt: Timestamp;
}
```

---

## Firestoreセキュリティルール（基本）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ユーザー自身のデータのみアクセス可
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;

      match /homes/{homeId} {
        allow read, write: if request.auth.uid == uid;

        match /equipments/{equipmentId} {
          allow read, write: if request.auth.uid == uid;
        }
        match /timeline_events/{eventId} {
          allow read, write: if request.auth.uid == uid;
        }
        match /documents/{documentId} {
          allow read, write: if request.auth.uid == uid;
        }
      }

      match /troubles/{troubleId} {
        allow read, write: if request.auth.uid == uid;
      }
    }
  }
}
```

---

## 和暦変換ユーティリティ（src/utils/era.ts）

```typescript
export function toJapaneseEra(year: number): string {
  if (year >= 2019) return `令和${year - 2018}年`;
  if (year >= 1989) return `平成${year - 1988}年`;
  if (year >= 1926) return `昭和${year - 1925}年`;
  if (year >= 1912) return `大正${year - 1911}年`;
  return `明治${year - 1867}年`;
}

// 表示用：「2026年（令和8年）」
export function formatYearWithEra(year: number): string {
  return `${year}年（${toJapaneseEra(year)}）`;
}
```

---

## 設備ステータス自動判定（src/utils/equipment.ts）

```typescript
import { EquipmentCategory, EquipmentStatus, EQUIPMENT_LIFESPAN_YEARS } from '@/types';
import { Timestamp } from 'firebase/firestore';

export function calcEquipmentStatus(
  category: EquipmentCategory,
  installedDate?: Timestamp,
  warrantyExpiry?: Timestamp
): EquipmentStatus {
  if (!installedDate) return 'unknown';

  const now = new Date();
  const installed = installedDate.toDate();
  const yearsElapsed = (now.getTime() - installed.getTime()) / (1000 * 60 * 60 * 24 * 365);
  const lifespan = EQUIPMENT_LIFESPAN_YEARS[category];

  // 保証期限チェック
  if (warrantyExpiry) {
    const expiry = warrantyExpiry.toDate();
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry < 90 && daysUntilExpiry > 0) return 'warranty_soon';
  }

  // 寿命チェック
  if (yearsElapsed >= lifespan) return 'replace_soon';
  if (yearsElapsed >= lifespan * 0.8) return 'check_needed';

  return 'good';
}
```
