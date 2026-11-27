# Beléptetési adatportál (Predor)

Saját üzemeltetésű, mobilbarát webportál, amely egy Predor beléptető és munkaidő-nyilvántartó rendszer adatait mutatja szűrhetően, szerepkör szerint.

**Ez a verzió demó:** kitalált dolgozókkal és eseményekkel, amelyek a Predor adatszerkezetét követik (dolgozó, kártya, ajtó, vezérlő, esemény, jelenléti jogcím). Az éles verzióban az adat az ügyfélnél futó összekötőtől érkezik.

## Felépítés

```
Ügyfél belső hálózata                      Nálunk (Railway, EU)
┌───────────────┐   ┌──────────────┐  HTTPS ┌───────────────────────┐
│ Predor szerver│──▶│ Összekötő    │──────▶│ Portál (Node/Express) │──▶ böngésző, telefon (PWA)
│ (API / export)│   │ (Docker)     │ csak   │ + PostgreSQL (éles)   │
└───────────────┘   └──────────────┘ kifelé └───────────────────────┘
```

- `src/` portál szerver: belépés, szerepkörök, szűrés, Excel export, riasztásszabályok, hozzáférési napló, adatfogadás (`POST /api/ingest`, HMAC aláírással).
- `public/` front end: vanilla JS, build nélkül, PWA (kitehető a kezdőképernyőre).
- `connector/` az ügyfélnél futó összekötő: Predor Integrációs API vagy CSV export, kártyaszám-maszkolás, helyi puffer, újrapróbálás.
- `docs/schema.sql` az éles PostgreSQL séma.

## Szerepkörök a demóban

| Szerepkör | Mit lát |
|---|---|
| Vezetőség | mindent, hozzáférési naplót és az összekötő állapotát |
| HR | minden dolgozó munkaidejét és eseményeit, bérszámfejtési exporttal |
| Csoportvezető | csak a saját csapatát (demóban: győri raktár) |
| Vagyonvédelem | ajtókat, elutasításokat, riasztásokat, munkaidő nélkül |

## Futtatás

```bash
npm install
npm start            # http://localhost:3000
npm test
```

Környezeti változók:

| Változó | Jelentés |
|---|---|
| `PORT` | port (Railway adja) |
| `NODE_ENV` | `production` élesben (Secure süti, HSTS) |
| `DEMO_ACCESS_CODE` | ha meg van adva, a belépéshez kell ez a kód |
| `INGEST_TOKEN`, `INGEST_SECRET` | az összekötő tokenje és aláírókulcsa; nélkülük az adatfogadás ki van kapcsolva |

## Összekötő

```bash
cd connector
cp .env.example .env    # PORTAL_URL, INGEST_TOKEN, INGEST_SECRET, PREDOR_API_URL, PREDOR_API_KEY
docker compose up -d --build
```

Nem nyit portot, csak kifelé kommunikál. A Predor API végpontjai a gyártói leírás alapján pontosítandók (`adapters/predor-api.js`); addig a CSV mód a Predor időzített exportjával működik.

## Ami az éles verzióhoz még kell

1. Predor Integrációs API leírás és demó licenc az ügyfélen keresztül.
2. PostgreSQL tároló (`docs/schema.sql`) a memóriabeli demó tár helyett, több ügyfél (tenant) kezelésével.
3. Belépés Microsoft Entra ID-val vagy jelszó és kétlépcsős azonosítás.
4. Adatfeldolgozói szerződés, DPIA, megőrzési idő beállítása (automatikus törlés).
