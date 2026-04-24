import { reactive, watch } from 'vue'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { authState } from '../lib/auth'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
}

const state = reactive({
  profile: null as UserProfile | null,
  loaded: false,
})

watch(
  () => authState.user,
  async (user) => {
    if (!user) {
      state.profile = null
      state.loaded = false
      return
    }

    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        createdAtServer: serverTimestamp(),
      })
    }

    state.profile = {
      uid: user.uid,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
    }
    state.loaded = true
  },
  { immediate: true },
)

export const userProfileStore = {
  get profile() {
    return state.profile
  },

  get loaded() {
    return state.loaded
  },
}
