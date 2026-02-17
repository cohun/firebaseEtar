import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhYECnbn34-Bl7k8006Hi-NYWrlKvGGvg",
  authDomain: "etarrendszer.firebaseapp.com",
  projectId: "etarrendszer",
  storageBucket: "etarrendszer.firebasestorage.app",
  messagingSenderId: "68874947359",
  appId: "1:68874947359:web:12a1393353c117a0fc7e2a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
