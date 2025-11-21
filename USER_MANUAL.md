# 🚀 ETAR Felhasználói Kézikönyv

**Az Emelőgép Törzskönyv és Adatnyilvántartó Rendszer (ETAR)** a modern ipari nyilvántartás csúcsa. Felejtse el a papírhalmokat és az átláthatatlan táblázatokat! Az ETAR egy felhőalapú, biztonságos és villámgyors megoldást kínál eszközei kezelésére, vizsgálatára és nyomon követésére.

---

## 🌟 Miért válassza az ETAR-t?

*   **Azonnali Átláthatóság:** Minden eszköz adata, története és állapota egy helyen.
*   **Digitális Forradalom:** QR kódos és NFC chipes azonosítás a másodperc töredéke alatt.
*   **Papírmentes Iroda:** A jegyzőkönyvek azonnal, online elérhetőek és letölthetőek.
*   **Könnyű Áttérés:** Meglévő Excel nyilvántartását percek alatt importálhatja.

---

## 📥 Pofonegyszerű Adatimportálás (Excel)

Már rendelkezik nyilvántartással? Nem kell kézzel felvinnie semmit! Ha Excel táblázata tartalmazza az alábbi oszlopneveket (a fejlécben), a rendszer automatikusan felismeri és betölti az adatokat.

**Kötelező és Javasolt Oszlopnevek:**

| Adat Típusa | Elfogadott Oszlopnevek (Fejléc) |
| :--- | :--- |
| **Megnevezés** | `Megnevezés` |
| **Teherbírás** | `Teherbírás`, `Teherbírás (WLL)` |
| **Gyári szám** | `Gyári szám` |
| **Típus** | `Típus` |
| **NFC / Chip** | `NFC kód`, `ETAR kód` |
| **Méret / Hossz** | `Méret`, `Hasznos hossz` |
| **Gyártó** | `Gyártó` |
| **Helyszín / ID** | `Üzemeltetői azonosító`, `Helyszín`, `Felhasználó` |
| **Gyártás éve** | `Gyártás éve` |

**Vizsgálati Adatok (Opcionális, de ajánlott):**

| Adat Típusa | Elfogadott Oszlopnevek (Fejléc) |
| :--- | :--- |
| **Következő vizsga** | `Következő időszakos vizsgálat`, `Érvényes` |
| **Eredmény** | `Eredmény`, `Megállapítások` |
| **Vizsgálat ideje** | `Vizsgálat időpontja` |
| **Vizsgálat helye** | `Vizsgálat helye` |

> 💡 **Tipp:** Az importálás során a rendszer ellenőrzi az adatokat, és jelzi, ha valami hiányzik. Hibás sorok esetén dönthet a javításról vagy a kihagyásról.

---

## 🚀 Indulás: Login és Onboarding

Az ETAR használata regisztrációhoz kötött, mely gyors és biztonságos.

### 1. Regisztráció
A nyitóképernyőn kattintson a **"Regisztráció"** gombra. Adja meg nevét, email címét és válasszon jelszót.

### 2. Csatlakozás vagy Új Cég
Belépés után két lehetőség közül választhat:

*   **🅰️ Új cég regisztrációja:** Ha Ön az első a cégnél.
    *   Adja meg a cég nevét és címét.
    *   A rendszer generál egy egyedi **ETAR Kódot** (pl. `X7Y2Z9`).
    *   **Ezt a kódot adja meg kollégáinak**, hogy csatlakozhassanak!
    *   Ön automatikusan **Admin** jogosultságot kap (jóváhagyás után).

*   **🅱️ Csatlakozás meglévő céghez:** Ha már van ETAR kódja.
    *   Válassza a "Csatlakozás céghez" opciót.
    *   Írja be a kapott **ETAR Kódot**.
    *   A csatlakozási kérelme elküldésre kerül az adminisztrátornak.
    *   Amíg nem hagyják jóvá, "Függőben lévő" státuszban lesz.

---

## 🛡️ Jogosultságok és Szerepkörök

Az adatbiztonság érdekében az ETAR szigorú jogosultsági rendszert használ.

