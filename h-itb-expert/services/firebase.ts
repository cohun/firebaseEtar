import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCWmKP4phZqMIwYHLmieRNk3zprUj1NJyM",
  authDomain: "etarrendszer.firebaseapp.com",
  projectId: "etarrendszer",
  storageBucket: "etarrendszer.firebasestorage.app",
  messagingSenderId: "68874947359",
  appId: "1:68874947359:web:12a1393353c117a0fc7e2a"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
