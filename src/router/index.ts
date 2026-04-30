import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { authState } from '../lib/auth'
import ProjectListView from '../views/ProjectListView.vue'
import { karteRoutes } from './karte'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...karteRoutes,
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'project-list',
      component: ProjectListView,
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/new',
      name: 'project-create',
      component: () => import('../views/ProjectCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/p/:projectId',
      name: 'public-project',
      component: () => import('../views/PublicProjectView.vue'),
    },
  ],
})

function waitForAuth(): Promise<void> {
  if (authState.ready) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(() => authState.ready, (ready) => {
      if (ready) {
        stop()
        resolve()
      }
    })
  })
}

router.beforeEach(async (to) => {
  await waitForAuth()

  if (to.meta.requiresAuth && !authState.user) return { name: 'login' }
  if (to.name === 'login' && authState.user) return { name: 'project-list' }
})

export default router
