# 🚀 ETAR Felhasználói Kézikönyv

**Az Emelőgép Törzskönyv és Adatnyilvántartó Rendszer (ETAR)** egy kifejezetten **emelőgépek és teherfelvevő eszközök** (daruk, targoncák, függesztékek, stb.) kezelésére kifejlesztett nyilvántartó rendszer.

> 🎁 **INGYENES HASZNÁLAT:** Az ETAR platformot a **H-ITB Kft.** ingyenesen bocsátja partnerei rendelkezésére, amennyiben az eszközeik időszakos vizsgálatát a H-ITB végzi.

---

## 👥 Válasszon Felhasználói Típust

A rendszer funkciói a felhasználói szerepkörétől függően változnak. Kérjük, válassza ki az Önre vonatkozó szakaszt:

1.  [**ENY - Emelőgép Nyilvántartó (Üzemeltető)**](#-1-eny-felhasználók-üzemeltetők): Cégek, akik saját eszközeiket kezelik.
2.  [**EJK - Emelőgép Javító/Karbantartó (H-ITB)**](#-2-ejk-felhasználók-h-itb-karbantartás): A H-ITB munkatársai, akik a vizsgálatokat és karbantartást végzik.
3.  [**EKV - Emelőgép Külsős Vizsgáló**](#-3-ekv-felhasználók-független-szakértők): Független szakértők, akik megbízás alapján dolgoznak.

---

## 🏭 1. ENY Felhasználók (Üzemeltetők)

Az **ENY (Emelőgép Nyilvántartó)** felhasználók azok a cégvezetők, EHS szakemberek vagy adminisztrátorok, akik a saját cégük emelőgépeinek nyilvántartásáért felelnek, és kapcsolatban állnak a H-ITB-vel.

### Indulás
*   **Új cég regisztrációja:** Ha Ön az első a cégnél, válassza az "Új cég" opciót. Ezzel Ön lesz a cég **Adminisztrátora**. A rendszer generál egy ETAR Kódot (pl. `X7Y2Z9`), amit megoszthat kollégáival.
*   **Csatlakozás:** Ha már van ETAR kódja, a "Csatlakozás" gombbal kérhet felvételt a céghez.

### Szerepkörök és Jogosultságok
A jogosultságok egymásra épülnek: a magasabb szintű hozzáférés magában foglalja az alacsonyabb szintek minden funkcióját.

*   **READ (Olvasás):** Alapszintű hozzáférés.
    *   ✅ Listák megtekintése, szűrése, keresés.
    *   ✅ Elkészült jegyzőkönyvek letöltése és nyomtatása.
*   **WRITE (Írás):** Operatív munkatárs (**Mindent tud, amit a READ**).
    *   ✅ Új eszközök felvitele az adatbázisba.
    *   ✅ Meglévő eszközök adatainak módosítása.
    *   ⛔ *Nem törölhet eszközt és nem kezelhet felhasználókat.*
*   **ADMIN:** Teljes körű hozzáférés (**Mindent tud, amit a WRITE**).
    *   ✅ Felhasználók meghívása, jóváhagyása és törlése.
    *   ✅ Eszközök végleges törlése vagy selejtezése.
    *   ✅ Teljes adatbázis exportálása Excelbe.

### Főbb Funkciók
1.  **Eszközlista kezelése:**
    *   **Szűrés és Keresés:** Használja a fejlécben lévő szűrőket (Gyári szám, Következő vizsga ideje).
    *   **Megnevezés Szűrő:** Kattintson a **Megnevezés** oszlop fejlécére a gyorsszűrő legördítése hez. Itt kiválaszthat egy konkrét eszköztípust (pl. Emelőheveder), így csak azokat listázza a rendszer.
    *   **Operátor ID Kategóriák:**
        *   **Hozzáadás (+):** Az "Op. ID" oszlopban a `+` gombbal hozhat létre új, egyedi azonosító kategóriákat (pl. Rendszám, Leltári szám).
        *   **Törlés (Kuka):** A kiválasztott egyedi kategóriát a kuka ikonnal törölheti. **Fontos:** A törlés csak "elrejti" a kategóriát a listából, a bevitt adatok nem vesznek el. Ha újra létrehozza ugyanazt a kategóriát, az adatok visszatérnek.
    *   **Státusz kapcsoló:** Váltson az "Összes", "Megfelelt" (Zöld) vagy "Nem megfelelt" (Piros) eszközök között a gyors áttekintéshez.
    *   **Forrás szűrő:** Külön listázhatja a saját (H-ITB/Belső) és a külsős (I-vizsgáló) által vizsgált eszközöket.
    *   **Mobil nézet:** Mobilon a bal felső sarokban található menü ikonnal (hamburger menü) érheti el a szűrőket.

2.  **Adatimportálás (Excel):**
    *   Admin és Write joggal rendelkezők tömegesen tölthetnek fel eszközöket Excelből.
    *   **Tipp:** Használja a letölthető sablont az oszlopnevek helyes megadásához (pl. `Megnevezés`, `Teherbírás`, `Gyári szám`).

3.  **Jegyzőkönyvek:**
    *   A vizsgálatok után készült jegyzőkönyvek PDF-ben azonnal elérhetőek a "Jegyzőkönyv" gombra kattintva.

---

## 🔧 2. EJK Felhasználók (H-ITB Karbantartás)

Az **EJK (Emelőgép Javító/Karbantartó)** felhasználók a **H-ITB Kft.** munkatársai, akik a szerződött partnerek eszközein végzik az időszakos vizsgálatokat, karbantartásokat és javításokat.

### Szerepük a Rendszerben
*   A H-ITB szakemberei felelnek a partnerek eszközeinek naprakész állapotáért.
*   Teljes körű rálátásuk van a partner eszközeire a karbantartási feladatok ellátásához.
*   Ők készítik el a hivatalos vizsgálati jegyzőkönyveket és teszik meg a javítási ajánlatokat.

### Vizsgálat és Karbantartás
1.  **Új vizsgálat indítása:**
    *   Jelölje ki az eszközt és kattintson az "Új vizsgálat" gombra.
    *   **"Ajánlat menjen?"**: Ha javítás szükséges, jelölje be ezt az opciót. Az ilyen tételek sárga háttérrel jelennek meg a piszkozatokban.

2.  **Piszkozatok (Drafts):**
    *   A vizsgálatok először piszkozatként jönnek létre. Itt még módosíthatók.
    *   **Véglegesítés:** Ez a lépés **helyettesíti az aláírást**. A rendszer időbélyeggel és egyedi digitális ujjlenyomattal (hash kód) látja el a dokumentumot, amely ezután **megmásíthatatlanul archiválásra kerül** az adatbázisban.

3.  **Szűrési beállítások mentése:**
    *   A rendszer megjegyzi a kiválasztott szűrőket (pl. Üzemeltetői ID kategória, beírt keresőszavak), így oldalfrissítés után vagy visszalépéskor is ott folytathatja a munkát, ahol abbahagyta.

---

## 🕵️ 3. EKV Felhasználók (Független Szakértők)

Az **EKV (Emelőgép Külsős Vizsgáló)** olyan független, akkreditált szakértők, akik időszakos biztonsági felülvizsgálatokat végeznek, de nem a H-ITB állományába tartoznak.

### Megbízás és Hozzáférés
Az EKV felhasználók hozzáférése attól függ, kinek a megbízásából dolgoznak:

1.  **H-ITB Megbízásából:**
    *   Ha a H-ITB bíz meg egy külsős szakértőt (pl. speciális daruk vizsgálatára), a szakértő **INGYENES** hozzáférést kap az adott partner munkaterületéhez és a kijelölt eszközökhöz.
2.  **Partner (Ügyfél) Megbízásából:**
    *   Ha maga a partner kér fel egy külsős szakértőt, a szakértő **ELŐFIZETÉSI DÍJ** (Subscriber szerepkör) ellenében használhatja az ETAR rendszer minden képességét az adott partnernél (jegyzőkönyv generálás, nyilvántartás).

### Munkavégzés
*   **Vizsgálati Jog:** Az EKV felhasználók általában nem az összes eszközt vizsgálják, csak azokat, amelyekre megbízást kaptak (pl. csak a híddaruk, vagy csak a targoncák).
*   **Adatok:** A jegyzőkönyveken a szakértő saját adatai (Cégnév, Kamarai szám) szerepelnek, nem a H-ITB adatai.

### Előfizetés és Szerepkörök
*   `Subscriber` (Előfizető): Teljes jogú hozzáférés a partner eszközeihez (előfizetéses modell).
*   `Inspector` / `Subcontractor`: Korlátozott, eseti megbízás.
*   **Előfizetés lejárata:** A felületen színkódolt számláló jelzi a lejárat idejét (🟢 >10 nap, 🔴 <10 nap). Lejárat után a hozzáférés korlátozódik.

---

## 📱 Közös Funkciók (Minden Felhasználónak)

### 🚀 Gyors Azonosítás
*   **QR Kód:** Olvassa be a telefon kamerájával az eszközön lévő kódot az adatlap azonnali megnyitásához.
*   **NFC Chip:** Érintse telefonját az NFC matricához a villámgyors azonosításért (koszos környezetben is működik).

### 🔍 Keresés és Szűrés
*   **Gyári szám kereső:** Nem kell a teljes számot tudnia, elég egy részletet beírni.
*   **Érvényesség szűrő:** A "Zugelassen/Megfelelt" státuszú eszközök is "Megfelelt" kategóriába esnek.

### 📥 Adatbiztonság
*   A rendszer felhőalapú, biztonsági mentésekkel védett.
**Kérdése van?** Forduljon a rendszer adminisztrátorához vagy a fejlesztői csapathoz.
