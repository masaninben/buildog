import { reactive } from 'vue'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { app } from './firebase'

export const auth = getAuth(app)

export const authState = reactive({
  user: null as User | null,
  ready: false,
})

onAuthStateChanged(auth, (user) => {
  authState.user = user
  authState.ready = true
})

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  await signInWithPopup(auth, provider)
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  await firebaseSignOut(auth)
}
