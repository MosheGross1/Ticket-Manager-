import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCjRd0Nfx_Kby3eVjTGHhFogZbhk9R3wck",
  authDomain: "ticket-manager-63195.firebaseapp.com",
  projectId: "ticket-manager-63195",
  storageBucket: "ticket-manager-63195.firebasestorage.app",
  messagingSenderId: "956800542178",
  appId: "1:956800542178:web:603c387ec56adf26fe45bb",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
