# Market Maker Swing Count [Fractal] — TradingView Indicator

## A metodologia

A chart-on megfigyelt annotációk egy **fraktál swing-számlálási rendszert** mutatnak, amely az ICT (Inner Circle Trader) Market Maker Model koncepcióira épül.

### Az alapképlet

```
(legs × sub_legs) + 1 = total_swing_points
```

Ahol:
- **legs** = minor swing-ek száma egy major mozgáson belül
- **sub_legs** = átlagos micro swing-ek száma minor swing-enként
- **+1** = a kiindulópont

### Rekurzív fraktál alkalmazás

Az eredmény bemenetként szolgál a következő szinthez:

```
Szint 1: (2 × 2) + 1 = 5    → 5 swing pont
Szint 2: (5 × 2) + 1 = 11   → 11 swing pont (finomabb felbontás)
```

### Befejezés-becslés

A `subtract` jelölés (pl. `(2×2)+1 = 5, then subtract 2 = 3`) azt jelenti:
- 5 swing pont várható
- 2 már megtörtént
- **3 van hátra** → a mozgás még nem fejeződött be

Ez a "completion counter" segít megbecsülni, mikor merülhet ki egy mozgás.

## Az indikátor komponensei

### 1. Háromszintű swing-detekció
- **Major** (alapértelmezett: 21 bar) — strukturális fordulópontok
- **Minor** (alapértelmezett: 8 bar) — belső swing-ek a major lábak között
- **Micro** (alapértelmezett: 3 bar) — alstruktúra

### 2. Fraktál formula megjelenítés
Minden major swing pont-nál megjelenik:
- Az aktuális láb fraktál formulája
- Az előző láb formulája (összehasonlításhoz)
- Befejezés-becslés (hány swing van még hátra)

### 3. Market Maker Model (MMM) fázisok
- **Accumulation** (kék) — árfolyam egy tartományban konszolidál
- **Manipulation** (piros) — hamis kitörés a tartományon túl
- **Distribution** (zöld) — igazi mozgás az ellenkező irányba

### 4. Cycle Top Prediction (@KillaXBT)

A makro ciklus tetejének becslése a csökkenő hozamok formulájával:

```
NextTop = ATH_Break × (1 + Previous_Gain% × Diminishing_Factor)
```

Ahol:
- **ATH_Break** = az az ár, ahol az új ATH áttört (pl. $70,000)
- **Previous_Gain%** = az előző ciklus %-os nyeresége ATH áttörés után (pl. 250%)
- **Diminishing_Factor** ≈ 0.2935 (átlagos ciklusonkénti csökkenés)

Példa (BTC 2024-es ciklus):
```
NextTop = 70,000 × (1 + 2.5 × 0.2935)
        = 70,000 × 1.73375
        = $121,362
```

### 5. Confluence (összefolyás) jel

A legértékesebb jel akkor keletkezik, amikor **mindkét rendszer egyszerre jelez**:
- A swing count "Complete"-et mutat (az előző láb alapján az összes várt swing megtörtént)
- Az ár a prediktált cycle top közelében van (konfigurálható %-os zóna)

Ez a **CONFLUENCE** jel jelenik meg a táblázatban és háttérszínnel a charton.

### 6. Info tábla
Valós idejű összesítő az aktuális állapotról:
- Minor/micro swing számok
- Fraktál formula
- Befejezés %
- Irány
- MMM fázis
- Cycle top predikció és távolság
- Confluence státusz

## Használat

1. Másold be a `.pine` fájl tartalmát a TradingView Pine Editor-ba
2. Kattints az "Add to Chart" gombra
3. Az indikátor automatikusan kalibrálja a swing hosszakat az adott instrumentum volatilitása alapján (Auto-Calibration mód). Manuális beállítás is lehetséges, de ajánlott az auto módot használni.

## Források

- [ICT Market Maker Model](https://innercircletrader.net/tutorials/ict-market-maker-buy-model/)
- [MMXM ICT Indicator (TradingView)](https://www.tradingview.com/script/4eQPT3aC-MMXM-ICT-TradingFinder-Market-Maker-Model-PO3-CHoCH-CSID-FVG/)
- [CandelaCharts Fractal Range Model](https://www.tradingview.com/script/1xrb2JPG-CandelaCharts-Fractal-Range-Model/)
- [ICT Power of 3 (PO3)](https://innercircletrader.net/tutorials/ict-power-of-3/)
