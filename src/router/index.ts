import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import ShelfView from '../views/ShelfView.vue'
import { authState } from '../lib/auth'
import { userProfileStore } from '../store/userProfile'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'shelf',
      component: ShelfView,
      meta: { requiresAuth: true },
    },
    {
      path: '/item/:id',
      name: 'item-detail',
      component: () => import('../views/ItemDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/add',
      name: 'add-item',
      component: () => import('../views/AddItemView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresViewer: true },
      children: [
        { path: '', redirect: '/admin/products' },
        {
          path: 'products',
          name: 'admin-products',
          component: () => import('../views/admin/ProductsView.vue'),
        },
        {
          path: 'products/:id',
          name: 'admin-product-detail',
          component: () => import('../views/admin/ProductDetailView.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('../views/admin/UsersView.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
  ],
})

function waitForAuth(): Promise<void> {
  if (authState.ready) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(() => authState.ready, (ready) => {
      if (ready) { stop(); resolve() }
    })
  })
}

function waitForProfile(): Promise<void> {
  if (userProfileStore.loaded) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(() => userProfileStore.loaded, (loaded) => {
      if (loaded) { stop(); resolve() }
    })
  })
}

router.beforeEach(async (to) => {
  await waitForAuth()

  if (to.meta.requiresAuth && !authState.user) return { name: 'login' }
  if (to.name === 'login' && authState.user) return { name: 'shelf' }

  if (to.meta.requiresViewer || to.meta.requiresAdmin) {
    await waitForProfile()
    if (to.meta.requiresAdmin && !userProfileStore.isAdmin) return { name: 'shelf' }
    if (to.meta.requiresViewer && !userProfileStore.canAccessAdmin) return { name: 'shelf' }
  }
})

export default router
