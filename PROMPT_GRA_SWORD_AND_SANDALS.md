# PROMPT DLA CLAUDE CODE — Sieciowa Gra RPG: *Imperium of Sands*
### Inspiracje: Sword & Sandals · Shakes and Fidget · Rise of Kingdoms

---

## ROZDZIAŁ 1 — WIZJA I OGÓLNA KONCEPCJA GRY

Zbuduj kompletną, wieloosobową grę RPG online osadzoną w klimacie starożytnego Rzymu i Grecji, inspirowaną mechanikami **Sword & Sandals**, **Shakes and Fidget** oraz systemem świata z **Rise of Kingdoms**.

Gra nosi roboczą nazwę **Imperium of Sands** i łączy trzy filary rozgrywki:

- **Tryb Kariery (Arena)** — turowa walka 1v1 wzorowana bezpośrednio na Sword & Sandals. Gracz ręcznie wybiera każdą akcję: ruch, atak, obronę, specjal.
- **Tryb Automatyczny (Karczma/Questy)** — wyprawy z licznikiem czasu, jak w Shakes and Fidget. Gracz wysyła postać, odlicza się czas, po zakończeniu dostaje nagrody i logi walki.
- **Tryb Świata (Mapa)** — duża, wspólna mapa dla wszystkich graczy. Gildie zajmują tereny, budują bazy, wypowiadają sobie wojnę. System inspirowany Rise of Kingdoms.

Technologicznie gra działa w przeglądarce (HTML5 + JavaScript). Backend: **Node.js + Express**. Baza danych: **MongoDB Atlas**. Komunikacja real-time: **Socket.IO**. Autoryzacja: **JWT + bcrypt**. Grafika: styl retro 2D / pixel art, tematyka gladiatorów.

---

## ROZDZIAŁ 2 — REJESTRACJA I KREATOR POSTACI

### 2.1 Rejestracja
Ekran rejestracji zawiera pola: **nick**, **e-mail**, **hasło** (z potwierdzeniem). Po przejściu walidacji użytkownik trafia bezpośrednio do Kreatora Postaci — jednorazowego, wieloetapowego formularza.

### 2.2 Kreator Postaci — Etap 1: Wybór Rasy

Gracz wybiera jedną z sześciu ras. Każda rasa nadaje **stałe perki pasywne** i lekko modyfikuje wygląd sprite'a postaci.

| Rasa | Perk Pasywny | Opis |
|---|---|---|
| **Człowiek** | +5% do całego XP | Wszechstronni i zdolni do nauki |
| **Elf** | +3 Zręczność, +10% szansa na unik | Smukli, szybcy, wyczuleni |
| **Krasnolud** | +4 Obrona, +10% HP bazowe | Niezniszczalni obrońcy |
| **Ork** | +4 Siła, –1 Zręczność | Brutalny, prosty w działaniu |
| **Półelf** | +2 Zręczność, +2 Charyzma | Dyplomaci i zwiadowcy |
| **Tiefling** | +3 Magia, +15% do efektów zaklęć | Tajemnicze istoty piekielnego pochodzenia |

### 2.3 Kreator Postaci — Etap 2: Wybór Klasy

Gracz wybiera jedną z pięciu klas, która definiuje **styl walki**, dostępne umiejętności aktywne i skalowanie statystyk.

| Klasa | Główna Statystyka | Specjalność |
|---|---|---|
| **Wojownik** | Siła, Obrona | Walka w zwarciu, tarcze, ciężkie zbroje |
| **Łucznik** | Zręczność, Atak | Ataki z dystansu, krycie się, szybkie serie |
| **Czarodziej** | Magia, Wytrzymałość | Zaklęcia obszarowe, kontrola, duże obrażenia |
| **Paladyn** | Siła, Witalność | Leczenie siebie w walce, buffy, odporna tarcza |
| **Zabójca** | Zręczność, Atak | Krytyczne trafienia, uniki, trucizny |

Każda klasa odblokowuje **5 unikalnych umiejętności aktywnych** (odblokowywane co kilka poziomów) oraz **drzewko pasywnych talentów** do wyboru przy awansie.

### 2.4 Kreator Postaci — Etap 3: Wygląd i Imię

