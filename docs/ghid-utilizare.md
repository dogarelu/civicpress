# Ghid de utilizare — Panoul de administrare

Acest ghid explică, pas cu pas, tot ce poate face un utilizator în panoul de administrare al platformei de știri: autentificare, redactarea și publicarea articolelor, organizarea categoriilor, configurarea aspectului paginilor, setările site-ului și administrarea utilizatorilor.

Interfața panoului este integral în limba română și se accesează la adresa `/admin/`.

---

## Cuprins

1. [Roluri și permisiuni](#1-roluri-și-permisiuni)
2. [Autentificare](#2-autentificare)
3. [Structura panoului (meniul lateral)](#3-structura-panoului-meniul-lateral)
4. [Panou de bord (Dashboard)](#4-panou-de-bord-dashboard)
5. [Articole](#5-articole)
6. [Fluxul editorial (workflow)](#6-fluxul-editorial-workflow)
7. [Categorii](#7-categorii)
8. [Pill-uri (etichete pe imagini)](#8-pill-uri-etichete-pe-imagini)
9. [Aspect pagini (layout)](#9-aspect-pagini-layout)
10. [Setări site](#10-setări-site)
11. [Notificări](#11-notificări)
12. [Jurnal de activitate](#12-jurnal-de-activitate)
13. [Utilizatori](#13-utilizatori)
14. [Cum se reflectă configurările pe site-ul public](#14-cum-se-reflectă-configurările-pe-site-ul-public)
15. [Întrebări frecvente](#15-întrebări-frecvente)

---

## 1. Roluri și permisiuni

Există trei roluri, fiecare cu un nivel diferit de acces:

| Rol        | Etichetă în interfață | Ce poate face                                                                                                                                   |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **AUTHOR** | Autor                 | Scrie propriile articole și le trimite spre revizie. Vede și editează doar articolele proprii.                                                  |
| **EDITOR** | Editor                | Tot ce poate un autor, plus: revizuiește/publică orice articol, gestionează categorii, pill-uri și aspectul paginilor, vede setările site-ului. |
| **ADMIN**  | Admin                 | Tot ce poate un editor, plus: administrează utilizatorii și salvează setările globale ale site-ului.                                            |

Reguli utile de reținut:

- Un **autor** vede în liste doar articolele lui și le poate edita doar cât timp sunt în stările „Ciornă" sau „În revizie".
- Un **editor** nu poate edita direct un articol deja „Publicat" — trebuie mai întâi să-l arhiveze (sau să ceară unui admin).
- Un **admin** poate edita și articolele publicate.

Matrice rapidă de acces:

| Funcție                                         | Autor | Editor | Admin |
| ----------------------------------------------- | :---: | :----: | :---: |
| Panou de bord, articole proprii, jurnal propriu |   ✓   |   ✓    |   ✓   |
| Trimite propriile ciorne spre revizie           |   ✓   |   ✓    |   ✓   |
| Publică / aprobă / respinge / arhivează         |       |   ✓    |   ✓   |
| Categorii, pill-uri, aspect pagini              |       |   ✓    |   ✓   |
| Setări site (vizualizare)                       |       |   ✓    |   ✓   |
| Setări site (salvare)                           |       |        |   ✓   |
| Utilizatori                                     |       |        |   ✓   |
| Preferințe notificări (personale)               |   ✓   |   ✓    |   ✓   |
| Abonare la alerte de revizie                    |       |   ✓    |   ✓   |
| Editare articole deja publicate                 |       |        |   ✓   |

---

## 2. Autentificare

1. Accesează pagina de autentificare la `/admin/` (dacă nu ești logat, ești redirecționat automat către `/login`).
2. Completează **Email** și **Parolă**.
3. Apasă **Autentificare**.

- La succes apare mesajul „Autentificat cu succes!" și ești dus la Panoul de bord.
- La eșec apare „Email sau parolă incorecte."
- Link-ul **← Înapoi la site** te duce la pagina publică.

Detalii despre sesiune:

- Sesiunea se păstrează automat prin cookie-uri securizate; nu trebuie să te reautentifici la fiecare accesare.
- Dacă sesiunea de acces expiră, aplicația încearcă în fundal reînnoirea ei; dacă nu reușește, ești trimis la pagina de autentificare.
- Conturile dezactivate nu se pot autentifica.
- **Deconectare** se face din subsolul meniului lateral (butonul **← Deconectare**), unde apar și numele, emailul și rolul tău.

---

## 3. Structura panoului (meniul lateral)

După autentificare, în stânga apare meniul de navigație. Elementele afișate depind de rolul tău:

| Element de meniu  | Destinație           | Vizibil pentru |
| ----------------- | -------------------- | -------------- |
| Dashboard         | Panoul de bord       | Toți           |
| Articole          | Lista de articole    | Toți           |
| Categorii         | Gestionare categorii | Editor / Admin |
| Pill-uri          | Etichete pe imagini  | Editor / Admin |
| Aspect pagini     | Configurare layout   | Editor / Admin |
| Utilizatori       | Administrare conturi | Doar Admin     |
| Jurnal activitate | Istoric acțiuni      | Toți           |
| Setări            | Setările site-ului   | Editor / Admin |
| Notificări        | Preferințe personale | Toți           |

În partea de sus a panoului există un link către site-ul public (se deschide într-o filă nouă).

> Notă: chiar dacă un link nu apare în meniu pentru rolul tău, accesul direct pe URL este oricum blocat. Vei fi redirecționat către Panoul de bord.

Notificările din aplicație (mesaje de tip „toast") apar în colțul din dreapta sus: verde = succes, roșu = eroare, albastru = informativ.

---

## 4. Panou de bord (Dashboard)

Pagina de start după autentificare. Conține:

**Indicatori (carduri KPI):**

- **Ciorne** — numărul de articole în stadiul de ciornă.
- **În revizie** — articole trimise spre aprobare.
- **Publicate această săptămână** — articole publicate în ultimele 7 zile.

**Acțiuni rapide:**

- **Articol nou** — deschide formularul de creare.
- **Toate articolele** — deschide lista de articole.

**Activitate recentă:** ultimele acțiuni din jurnal (autor, acțiune, entitate, dată). Autorii văd doar propriile acțiuni.

---

## 5. Articole

### 5.1 Lista de articole (`/posts`)

- Buton **+ Articol nou** pentru a crea un articol.
- **Căutare**: câmpul „Caută articole…" filtrează după titlu (cu întârziere, pe măsură ce scrii).
- **Filtru de status**: Toate / Ciornă / În revizie / Publicat / Arhivat.

Coloanele tabelului: **Titlu** (link către editare), **Status**, **Autor**, **Categorie**, **Data publicării**, **Vizualizări**, **Acțiuni**.

Acțiunile disponibile pe fiecare rând depind de status și de rolul tău (vezi [secțiunea 6](#6-fluxul-editorial-workflow)).

Paginare: butoanele **Anterior / Următor** (câte 20 de articole pe pagină).

### 5.2 Creare / editare articol (`/posts/new`, `/posts/:id/edit`)

Ecranul este împărțit în două: **formularul principal** (stânga) și **panoul de publicare** (dreapta).

#### Câmpuri principale

| Câmp                                       | Rol                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| **Titlu** (obligatoriu)                    | Titlul articolului.                                                               |
| **Slug (URL)**                             | Opțional; dacă e gol, se generează automat din titlu.                             |
| **Data articolului** / **Ora articolului** | Data și ora (fus orar România).                                                   |
| **Autor (text afișat)**                    | Numele autorului afișat public; poate fi ales dintr-un pseudonim sau scris liber. |
| **Casete de afișare**                      | Afișează autorul / data / rezumatul în module și listări.                         |
| **Rezumat**                                | Un scurt sumar al articolului.                                                    |
| **Bulbi**                                  | Articole legate manual, afișate ca linkuri sub imaginea principală.               |
| **Conținut**                               | Corpul articolului — editor vizual sau mod HTML.                                  |
| **SEO**                                    | Titlu SEO și Descriere SEO pentru motoarele de căutare.                           |

#### Editorul de conținut

- Poți scrie cu **editorul vizual** (WYSIWYG) sau comuta pe **Editare HTML**.
- Bara de instrumente a editorului vizual include: **bold**, _italic_, subliniere, culoare text, tăiere text, titluri (H1/H2/H3), liste (cu puncte și numerotate), citat, cod inline, link, inserare imagine, undo/redo.
- La inserarea unui **link** se deschide o fereastră unde introduci adresa URL.
- La inserarea unei **imagini**, aceasta este încărcată automat în biblioteca media și inserată în text.
- Butonul **↑ Import Word (.docx)** permite importul de conținut dintr-un document Word.

#### Secțiunea Bulbi (articole legate)

- **+ Adaugă bulbi** deschide un selector în care cauți articole **publicate**.
- Poți reordona (↑↓), șterge sau adăuga o etichetă personalizată pentru fiecare link.
- Nu poți lega articolul de el însuși și nu poți adăuga același link de două ori.

#### Imagine principală

- Încarci un fișier imagine; după încărcare se afișează previzualizarea.

#### Video

- Opțiuni: **Fără video** / **YouTube** / **Încarcă MP4** (maxim 100 MB).
- Pentru YouTube introduci adresa URL; pentru MP4 încarci fișierul. Ambele au previzualizare.

#### Categorie principală

- Se alege dintr-o listă (categoriile și subcategoriile sunt afișate ierarhic).

#### Plasare în module (doar Editor / Admin)

- Disponibilă când ai selectat o categorie.
- Alegi **pagina țintă** (Pagina principală sau Pagina categorie) și **modulul** în care va fi fixat articolul.
- La salvare, articolul este „prins" (pinned) în fața modulului ales.

#### Pill imagine

- Alegi un pill existent sau creezi unul nou (**+ Pill nou**): text, culoare de fundal și culoare text.

#### Istoricul versiunilor

- La articolele existente apare o listă (doar pentru citire) a versiunilor anterioare — se creează câte o versiune la fiecare salvare și la fiecare tranziție de status.

#### Panoul de publicare (dreapta)

Butoanele afișate depind de status și de rol:

| Buton                    | Când apare                                                  | Efect                                        |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| **Salvează**             | Întotdeauna                                                 | Salvează ciorna / conținutul.                |
| **Trimite spre revizie** | Ciornă + permisiune                                         | Salvează și trimite articolul spre aprobare. |
| **Publică acum**         | Editor+, la articole În revizie                             | Aprobă și publică.                           |
| **Publică direct**       | Editor+, la ciorne                                          | Publică sărind peste revizie.                |
| **Arhivează**            | Editor+, la articole Publicate                              | Scoate articolul de pe site.                 |
| **Republică**            | Editor+, la articole Arhivate                               | Repune articolul pe site.                    |
| **Șterge articolul**     | Editor+ (orice articol) sau autor (doar articolele proprii) | Ștergere definitivă (cu confirmare).         |

---

## 6. Fluxul editorial (workflow)

Un articol trece prin următoarele stări:

```
Ciornă ──trimite──► În revizie ──aprobă──► Publicat ──arhivează──► Arhivat
  │                     │                                              │
  │                     └──respinge──► Ciornă                          └──republică──► Publicat
  │
  └──publică direct (Editor+)──► Publicat
```

Acțiunile și cine le poate face:

| Acțiune   | Etichetă în interfață              | Din status | Cine                          | Rezultat                        |
| --------- | ---------------------------------- | ---------- | ----------------------------- | ------------------------------- |
| Trimite   | „Trimite" / „Trimite spre revizie" | Ciornă     | Autor (propriile) sau Editor+ | → În revizie; notifică editorii |
| Aprobă    | „Aprobă" / „Publică acum"          | În revizie | Editor+                       | → Publicat                      |
| Respinge  | „Respinge"                         | În revizie | Editor+                       | → Ciornă                        |
| Publică   | „Publică" / „Publică direct"       | Ciornă     | Editor+                       | → Publicat (sare peste revizie) |
| Arhivează | „Arhivează"                        | Publicat   | Editor+                       | → Arhivat                       |
| Republică | „Republică"                        | Arhivat    | Editor+                       | → Publicat                      |

**Efect la trimiterea spre revizie:** editorii și adminii care și-au activat notificările primesc automat o alertă (email și/sau Signal) atunci când un autor trimite un articol.

---

## 7. Categorii

Pagina `/categories` (Editor / Admin).

- **+ Categorie nouă** deschide formularul de creare.
- Categoriile pot fi reordonate prin **tragere** (drag & drop).

**Formular de creare/editare:**

- **Nume** (obligatoriu)
- **Slug** (opțional, generat automat din nume)
- **Categorie părinte** (pentru a crea o subcategorie)
- **Afișează în meniu** (dacă apare în navigația site-ului)
- **Descriere**

Fiecare rând din listă arată: mânerul de tragere, numele și slug-ul, numărul de articole, dacă e în meniu sau ascunsă, dacă e subcategorie, plus pictogramele de editare și ștergere.

Reguli importante:

- **Ierarhia are doar două niveluri** — o subcategorie nu poate avea la rândul ei subcategorii.
- O categorie nu poate fi propriul părinte.
- O categorie care are subcategorii nu poate fi transformată în subcategorie.
- Reordonarea se face doar în interiorul aceluiași nivel.
- La ștergere, dacă are articole, apare un avertisment.

---

## 8. Pill-uri (etichete pe imagini)

Pagina `/pills` (Editor / Admin). Pill-urile sunt etichete colorate afișate peste imaginea principală a articolelor (colțul din dreapta sus, pe site-ul public).

**Creare pill:**

- **Text** (obligatoriu, maxim 40 de caractere)
- **Culoare fundal** (obligatoriu)
- **Culoare text** (obligatoriu) — cu selector de culoare și cod hex
- Previzualizare în timp real; buton **Creează pill**.

Pentru fiecare pill vezi: previzualizarea etichetei, de câte ori este folosit, butoanele **Editează** și **Șterge** (ștergerea este blocată cât timp pill-ul este încă atașat unor articole).

**Articole cu acest pill:** listă cu link către editarea fiecăruia și buton **Elimină** pentru a detașa pill-ul de la un articol.

---

## 9. Aspect pagini (layout)

Pagina `/layouts` (Editor / Admin). Aici configurezi modul în care conținutul apare pe site-ul public. Există un buton global **Salvează**.

Trei file (tab-uri):

1. **Pagina principală** (`home`) — structura paginii de start.
2. **Pagini categorie** (`category`) — cum arată paginile de categorie (prima pagină).
3. **Pagina articol** (`article`) — module afișate sub corpul articolului.

### 9.1 Secțiunea Module

- Modulele pot fi reordonate prin tragere.
- Fiecare modul are: nume personalizat, opțiuni specifice tipului, **⚙ Tipografie**, **⚙ Tipografie rezumat** și buton de ștergere (×).
- Sloturile goale se completează automat cu cele mai recente articole (fără duplicate pe aceeași pagină).

**Tipuri de module disponibile:**

| Etichetă                               | Descriere                                                |
| -------------------------------------- | -------------------------------------------------------- |
| 1 articol principal                    | Un singur articol evidențiat (hero).                     |
| 1 principal + 3 mici                   | Un hero + o coloană cu 3 articole compacte.              |
| 1 principal + 6 mici (lățime completă) | Hero + două coloane a câte 3 articole (lățime completă). |
| 1 principal sus + 3 dedesubt           | Hero mare sus + rând de 3 carduri dedesubt.              |
| Principal pe poză (slideshow)          | Slideshow cu titlul suprapus pe imagine.                 |
| 4 articole în grilă (2×2)              | Grilă de 4 carduri.                                      |
| Listă de articole                      | Listă verticală cu buton „Mai multe".                    |
| Rânduri de 3                           | Unul sau mai multe rânduri etichetate a câte 3 carduri.  |
| Rânduri de 4                           | Rânduri a câte 4 carduri (lățime completă).              |
| Rânduri de 4 mici                      | Rânduri compacte de 4 coloane.                           |
| Slideshow articole                     | Slideshow cu articole rotative.                          |

**Opțiuni per modul (variază în funcție de tip):**

- Numărul de articole / slide-uri.
- **Afișează rezumat** + numărul de **Rânduri** (1–8).
- **Afișează categoria**.
- Modulele de tip „rânduri" permit **+ Rând categorie** / **+ Rând personalizat** cu categorie, titlu, număr de repetări și articole fixate (doar pe pagina principală).
- Sloturile fixate de pe pagina principală au selector de articol și opțiuni per slot (**Afișează autor** / **Afișează data**).

**Fila Pagina articol** are în plus: afișare rezumat, număr de rânduri, **⚙ Tipografie rezumat** și **⚙ Tipografie articol** (titlu + conținut).

### 9.2 Coloana secundară (dreapta)

- Comutator **Afișează coloana secundară**.
- Poți adăuga blocuri de tip sidebar:

| Bloc                            | Rol                                              |
| ------------------------------- | ------------------------------------------------ |
| Listă completă (ultimele știri) | Flux cu ultimele știri.                          |
| Împărțit pe categorii           | Secțiuni pe categorii.                           |
| Listă cu titlu pe imagine       | Listă cu titlul suprapus pe imagine.             |
| Listă verticală articole        | Listă tip rânduri.                               |
| Cele mai citite                 | Cele mai vizualizate articole (din anul curent). |
| Listă categorie (clasic)        | Listă cu articole dintr-o singură categorie.     |
| Slideshow                       | Slideshow în coloana laterală.                   |
| Video                           | Videoclipuri (manuale sau din articole).         |

**Regulă:** „Listă completă" și „Împărțit pe categorii" nu pot exista simultan.

Fiecare bloc: reordonare (↑↓), comutatoare pentru rezumat, ferestre de tipografie, buton **Elimină**, plus opțiuni specifice (număr de articole, titluri, alegere categorie, adrese video, poziția textului la slideshow etc.).

### 9.3 Ordine mobil

- Secțiune separată unde reordonezi (prin tragere) modulele și blocurile pentru afișarea pe telefon. Ordinea pe mobil este independentă de cea de pe desktop.

### 9.4 Ferestre de tipografie

- **Setări tipografie** (per tip de text): mărime text (10–60px), grosime (400–800), culoare text, previzualizare, plus **Resetează** / **Anulează** / **Salvează**.
- **Tipografie rezumat**: aceleași controale, doar pentru textul de rezumat.

---

## 10. Setări site

Pagina `/settings`. Editorii pot **vizualiza**; doar **Admin** poate **Salva** (non-adminii văd mesajul „Doar administratorii pot modifica setările.").

Secțiuni:

1. **Meniu principal** — numărul maxim de categorii afișate în antet (1–20); **Afișează meniul „Mai multe"**; ce categorii intră în „Mai multe".
2. **Tipografie** — mărimea și grosimea fontului pentru: titluri în liste, sumar în liste, titlu hero, titluri sidebar, titlu articol, conținut articol; plus **Rânduri rezumat (implicit)** (1–8).
3. **Afișare articole** — **Afișează numărul de vizualizări pe site**.
4. **Pseudonime autor** — listă cu adăugare/ștergere (maxim 20); **Salvează pseudonime**.
5. **Identitate site** — Nume site, Slogan, încărcare/ștergere logo.
6. **Culori** — Primară, Secundară, Accent, Fundal, Text (cu previzualizare); **Resetează culorile implicite**.
7. **Rețele sociale** — adrese Facebook, Twitter/X, YouTube, Instagram.
8. **Footer și pagini informative** — cod HTML pentru: contactul din footer, pagina Contact, Termeni și condiții, GDPR/Confidențialitate, politica de Cookie-uri.

---

## 11. Notificări

Pagina `/notifications` (toți utilizatorii). Aici îți setezi preferințele personale de contact și de alerte.

**Contact pentru alerte:**

- **Adresă email pentru notificări**
- **Număr de telefon Signal** (format E.164, ex. `+40712345678`)

**Alerte** (doar Editor / Admin):

- **Articol trimis spre revizie** — bife pentru Email / Signal (dezactivate până completezi datele de contact).

Butonul **Salvează** înregistrează preferințele tale personale.

---

## 12. Jurnal de activitate

Pagina `/audit`. Un tabel cu coloanele: **Acțiune**, **Entitate**, **Actor**, **Data** (paginat, câte 20 pe pagină).

- **Admin / Editor** văd toată activitatea.
- **Autor** vede doar propria activitate.

Acțiuni înregistrate automat: autentificări/deconectări, creare/modificare/ștergere/tranziții de articole, încărcări media, invitare/modificare utilizatori, modificări de setări și operațiuni pe categorii.

---

## 13. Utilizatori

Pagina `/users` — **doar Admin**.

**Lista** afișează: Nume, Email, Rol, Status (Activ/Inactiv), Ultima autentificare, Creat la (paginat). Click pe un rând deschide panoul lateral (drawer).

**+ Utilizator nou** deschide panoul de creare.

**Panou utilizator — mod informativ:**

- Inițiale avatar, nume, email, rol, status.
- Statistici: număr de articole, ultima autentificare.
- Slug, data creării, biografie.
- **Activitate recentă** (jurnal paginat pentru acel utilizator).
- Butoane **Editează** / **Închide**.

**Mod editare:**

- Nume afișat.
- Rol (Autor / Editor / Admin) — nu îți poți schimba propriul rol.
- Cont activ — nu te poți dezactiva pe tine însuți.
- Parolă nouă (opțional) cu buton **Auto** de generare.
- **Salvează** / **Anulează**.

**Mod creare:**

- Email, Nume afișat, Rol, Parolă (minim 6 caractere) cu buton **Auto**.
- La succes, parola generată este afișată o singură dată, cu buton **Copiază** și **Gata**.

---

## 14. Cum se reflectă configurările pe site-ul public

| Zonă din panou                                                    | Efect pe site-ul public                                               |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Setări (culori, fonturi, logo, tipografie)                        | Aspectul global: antet, titluri, rezumate, textul articolelor.        |
| Setări (afișare vizualizări)                                      | Afișarea numărului de vizualizări la articole.                        |
| Setări (meniu „Mai multe")                                        | Câte categorii apar în navigație vs. în meniul „Mai multe".           |
| Setări (HTML pagini legale)                                       | Conținutul paginilor Contact, Termeni, Confidențialitate, Cookie-uri. |
| Aspect — Pagina principală                                        | Întreaga structură a paginii de start.                                |
| Aspect — Pagina categorie                                         | Aspectul primei pagini de categorie.                                  |
| Aspect — Pagina articol                                           | Modulele/coloana laterală de sub articol.                             |
| Aspect — Ordine mobil                                             | Ordinea conținutului pe telefon/tabletă.                              |
| Categorii                                                         | Navigația din antet și linkurile de categorie.                        |
| Articole (conținut, imagine, video, pill, bulbi, bife de afișare) | Cum arată articolul și aparițiile lui în liste.                       |
| Pill-uri                                                          | Textul/culoarea etichetelor de pe imagini.                            |

Site-ul public include și: fluxul de pe pagina de start (module + coloană laterală), pagini de categorie cu paginare, secțiune video dedicată (`/video/...`), pagini de articol cu imagine sau video încorporat, linkuri „bulbi", etichete (tag-uri), butoane de distribuire (Facebook, X, WhatsApp), banner GDPR de cookie-uri și un ticker cu cursul valutar în antet.

---

## 15. Întrebări frecvente

**Nu văd butoanele de publicare la un articol.**
Verifică rolul: publicarea/aprobarea sunt disponibile doar pentru Editor și Admin. Autorii pot doar să trimită spre revizie.

**De ce nu pot edita un articol publicat?**
Editorii trebuie să arhiveze mai întâi articolul; doar adminii pot edita articolele deja publicate.

**Am șters un pill din greșeală?**
Un pill nu poate fi șters cât timp este atașat unor articole — mai întâi trebuie detașat din secțiunea „Articole cu acest pill".

**Cum apare un articol pe prima pagină într-un anumit loc?**
Folosește „Plasare în module" din formularul articolului (Editor+) sau fixează-l dintr-un slot în „Aspect pagini".

**De ce nu primesc notificări când se trimite un articol spre revizie?**
Verifică în „Notificări" că ai completat emailul/numărul Signal și că ai bifat alerta „Articol trimis spre revizie" (disponibilă doar pentru Editor/Admin).