| Jogosultság | Leírás | Mit tehet? | Mit NEM tehet? |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Teljes körű hozzáférés | ✅ Új eszközök felvitele, szerkesztése, törlése<br>✅ Vizsgálatok rögzítése<br>✅ Felhasználók kezelése (jóváhagyás, törlés)<br>✅ Adatbázis exportálása | - |
| **WRITE (Írás)** | Operatív munkatárs | ✅ Új eszközök felvitele, szerkesztése<br>✅ Vizsgálatok rögzítése<br>✅ Piszkozatok kezelése | ❌ Eszközök törlése<br>❌ Felhasználók kezelése |
| **READ (Olvasás)** | Megtekintő | ✅ Eszközök listázása, keresése<br>✅ Jegyzőkönyvek megtekintése<br>✅ Piszkozatok előnézete | ❌ Adatok módosítása<br>❌ Új vizsgálat indítása<br>❌ Piszkozatok törlése/véglegesítése |

> **EJK Felhasználók:** Speciális, emelőgép szakértői jogosultságok, melyek hasonlóan (Admin/Write/Read) épülnek fel, de kiegészülnek szakértői funkciókkal.

---

## 📱 Funkciók és Képernyők Bemutatása

Az ETAR felülete letisztult, modern és intuitív.

### 🏠 Főképernyő (Dashboard)
Itt látja azokat a cégeket, amelyekhez hozzáférése van. Egy kattintással beléphet a kiválasztott partner munkaterületére.

### 🛠️ Partner Munkaterület
Ez a rendszer szíve.
*   **Eszközlista:** Minden eszköz egy átlátható táblázatban.
*   **Szűrés és Keresés:** Keressen gyári számra, vagy szűrjön a vizsgálat lejárati dátuma szerint. A "szem" ikonnal azonnal látja a státuszt (🟢 Megfelelt, 🔴 Lejárt).
*   **Digitális Beolvasás:**
    *   📷 **QR Kód:** A kamera segítségével olvassa be az eszközön lévő QR kódot az azonnali azonosításhoz.
    *   📡 **NFC Chip:** Érintse a telefont a chiphez a villámgyors találatért.

### 📝 Új Vizsgálat Rögzítése
1.  Keresse meg az eszközt (vagy vigye fel újként).
2.  Töltse ki a vizsgálati űrlapot (Eredmény, Következő vizsga, stb.).
3.  **"Ajánlat menjen?"**: Jelölje be, ha az eszköz javításra vagy cserére szorul, és ajánlatot szeretne küldeni.
4.  Mentés után az adat **Piszkozatba** kerül.

### 📑 Piszkozatok és Véglegesítés
A rögzített vizsgálatok először piszkozatként jelennek meg.
*   Itt még módosíthatja az adatokat.
*   A **"Piszkozatok előnézete"** gombbal egyben láthatja a generálandó jegyzőkönyvet.
*   A **"Véglegesítés"** gombbal (csak Admin/Write) a jegyzőkönyv PDF formátumban létrejön, bekerül az archívumba, és az eszköz adatai frissülnek.

### ☁️ Online Jegyzőkönyvek
A véglegesített jegyzőkönyvek **bárhol, bármikor elérhetőek**. A QR kód beolvasásával (vagy a listából kattintva) a jegyzőkönyv azonnal megnyílik a böngészőben. Nincs több elkeveredett papír!

---

## 📖 Részletes Funkcióleírás (ENY Felhasználóknak)

Itt találja a rendszer legfontosabb funkcióinak részletes bemutatását és a használatukhoz szükséges jogosultságokat.

### 1. 📥 Adatbázis letöltés
Egy kattintással exportálhatja az összes eszközének adatát és a legutolsó vizsgálati eredményeket egy Excel fájlba.
*   **Mire jó?** Saját mentés készítése, offline munka, vagy további elemzések készítése Excelben.
*   **Szükséges jogosultság:** Mindenki (Read, Write, Admin)

### 2. 📤 Új eszköz feltöltés
Új emelőgép vagy eszköz rögzítése a rendszerben.
*   **Hogyan működik?** A gombra kattintva egy űrlap jelenik meg, ahol megadhatja az eszköz alapadatait (Megnevezés, Gyári szám, Teherbírás, stb.).
*   **Szükséges jogosultság:** **Csak Write és Admin** (Read jogosultsággal nem elérhető)

