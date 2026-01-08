# Biztonságos Fejlesztői Környezet Létrehozási Terv (Sandbox)

A cél egy olyan "játszótér" (Sandbox) létrehozása, ahol szabadon kísérletezhetünk az ETAR 2.0 fejlesztésével anélkül, hogy az éles rendszert vagy az adatbázist veszélyeztetnénk.

A javasolt stratégia: **Külön Firebase Projekt + Külön Munkamappa.**

## 1. Áttekintés

Jelenleg egyetlen "Prod" (Éles) környezet van.
Létrehozunk egy "Dev" (Fejlesztői) környezetet, amely teljesen elszigetelt.

| Környezet | Mappa a gépen | Firebase Projekt ID | Adatbázis | URL |
| :--- | :--- | :--- | :--- | :--- |
| **ÉLES (Prod)** | `EtarRendszer_Firebase` | `etarrendszer` | Éles adatok | etarrendszer.web.app |
| **FEJLESZTŐI (Dev)** | `EtarRendszer_Dev` (ÚJ) | `etarrendszer-dev` (ÚJ) | Teszt adatok | etarrendszer-dev.web.app |

---

## 2. Feladatok Megosztása

### Amit ÖNNEK (Felhasználó) kell tennie:

1.  **Új Firebase Projekt Létrehozása:**
    *   Menjen a [Firebase Console](https://console.firebase.google.com/) oldalra.
    *   Hozzon létre egy új projektet (pl. `etarrendszer-dev` vagy `etarrendszer-sandbox` néven).
    *   A projektben engedélyezze ugyanazokat a szolgáltatásokat, mint az élesben: **Authentication**, **Firestore**, **Storage**, **Hosting**.
    *   Adjon hozzá egy "Web App"-ot a projekthez, és **másolja ki a konfigurációs adatokat** (apiKey, projectId, stb.).

2.  **Mappa Másolása:**
    *   A Windows Fájlkezelőben készítsen másolatot a jelenlegi `EtarRendszer_Firebase` mappáról `EtarRendszer_Dev` néven.
    *   **FONTOS:** Nyissa meg ezt az új mappát VS Code-ban **Új Workspace-ként**. (Így biztosan nem keveredik a két környezet).

3.  **Adatok Átvétele (Opcionális):**
    *   Ha éles adatokkal szeretne tesztelni, exportálhatja az éles adatbázist és importálhatja az új projektbe (Google Cloud Console-on keresztül), vagy egyszerűen vigyen fel pár teszt adatot kézzel az új rendszerbe.

### Amit ÉN (Antigravity) meg tudok csinálni (miután megnyitotta az új mappát):

1.  **Kód Átírása az Új Környezethez:**
    *   Módosítom a `public/js/firebase.js` fájlt, hogy az új (`etarrendszer-dev`) kulcsait használja.
    *   Configure-álom a projektet, hogy a megfelelő adatbázishoz csatlakozzon.

2.  **Firebase CLI Beállítása:**
    *   Segítek beállítani a `.firebaserc` fájlt, hogy a `firebase deploy` parancs a fejlesztői környezetbe töltsön fel, ne az élesbe.

---

## 3. Részletes Lépések (Teendőlista)

1.  [User] Firebase projekt létrehozása a weben.
2.  [User] Mappa másolása és megnyitása új ablakban.
3.  [Agent] A *másolatban* átírom a konfigurációt.
4.  [Agent/User] Ellenőrizzük, hogy az új rendszer az új, üres adatbázishoz csatlakozik-e.
