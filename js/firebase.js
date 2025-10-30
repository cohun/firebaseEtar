// 1. LÉPÉS: Hozz létre egy projektet a https://console.firebase.google.com/ oldalon.
// 2. LÉPÉS: A projekt beállításainál (Project Settings) adj hozzá egy Web App-ot.
// 3. LÉPÉS: Másold ide a kapott firebaseConfig objektumot.


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWmKP4phZqMIwYHLmieRNk3zprUj1NJyM",
  authDomain: "etarrendszer.firebaseapp.com",
  projectId: "etarrendszer",
  storageBucket: "etarrendszer.firebasestorage.app",
  messagingSenderId: "68874947359",
  appId: "1:68874947359:web:12a1393353c117a0fc7e2a"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Szolgáltatások, amiket a többi script is használni fog
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