### 3. 🗑️ Törlés
Eszköz végleges eltávolítása a rendszerből.
*   **Fontos:** Csak olyan eszköz törölhető, amelyhez **még nem készült véglegesített jegyzőkönyv**. Ha már van jegyzőkönyv, az eszköz nem törölhető, csak leselejtezhető (az előzmények megőrzése miatt).
*   **Szükséges jogosultság:** **Csak Write és Admin**

### 4. 🚫 Leselejtezés
Az eszköz "Inaktív" státuszba helyezése.
*   **Mire jó?** Ha egy eszköz tönkrement, elveszett vagy kivonták a forgalomból, de a történetét meg kell őrizni. A leselejtezett eszközök eltűnnek az aktív listából, de az "Inaktívak" szűrővel bármikor visszakereshetőek.
*   **Szükséges jogosultság:** **Csak Write és Admin**

### 5. 📄 Jegyzőkönyvek
A kiválasztott eszközök véglegesített jegyzőkönyveinek tömeges megtekintése.
*   **Hogyan működik?** Jelöljön ki egy vagy több eszközt a listában (a sor elején lévő jelölőnégyzettel), majd kattintson a gombra. A rendszer egy új lapon nyitja meg az összes kapcsolódó jegyzőkönyvet, készen a nyomtatásra.
*   **Szükséges jogosultság:** Mindenki (Read, Write, Admin)

### 6. 🔍 Keresés gyári számra
Gyorskereső mező a lista tetején.
*   **Hogyan működik?** Kezdje el gépelni a gyári számot. A lista azonnal szűkül a találatokra. Nem kell a teljes számot beírni, töredékre is keres.
*   **Szükséges jogosultság:** Mindenki

### 7. 📅 Vizsgálat dátuma (Szűrő)
Szűrés az utolsó vizsgálat időpontja szerint.
*   **Formátum:** ÉÉÉÉ.HH.NN (pl. 2023.10.15).
*   **Mire jó?** Megkeresni, hogy mely eszközöket vizsgálták egy adott napon.
*   **Szükséges jogosultság:** Mindenki

### 8. ⏳ Következő vizsga (Szűrő)
A legfontosabb szűrő a karbantartáshoz.
*   **Mire jó?** Listázhatja azokat az eszközöket, amelyek vizsgálata hamarosan lejár.
*   **Tipp:** Írja be csak az évet és hónapot (pl. 2024.11) az adott hónapban esedékes eszközök listázásához.
*   **Szükséges jogosultság:** Mindenki

### 9. 🧹 Szűrők törlése
Minden beállított keresési feltétel és szűrő alaphelyzetbe állítása.
*   **Mikor használja?** Ha újra a teljes, szűretlen eszközlistát szeretné látni.
*   **Szükséges jogosultság:** Mindenki

### 10. 👁️ Inaktívak (Kapcsoló)
A leselejtezett vagy törölt (inaktív) eszközök megjelenítése.
*   **Alapállapot:** Kikapcsolva (csak az aktív eszközök látszanak).
*   **Bekapcsolva:** Csak a leselejtezett/inaktív eszközök jelennek meg a listában.
*   **Szükséges jogosultság:** Mindenki

### 11. 🔄 Lista frissítése
Az adatok újratöltése az adatbázisból.
*   **Mikor használja?** Ha úgy gondolja, hogy kollégája időközben módosított valamit, vagy ha a szinkronizációban bizonytalan.
*   **Szükséges jogosultság:** Mindenki

### 12. 📱 Digitális beolvasás
Az eszközök azonosítása kamera vagy NFC olvasó segítségével.
*   **QR Kód:** A telefon kamerájával olvassa be az eszközön lévő QR kódot. A rendszer azonnal a megfelelő sorhoz ugrik vagy megnyitja az adatlapot.
*   **NFC Chip:** Ha az eszköz rendelkezik chippel, csak érintse hozzá a telefonját. Ez a leggyorsabb és legbiztosabb azonosítási mód (koszos, sérült QR kód esetén is működik).
*   **Szükséges jogosultság:** Mindenki

---

**ETAR - Az Ön megbízható partnere a biztonságos üzemeltetésben.**
