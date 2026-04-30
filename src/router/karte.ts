import type { RouteRecordRaw } from 'vue-router'

export const karteRoutes: RouteRecordRaw[] = [
  {
    path: '/karte',
    name: 'karte-home',
    component: () => import('../views/karte/KarteHomeView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/equipment',
    name: 'karte-equipment-list',
    component: () => import('../views/karte/KarteEquipmentListView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/equipment/new',
    name: 'karte-equipment-new',
    component: () => import('../views/karte/KarteEquipmentNewView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/equipment/:id',
    name: 'karte-equipment-detail',
    component: () => import('../views/karte/KarteEquipmentDetailView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/trouble',
    name: 'karte-trouble',
    component: () => import('../views/karte/KarteTroubleTopView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/trouble/category',
    name: 'karte-trouble-category',
    component: () => import('../views/karte/KarteTroubleCategoryView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/trouble/form',
    name: 'karte-trouble-form',
    component: () => import('../views/karte/KarteTroubleFormView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/trouble/result',
    name: 'karte-trouble-result',
    component: () => import('../views/karte/KarteTroubleResultView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/profile',
    name: 'karte-profile',
    component: () => import('../views/karte/KarteProfileView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/settings',
    name: 'karte-settings',
    component: () => import('../views/karte/KarteSettingsView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
  {
    path: '/karte/board/:boardId',
    name: 'karte-board',
    component: () => import('../views/karte/KarteBoardView.vue'),
    meta: { requiresAuth: true, layout: 'karte' },
  },
]
