# ETAR - Emelőgép Törzskönyv és Adatnyilvántartó Rendszer

## 📋 Áttekintés
Az ETAR egy modern, felhőalapú nyilvántartó rendszer, amelyet emelőgépek és egyéb ipari eszközök kezelésére, időszakos vizsgálatára és dokumentálására terveztek. A rendszer lehetővé teszi a papírmentes munkavégzést, a digitális azonosítást (QR és NFC), valamint a jegyzőkönyvek automatikus generálását és tárolását.

## 🛠️ Technológiai Stack
A projekt a **Google Firebase** platformra épül, "Serverless" architektúrában.

*   **Frontend:**
    *   HTML5, Vanilla JavaScript (ES6+)
    *   Tailwind CSS (Stílusok)
    *   FontAwesome (Ikonok)
    *   SheetJS (Excel kezelés)
*   **Backend (Firebase):**
    *   **Authentication:** Felhasználókezelés és jogosultságok.
    *   **Firestore:** NoSQL adatbázis az eszközök, partnerek és vizsgálatok tárolására.
    *   **Storage:** Fájlok (pl. aláírt jegyzőkönyvek, képek) tárolása.
    *   **Hosting:** A webes felület kiszolgálása.
    *   **Functions:** Szerveroldali logika (pl. PDF generálás, email küldés - *ha implementálva van*).

## 📂 Projekt Struktúra

```
/
├── functions/          # Cloud Functions (Backend logika)
├── public/             # Publikus webes fájlok (Frontend)
│   ├── css/            # Stíluslapok
│   ├── js/             # JavaScript modulok
│   │   ├── auth.js     # Hitelesítés és jogosultságok
│   │   ├── partner.js  # Partner munkaterület logika
│   │   ├── drafts.js   # Piszkozatok kezelése
│   │   └── ...
│   ├── images/         # Képek és logók
│   └── *.html          # HTML oldalak
├── firestore.rules     # Adatbázis biztonsági szabályok
├── storage.rules       # Tárhely biztonsági szabályok
├── firebase.json       # Firebase konfiguráció
└── README.md           # Ez a fájl
```

## 🚀 Telepítés és Futtatás (Fejlesztés)

A rendszer helyi futtatásához szükség van a Node.js-re és a Firebase CLI-re.

1.  **Előfeltételek telepítése:**
    ```bash
    npm install -g firebase-tools
    ```

2.  **Függőségek telepítése:**
    (Ha vannak Cloud Functions függőségek)
    ```bash
    cd functions
    npm install
    cd ..
    ```

3.  **Helyi szerver indítása (Emulator):**
    Ez elindítja a Hosting, Firestore és Auth emulátorokat.
    ```bash
    firebase emulators:start
    ```
    A webes felület elérhető: `http://localhost:5000`

## 🔐 Jogosultsági Rendszer (Röviden)
A rendszer szerepkör alapú hozzáférést (RBAC) használ.
*   **Admin:** Teljes hozzáférés (Írás/Olvasás/Törlés/Felhasználók).
*   **Write:** Operatív hozzáférés (Írás/Olvasás/Piszkozatok).
*   **Read:** Csak olvasás (Listázás/Megtekintés).
*   **EJK:** Szakértői szerepkörök (hasonló az alaphoz, de szakértői funkciókkal).

*Részletes felhasználói leírásért lásd a `USER_MANUAL.md` fájlt.*

## 🔄 Fő Folyamatok
1.  **Eszközfelvétel:** Manuálisan vagy Excel importtal (`excel_import.html`).
2.  **Vizsgálat:** Eszköz keresése -> Adatok rögzítése -> Piszkozat mentése.
3.  **Véglegesítés:** Piszkozat ellenőrzése -> PDF generálás -> Archiválás.
4.  **Lekérdezés:** Szűrés, keresés, QR/NFC beolvasás.

## 📝 Fejlesztői Megjegyzések
*   A `public/js/firebase.js` tartalmazza az inicializálást.
*   A stílusok nagy része Tailwind osztályokkal van megoldva, de egyedi stílusok a `public/style.css`-ben találhatók.