- Pole imienia postaci (niezależne od nicku konta)
- Wybór koloru skóry, koloru włosów, fryzury, twarzy (prosty system wariantów sprite'ów)
- Podgląd postaci na żywo po prawej stronie ekranu

### 2.5 Kreator Postaci — Etap 4: Dystrybucja Startowych Punktów

Gracz otrzymuje **10 punktów startowych** do rozdzielenia między bazowe statystyki. Klasa sugeruje optymalny rozkład, ale wybór należy do gracza.

**Bazowe statystyki postaci:**

| Statystyka | Wpływ na rozgrywkę |
|---|---|
| **Siła** | Obrażenia fizyczne, wymagania broni |
| **Zręczność** | Szybkość, unik, zasięg ruchu w turze |
| **Atak** | Szansa na trafienie |
| **Obrona** | Redukcja obrażeń, szansa na zablokowanie |
| **Witalność** | Maksymalne HP |
| **Charyzma** | Niższe ceny, Taunt, lepsze nagrody z questów |
| **Wytrzymałość** | Maksymalna Energia do akcji specjalnych |
| **Magia** | Obrażenia zaklęć (tylko klasy magiczne) |

---

## ROZDZIAŁ 3 — STRUKTURA ŚWIATA I POSTĘP GRACZA

### 3.1 Faza Startowa (poziomy 1–15): Strefa Chroniona

Nowy gracz trafia do swojej **strefy startowej** — wyizolowanego regionu mapy. Do poziomu 15 gracz **nie może opuścić swojej strefy** ani zostać zaatakowany przez innych graczy. To czas bezpiecznego developmentu.

W strefie startowej dostępne są:
- Lokalna **Arena** z rosnącą drabinką przeciwników NPC (każdy ma imię, historię, lore)
- Lokalna **Zbrojownia** z podstawowym asortymentem
- Lokalna **Kuźnia** z możliwością ulepszania ekwipunku
- **Karczma** — centrum questów automatycznych
- **Tablica Ogłoszeń** — questy fabularne od NPC
- **Działka gracza** (patrz Rozdział 7 — Farma)

### 3.2 Faza Globalna (poziom 15+): Otwarty Świat

Po osiągnięciu poziomu 15 gracz „wychodzi na świat":
- Zostaje przeniesiony na **wspólną mapę świata** widoczną dla wszystkich graczy
- Może dołączyć do gildii lub założyć własną
- Może uczestniczyć w wojnach gildii i zdobywaniu terytoriów
- Napotyka graczy innych frakcji — ryzyko PvP na określonych terenach

---

## ROZDZIAŁ 4 — SYSTEM NPC I QUESTY FABULARNE

### 4.1 Stali NPC w Strefie Startowej

Każdy NPC ma imię, wygląd, kilka linijek dialogu powitalnego i **pulę przypisanych zadań**. Przykładowi NPC:

**Marek Aurelian — Mistrz Areny**
- Dialog: *„Każdy wielki wojownik zaczął od piasku i krwi. Dziś ty stawiasz pierwszy krok."*
- Zadania: wyzwania turniejowe, zabójstwa określonych oponentów na arenie

**Tessara — Kupiec z Wschodu**
- Dialog: *„Mam towary z odległych krain... ale potrzebuję kogoś, kto je ochroni."*
- Zadania: eskorty, dostarczanie towarów, misje handlowe

**Brat Aldric — Stary Kapłan**
- Dialog: *„Bogowie patrzą na nas, synu. Niech twoje czyny będą godne historii."*
- Zadania: misje moralne z wyborami (pomagasz lub nie), ochrona świątyni

**Garna — Kowal**
- Dialog: *„Dobra broń nie wystarczy — musisz też wiedzieć, jak jej używać."*
- Zadania: zbieranie surowców do craftingu, niszczenie wrogich magazynów

### 4.2 System Questów Fabularnych (Dialogowych)

Questy fabularne to **wieloetapowe misje z drzewem decyzji**. Format każdego questa:

```
[QUEST: Tytuł]
NPC: [linia dialogowa]
→ Opcja A: [działanie]  →  Efekt A: [nagroda lub konsekwencja]
→ Opcja B: [działanie]  →  Efekt B: [inna nagroda lub malus]
```

**Przykładowe questy:**

*„Obrona Karawany"* (Tessara)
> Karawana Tessary zostanie zaatakowana tej nocy. Możesz ją bronić albo dać sobie spokój.
> - **Opcja A — Broń karawany**: walka z 3 bandytami, nagroda: +150 złota, +2 Charyzmy
> - **Opcja B — Zignoruj**: brak walki, –1 do reputacji u Tessary, dostęp do jej towarów tymczasowo zablokowany

*„Ucieczka Niewolnika"* (Brat Aldric)
> Stary kapłan prosi cię o pomoc w ukryciu zbiegłego niewolnika przed strażą.
> - **Opcja A — Pomóż**: +3 Charyzmy, +50 XP, ale przez 24h straż traktuje cię podejrzliwie (–5% złota z nagród)
> - **Opcja B — Wydaj go strażnicy**: +75 złota, –2 Charyzmy, kapłan odmówi ci questów przez 48h

*„Pojedynek Honorowy"* (Marek Aurelian)
> Rywal wyzwał cię publicznie. Odmowa to wstyd, przyjęcie — ryzyko.
> - **Opcja A — Przyjmij wyzwanie**: walka turniejowa 1v1, wygrana: +200 złota, +tytuł „Odważny"; przegrana: –100 złota, utrata tytułu
> - **Opcja B — Odmów**: –3 Charyzmy, brak walki

### 4.3 Generator Questów Losowych

Poza stałymi questami NPC, codziennie generowane są **3 losowe zdarzenia** na tablicy ogłoszeń. Oparte na szablonach z losowymi wariantami. Każde zdarzenie to jedno lub dwa zdania opisu + dwie opcje działania z efektami.

Przykładowe szablony (AI ma rozbudować do minimum 30 wariantów):
- Dziecko zgubiło się w lesie → szukasz: +XP, tracisz czas; ignorujesz: brak efektu
- Podróżny oferuje dziwny eliksir → kupujesz: losowy buff lub debuff; odmawiasz: nic
- Bandyta blokuje drogę → walczysz: złoto lub obrażenia; płacisz: –złoto, bez walki

---

## ROZDZIAŁ 5 — SYSTEM WALKI

### 5.1 Tryb Kariery — Walka Manualna (Arena)

Walka turowa 1v1 wzorowana na Sword & Sandals. Obaj zawodnicy stoją na arenie. Gracz **ręcznie wybiera akcję** w każdej turze.

**Dostępne akcje w turze:**

| Akcja | Koszt Energii | Opis |
|---|---|---|
| **Marsz** | 0 | Przesuwa postać o 1 pole. Konieczny by wejść w zasięg ataku. |
| **Quick Attack** | 1 | Mały DMG, wysoka szansa trafienia |
| **Normal Attack** | 2 | Standardowy DMG i szansa trafienia |
| **Power Attack** | 4 | Duży DMG, niska szansa trafienia |
| **Charge** | 3 | Ruch + atak w jednej akcji |
| **Taunt** | 2 | Prowokacja zależna od Charyzmy; może wymusić na wrogu nieoptymalne działanie |
| **Obrona** | 0 | Podnosi DEF o 30% do następnej tury, brak ataku |
| **Specjal** | 5+ | Unikalna umiejętność klasy (patrz Rozdział 2.3) |

**Formuły obliczeniowe:**

```
DMG = (Siła * mnożnik_ataku * losowy[0.85–1.15]) + obrażenia_broni – Obrona_wroga
Szansa trafienia = (Atak_gracza / (Atak_gracza + Obrona_wroga)) * 100%
Efekt Taunt = Charyzma_gracza * 0.4 (% szans na dezorientację wroga)
HP_max = Witalność * 10 + bonus_rasy + bonus_ekwipunku
Energia_max = Wytrzymałość * 5 + bonus_klasy
```

**Progresja walki:**
1. Obaj gracze/NPC stoją po dwóch stronach planszy (siatka 1D z pozycjami 1–10)
2. Inicjatywa: wyższy Atak lub Zręczność wykonuje akcję pierwszy
3. Walka toczy się do 0 HP jednej ze stron lub ucieczki
4. Po walce: XP, złoto, ewentualny drop przedmiotu

### 5.2 Tryb Automatyczny — Questy z Karczmy (Shakes & Fidget style)

Gracz wchodzi do karczmy, widzi listę dostępnych wypraw:

```
[WYPRAWA: Ruiny Starego Fortu]
Czas trwania: 2 godziny
Wymagany poziom: 5+
Nagrody: 200–400 XP, 50–120 złota, szansa na item (15%)
Trudność: ★★☆☆☆
[WYŚLIJ POSTAĆ]
```

Podczas trwania wyprawy postać jest **niedostępna** do innych aktywności. Po upływie czasu, gracz wraca i odbiera nagrody + log tekstowy walki (automatycznie rozegrana seria starć opisana narracyjnie).

**Mechanizm log walki:**
Serwer symuluje walkę w tle i generuje narracyjny raport:
> *„Twój wojownik wkroczył do ruin o świcie. Starł się z dwoma wartownikami — Power Attack zakończył pierwszy pojedynek. Przy wejściu do skarbca czekał lider bandy. Po ciężkiej walce udało ci się go pokonać, tracąc 40 HP."*

### 5.3 Walki PvP Online (1v1)

Gracz może wyzwać innego gracza na pojedynek. System oparty na tej samej mechanice co Tryb Kariery, z obydwoma graczami podłączonymi jednocześnie (Socket.IO). Jeśli wyzwany gracz jest offline, można zastosować symulację z jego statystykami (tryb „Ghost PvP").

---

## ROZDZIAŁ 6 — SYSTEM GILDII

### 6.1 Tworzenie i Dołączanie do Gildii

**Panel gildii** zawiera:
- Wyszukiwarkę gildii (po nazwie, poziomie wymaganym, statusie: otwarta/zamknięta)
- Listę otwartych gildii z opisem, liczbą członków, poziomem i ostatnią aktywnością
- Przycisk „Wyślij wniosek" przy każdej zamkniętej gildii
- Przycisk „Dołącz" przy otwartych gildiach (bez akceptacji)
- Przycisk „Załóż Gildię" — wymagane: min. poziom 10, 500 złota wpisowego

**Struktura hierarchii gildii:**

| Ranga | Uprawnienia |
|---|---|
| **Lider** | Pełna kontrola, wypowiadanie wojen, zarządzanie budynkami |
| **Oficer** | Akceptacja wniosków, kop/wyrzut z gildii (do rangi Wojownik), ogłoszenia |
| **Wojownik** | Udział w wojnach, dostęp do gildyjnych questów |
| **Rekrut** | Tylko questy wspólne, brak prawa głosu |

### 6.2 Budowa i Rozbudowa Siedziby Gildii

Lider może **zakupić i rozbudowywać budynki** siedziby gildii na mapie świata. Każdy budynek finansowany jest ze wspólnej kasy gildii (zasilanej składkami i nagrodami z questów gildyjnych).

**Dostępne budynki:**

| Budynek | Koszt (złoto) | Efekt |
|---|---|---|
| **Twierdza** (poziomy 1–5) | 1000–10000 | Pojemność członków: 10/20/35/50/75 |
| **Zbrojownia Gildii** | 2000 | Dostęp do exkluzywnych itemów gildyjnych |
| **Kuźnia Gildii** | 3000 | Ulepszanie przedmiotów gildyjnych |
| **Koszary** | 5000 | Odblokowanie trudniejszych questów gildyjnych |
| **Biblioteka** | 4000 | +5% XP dla wszystkich członków |
| **Skarbiec** | 3500 | +pojemność kasy gildyjnej, ochrona złota przy ataku |
| **Mury Obronne** (1–3) | 2000–8000 | +DEF podczas obrony siedziby |
| **Wieże Strażnicze** | 4000 | Powiadomienie o zbliżającym się wrogu (30 min alert) |

### 6.3 Punkty Reputacji Gildii

Gildie zdobywają **Punkty Reputacji (PR)** poprzez:
- Ukończone questy gildyjne (+10–50 PR)
- Zwycięstwa w wojnach (+100–500 PR zależnie od rangi rywala)
- Aktywność członków (dzienna premia)

Punkty Reputacji dają **pasywne bonusy dla wszystkich członków**:

| Próg PR | Bonus |
|---|---|
| 500 | +3% XP ze wszystkich aktywności |
| 1500 | +5% złota z questów |
| 3000 | +2% do ATK i DEF w walkach gildyjnych |
| 6000 | Dostęp do specjalnych questów Legendy |
| 10000 | Tytuł gildyjny widoczny przy nazwie postaci |

---

## ROZDZIAŁ 7 — SYSTEM WOJEN GILDII

### 7.1 Wypowiedzenie Wojny

Lider lub Oficer gildii **Agresora** może wypowiedzieć wojnę innej gildii. Procedura:

1. Agresor wysyła formalne **Wypowiedzenie Wojny** przez panel gildii
2. Obrońca otrzymuje powiadomienie i ma **24 godziny** na odpowiedź
3. Są dwie możliwości reakcji:

### 7.2 Wariant A — Obrońca Przyjmuje Wyzwanie

- Obie gildie **umawiają się na termin bitwy** (data i godzina rzeczywista)
- O ustalonej godzinie obie strony muszą stawić się w **specjalnej Strefie Bitwy** (osobna mapa PvP)
- Bitwa: seria walk **1v1 między losowo dobranymi parami** z obu gildii
- Kolejność: system bracket (jak turniej)
- Zwycięska gildia wygrywa rundę; wygrywa strona, która zdobędzie więcej rund
- **Nagrody dla zwycięzcy:** złoto ze skarbca pokonanej gildii (% ustalony z góry), Punkty Reputacji, opcjonalnie: fragment terytorium na mapie

### 7.3 Wariant B — Obrońca Milczy lub Odmawia

- Jeśli gildia obrońcy **nie odpowie w 24h**, staje się **celem otwartej agresji**
- Agresorzy mogą w **dowolnym momencie** podejść pod siedzibę gildii i zaatakować
- **Balans przy ataku niespodziewanym:**
  - Agresorzy na obcym terenie: **–15% DEF i –10% ATK** (kara za wrogie terytorium)
  - Obrońcy walczący u siebie: **+10% DEF** (bonus terenu)
  - Jeśli online jest mniej niż 3 obrońców, system dobiera NPC-wartowników gildyjnych (na poziomie statystyk brakujących graczy)
  - Agresor może zaatakować max **raz na 12 godzin** tę samą gildię
- **Kara za niezaakceptowanie wyzwania:** –200 PR gildii broniącej + ogłoszenie publiczne na czacie świata

### 7.4 Straty i Łupy

Po każdej wojnie gildyjnej:
- Przegrana gildia traci: **X% złota ze skarbca** + **Y punktów PR** (zależnie od poziomu gildii)
- Zwycięska gildia zdobywa: część złota + PR + ewentualnie **tytuł zdobywcy terytorium**
- Terytorium to sektor na mapie świata — daje **pasywny dochód złota** dla gildii właściciela

---

## ROZDZIAŁ 8 — FARMA GRACZA (Osobista Baza)

Każdy gracz posiada **własną działkę** dostępną z głównego menu. To osobista baza wzorowana na farmie z Shakes and Fidget.

### 8.1 Budynki Farmy

| Budynek | Maks. poziom | Efekt przy max poziomie |
|---|---|---|
| **Dom Gladiatora** | 5 | +25% HP regeneracji między walkami |
| **Magazyn** | 5 | +100% pojemności ekwipunku |
| **Pole Treningowe** | 5 | +10% XP ze wszystkich walk |
| **Stajnia** | 3 | –20% czasu wypraw z karczmy |
| **Laboratorium Alchemika** | 4 | Możliwość craftingu mikstur, –15% ceny eliksirów |
| **Kaplica** | 3 | +5% szansy na drop rzadkiego itemu |
| **Lochy** | 3 | Możliwość przetrzymywania pokonanych rywali (PvP trophy system) |

### 8.2 Mechanika Budowania

- Budynki wymagają **złota** i **surowców** (kamień, drewno, żelazo — zdobywane z questów i wypraw)
- Rozbudowa zajmuje **realny czas** (od 5 minut do kilku godzin zależnie od poziomu)
- Gracz może przyspieszyć budowę za **Klejnoty** (waluta premium lub zdobywana z eventów)

---

## ROZDZIAŁ 9 — SYSTEM EKWIPUNKU I SKLEPU

### 9.1 Kategorie Przedmiotów

- **Broń:** miecz, topór, włócznia, kusza, różdżka, sztylet
- **Zbroja:** hełm, naramienniki, napierśnik, nogawice, buty
- **Tarcza:** mała (bonus DEF) lub duża (większy bonus DEF, –Zręczność)
- **Akcesoria:** pierścień (2 sloty), amulet (1 slot)
- **Mikstury:** leczące HP, przywracające Energię, czasowe buffy

### 9.2 Rzadkość Przedmiotów

| Tier | Kolor | Dostępność |
|---|---|---|
| Zwykły | Szary | Sklep, drop 60% |
| Niezwykły | Zielony | Drop 25%, rzadko sklep |
| Rzadki | Niebieski | Drop 10%, specjalne questy |
| Epicki | Fioletowy | Drop 4%, turnieje, gildie |
| Legendarny | Złoty | Drop 1%, boss events, osiągnięcia |

### 9.3 Sklep, Zbrojownia i Kuźnia

- **Zbrojownia:** kupno/sprzedaż broni i zbroi. Asortyment zmienia się co 24h.
- **Kuźnia:** ulepszanie przedmiotów za złoto + surowce. Max +5 poziomów ulepszenia.
- **Alchemik:** kupno mikstur; z Laboratorium na farmie — tańszy crafting własny.

---

## ROZDZIAŁ 10 — SYSTEM LEVELOWANIA I STATYSTYK

### 10.1 Zdobywanie Doświadczenia

| Źródło | XP |
|---|---|
| Wygrana walka na arenie | 80–200 (zależnie od poziomu wroga) |
| Ukończony quest fabularny | 100–500 |
| Ukończona wyprawa z karczmy | 150–600 |
| Quest gildyjny | 200–1000 |
| Wygrana walka PvP | 50–300 |

### 10.2 Progresja Poziomów

```
XP do kolejnego poziomu = 1000 * poziom^1.4
```

Każdy awans daje:
- **3 Punkty Statystyk** do dowolnego rozdzielenia
- +10 max HP (bazowo)
- +5 max Energii
- Co 5 poziomów: 1 punkt do drzewka talentów klasy

---

## ROZDZIAŁ 11 — INTERFEJS UŻYTKOWNIKA (UI/UX)

### 11.1 Ekrany i Nawigacja

```
[Ekran Logowania / Rejestracji]
        ↓
[Kreator Postaci] (jednorazowo przy rejestracji)
        ↓
[Główne Miasto / HUB]
    ├── Arena (Tryb Kariery)
    ├── Karczma (Questy automatyczne)
    ├── Zbrojownia
    ├── Kuźnia
    ├── Tablica Questów (NPC)
    ├── Farma (osobista działka)
    ├── Gildia (panel gildyjny)
    └── Mapa Świata (odblokowana po lvl 15)
```

### 11.2 Stały HUD (widoczny zawsze)

- Avatar i imię postaci (lewy górny róg)
- Pasek HP i Energii
- Aktualny poziom i pasek XP
- Ilość złota i Klejnotów
- Ikona powiadomień (questy ukończone, wnioski gildyjne, ataki)
- Miniaturka aktywnej wyprawy z licznikiem czasu

### 11.3 Czat Online

Dolny pasek ekranu zawiera czat z zakładkami:
- **[Świat]** — globalny czat wszystkich graczy
- **[Gildia]** — tylko członkowie gildii
- **[Prywatny]** — wiadomości 1v1

---

## ROZDZIAŁ 12 — BACKEND, BAZA DANYCH I BEZPIECZEŃSTWO

### 12.1 Struktura Serwera

```
/server
  app.js                  ← konfiguracja Express + Socket.IO
  .env                    ← MONGO_URI, JWT_SECRET, PORT
  /routes
    auth.js               ← rejestracja, logowanie, JWT
    character.js          ← tworzenie postaci, statystyki
    arena.js              ← walki manualne
    quests.js             ← questy fabularne i automatyczne
    guild.js              ← gildie, budynki, wojny
    farm.js               ← farma gracza
    shop.js               ← sklep, zbrojownia
    chat.js               ← historia czatu
  /models
    User.js               ← konto (nick, email, hash hasła, JWT)
    Character.js          ← postać (rasa, klasa, statystyki, XP, lvl)
    Item.js               ← przedmiot (typ, tier, statystyki, wymagania)
    Quest.js              ← quest (typ, status, timer, nagrody)
    Guild.js              ← gildia (członkowie, budynki, PR, skarbiec)
    GuildWar.js           ← wojna (agresor, obrońca, status, termin)
    Farm.js               ← farma (budynki gracza, surowce)
  /controllers
    authController.js
    combatController.js
    questController.js
    guildController.js
  /socketHandlers
    chatHandler.js        ← Socket.IO — czat real-time
    combatHandler.js      ← Socket.IO — walki PvP i gildyjne live
    guildWarHandler.js    ← Socket.IO — powiadomienia o ataku gildii
```

### 12.2 Bezpieczeństwo

- Hasła hashowane **bcrypt** (salt rounds: 12)
- Autoryzacja przez **JWT** (expiry: 7 dni, refresh token: 30 dni)
- **Rate limiting** na endpointach: logowanie (5/min), walka (30/min), chat (20/min)
- **Sanityzacja** wszystkich inputów (express-validator)
- **CORS** — tylko whitelista własnych domen
- **HTTPS** obowiązkowe w produkcji (certyfikat SSL)
- Logi błędów przez **Winston** lub **Morgan**

### 12.3 Hosting i Środowisko

- Backend: **Railway / Render / AWS EC2**
- Baza danych: **MongoDB Atlas** (M10+ dla produkcji)
- Frontend: **Vercel / Netlify** lub serwowany ze statica Express
- Zmienne środowiskowe w `.env` (nigdy w kodzie)

---

## ROZDZIAŁ 13 — STRUKTURA FRONTENDU

```
/client
  index.html
  /src
    app.js                  ← entry point, routing
    /screens
      LoginScreen.js
      CharacterCreator.js
      TownHub.js
      ArenaScreen.js
      QuestScreen.js
      GuildPanel.js
      FarmScreen.js
      WorldMap.js
    /components
      HUD.js
      ChatBar.js
      InventoryPanel.js
      StatPanel.js
      BattleLog.js
      QuestTimer.js
    /engine
      CombatEngine.js       ← logika walki (formuły, tury)
      QuestEngine.js        ← generator questów losowych
      AIOpponent.js         ← strategie AI przeciwników
    /utils
      api.js                ← fetch wrapper dla REST API
      socket.js             ← Socket.IO client
      helpers.js
  /assets
    /sprites                ← pixel art postacie, NPC, itemy
    /backgrounds            ← tła areny, miasta, mapy
    /audio                  ← ścieżka orchestralna, SFX
    /icons                  ← ikony itemów, statystyk, budynków
```

---

## ROZDZIAŁ 14 — MULTIMEDIA I STYL WIZUALNY

- **Styl graficzny:** retro pixel art 2D. Gladiatorzy w grecko-rzymskich strojach. Tła: arena z piaskiem i kolumnami, miasto z kamienną architekturą, mapa świata z ikonami terytoriów.
- **Sprite'y postaci:** generuj jako placeholdery SVG lub pixel art 64x64px, różniące się kolorem i klasą. Docelowo: warianty dla każdej rasy × klasy.
- **Muzyka:** orchestralna ścieżka tematyczna (plik MP3/OGG). Różne motywy dla: menu, areny (napięcie), mapy świata (epika), karczmy (spokój). Użyj darmowych assetów (OpenGameArt.org, FreeMusicArchive.org) jako punkt startowy.
- **SFX:** odgłosy uderzeń, zbroi, zaklęć, powiadomień gildyjnych.
- **UI:** ciemne tło (deep navy lub czarno-brązowe), złote akcenty, czerwone paski HP, zielone paski XP. Font: szeryfowy z klimatem starożytnym (np. Cinzel z Google Fonts).

---

## ROZDZIAŁ 15 — PRIORYTETY IMPLEMENTACJI (Kolejność Budowania)

```
Faza 1 — Fundament
  ✦ Rejestracja, logowanie, JWT
  ✦ Kreator postaci (rasa + klasa + statystyki)
  ✦ HUB miasta + nawigacja

Faza 2 — Rdzeń Rozgrywki
  ✦ System walki manualnej (Arena)
  ✦ Questy automatyczne z timerem (Karczma)
  ✦ Sklep i ekwipunek

Faza 3 — Głębokość
  ✦ Questy fabularne z NPC i drzewem dialogów
  ✦ Farma gracza i budynki
  ✦ System levelowania i talentów

Faza 4 — Multiplayer
  ✦ Czat online (Socket.IO)
  ✦ Walki PvP
  ✦ System gildii (tworzenie, dołączanie)

Faza 5 — Endgame i Świat
  ✦ Mapa świata (odblokowanie lvl 15)
  ✦ Budynki gildii i questy gildyjne
  ✦ System wojen gildii (wypowiedzenie, bitwa, łupy)
  ✦ Terytoria i pasywne dochody
```

---

*Każdy moduł powinien być budowany jako niezależna, testowalna jednostka kodu z jasnym API. Zachowaj modularność, by możliwa była łatwa rozbudowa w przyszłości. Priorytetem jest stabilność i bezpieczeństwo — dopiero potem optymalizacja wizualna.*
