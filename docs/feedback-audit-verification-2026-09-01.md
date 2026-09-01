# Feedback audit verification — barnanorbert.com

**Date:** 2026-09-01  
**Source feedback:** design + hiring hibalista (same date)  
**Verified against:** live `https://www.barnanorbert.com` (HTTP), local repo (same HTML), Playwright at 1280×900 and 390×844  
**Not available here:** `/workspace/barnanorbert-audit/` screenshot pack; Instructure/Raiffeisen header-komp export files (D1–D10 only partially checkable)

Legend: **TRUE** = fact confirmed · **PARTIAL** = direction right, detail off · **JUDGMENT** = true observation + hiring opinion · **FALSE** = wrong/outdated · **UNVERIFIED** = no evidence in this environment

---

## Meta corrections

| Claim | Verdict | Notes |
|---|---|---|
| Host: Webflow | **PARTIAL / FALSE as hosting** | Live site is self-hosted Express (Railway). CSS/class names are Webflow-export heritage (`norbertbarna.webflow.*.css`, `w-nav`, etc.). |
| Audit folder `/workspace/barnanorbert-audit/` | Missing in this workspace | Re-measured live + local instead. |
| Kineticare / OnRobot fold-pixel not opened | **TRUE** (honesty of original audit) | URLs return 200; hero-crop claims for those two were correctly marked unopened. |

---

## Scoreboard (by ID)

### 1. Nav / header

| ID | Verdict | Evidence |
|---|---|---|
| N1 | **TRUE** | Nav = Works + Find me on LinkedIn + Motion On. No About / Contact / CV. |
| N2 | **TRUE** | `/contact` 404, `/cv` 404, `mailto:` count = 0 on home/works/cases. |
| N3 | **TRUE** (as written) | Close CTAs are LinkedIn (nav + footer “Start a conversation on LinkedIn”). Other links (`#works`, `/works`) exist but are not contact closes. |
| N4 | **TRUE** | Motion toggle in nav; micro label; hiring noise is **JUDGMENT**. |
| N5 / M1 | **PARTIAL** | H1 visibly bleeds through open mobile menu (confirmed screenshot). Menu bg is `rgba(248,249,249,0.98)` — not “half” transparent; problem is real, wording exaggerated. |
| N6 | **JUDGMENT** | NB mark OK; role only in `<title>` is factual (see H1). |

### 2. Home `/`

| ID | Verdict | Evidence |
|---|---|---|
| H1 | **TRUE** | H1 = “Norbert Barna”. Role only in title/JSON-LD. Subtitle starts “I'm building…”. |
| H2 | **TRUE** | Hero CTA → `#works` (y≈671 in fold). Nav Works → `/works`. |
| H3 | **TRUE** + **JUDGMENT** on hiring order | Home selected = 5 cards, DOM order SportsGambit → Raiffeisen → Instructure → Bitpanda → Benker. Stagger: Raiffeisen Y≈3403, SportsGambit Y≈3543. Kineticare/OnRobot absent from home. “Should lead with Raiffeisen/Instructure” = hiring judgment. |
| H4 | **TRUE** | Fold images: none (empty right column). |
| H5 | **TRUE** | “SELECTED PORTFOLIO HIGHLIGHTS” 13px + 4 bullets; work proof is text on fold. |
| H6 | **TRUE** | H1 89.6/89.6/700 Funnel; dek 38.4/300 Inter; body ~19.2. Missing 24–32 middle scale. |
| H7 | **TRUE** | “ABOUT NORBERT BARNA” + “The Value Provided” + “Gain insights through user interviews…” template copy. |
| H8 | **TRUE** | `Professional<br/>Experience` → reads as one jammed word in DOM/text. |
| H9 | **TRUE** | Home cards show UI; case heroes are color fields without device/UI in fold. |

Page height ≈7478 (audit 7451) — match within noise.

### 3. `/works`

| ID | Verdict | Evidence |
|---|---|---|
| W1 | **TRUE** | Fold = H1 + manifesto; Kineticare card starts ~y 1290; only card top in fold. |
| W2 | **TRUE** | Manifesto includes “These aren’t mockups—they’re real products in action.” Defensive tone = **JUDGMENT**. |
| W3 | **TRUE** | Home 5 / SportsGambit-first vs works 7 / Kineticare-first. |
| W4 | **TRUE** | Kineticare card shows HU UI (“Szolgáltatások”, “Hatékony és biztonságos…”, HU CTAs). |
| W5 | **TRUE** | Right of manifesto empty. |

Height 5068 — exact match to audit.

### 4. Case headers

| ID | Verdict | Evidence |
|---|---|---|
| C1 | **TRUE** | Heroes = flat color; no device/UI in fold (SG/RAI/INST/BIT measured). |
| C2 | **TRUE** | Blog byline on cases; same Published Feb 7 / Updated Aug 30 on 6/7 cases (Kineticare differs: Published Aug 30). |
| C3 | **TRUE** | Fact keys differ (SG: Stage; INST: Product; RAI/BIT: Period). SG facts at y≈908 — **below** 900 fold. RAI/INST/BIT facts in fold. |
| C4 | **PARTIAL** | SG lede ~8 lines in fold, 21.76px — long blog-like lede **TRUE**. “Vastag/bold” **FALSE** (computed `font-weight: 400`). |
| C5 | **TRUE** | INST/BIT/SG chip rows overflow viewport; Bitpanda “Design Principles” clips mid-label (`Design P…`). RAI 5 chips fit. No fade/scroll affordance (`overflow: visible`). |
| C6 | **TRUE** | Long chip labels match audit. |
| C7 | **FALSE / outdated for live** | Bylines are near-black on yellow/green or white on navy/dark green — not weak gray-on-saturated as claimed. Motion micro-label contrast is a separate, weaker issue. |
| C8 | **TRUE** | “PROJECT FLOW” + `01 / 0n` injected by JS (`animations*.js`); decorative, not nav. |
| C9 | **TRUE** | SportsGambit (and other cases) `body class="body raiffeisen"`. |
| C10 | **TRUE** | Heights: RAI 13478, INST ~13211, BIT ~13211, SG ~11847 (audit ±noise). |
| C11 | **TRUE** | Heading set inconsistent across cases. |

### 5. Type system

| Claim | Verdict |
|---|---|
| Home H1 89.6 / 1.0 / 700 | **TRUE** |
| Case H1 85 / 102 | **TRUE** |
| Home dek 38.4 / 300 | **TRUE** |
| Case lede 21.76 bold | **PARTIAL** (size TRUE, bold FALSE) |
| Kicker 13 | **TRUE** |
| Body ~19.2 | **TRUE** |
| Case H2 45 | **TRUE** |
| Works card H2 19.2 | **TRUE** |
| Missing 24–32 middle scale | **TRUE** |

### 6. Mobile 390

| ID | Verdict |
|---|---|
| M1 | **PARTIAL** (see N5) |
| M2 | **TRUE** |
| M3 | **TRUE** (CTA present; still `#works`) |

### 7. IA

| ID | Verdict |
|---|---|
| I1–I3, I5–I6 | **TRUE** as facts; priority = **JUDGMENT** |
| I4 | Measurement note exists; placement “not in hero” = recommendation |
| Link health note | Plausible; LinkedIn HEAD 429 not re-probed as primary |

### 8. Header comps (Instructure + Raiffeisen)

| ID | Verdict |
|---|---|
| D1–D10 | **UNVERIFIED** as comps (files not in workspace) |
| Direction “device beside H1 is right” | **JUDGMENT** aligned with C1 gap |
| D7 Composition Chart / healthy ratio | **Related live signal:** Raiffeisen **works card** still shows “Composition Chart Showcase” / ratio UI — critique applies to shipped card art even without the komp file |

### 9. Priority order

Hiring-path first → case-header template → pixel → leftover cleanup is coherent given confirmed facts. Not “invented conversion”; it’s a remediation sequence.

---

## What is solid vs soft

**Solid (treat as real bugs / IA gaps):** N1–N3, N5/M1 readability, H1–H2, H4–H8, W1, W3–W5, C1–C3, C5–C6, C8–C11, type-scale gap, dual work lists, LinkedIn-only close, HU Kineticare card, `body raiffeisen`, identical byline dates.

**Hiring opinion (true observation, subjective fix):** SportsGambit should not lead; Motion out of nav; manifesto “defensive”; comps as poster vs page module.

**Wrong or overstated:** Host=Webflow as live host; case lede “bold”; byline WCAG failure on live color heroes (C7); “félig átlátszó” as ~50% opacity.

**Cannot judge here:** pixel crops from missing audit pack; D-komp specifics except where live cards echo them.

---

## Re-measure commands

```bash
npm start
# Playwright viewport checks used in this verification:
# 1280×900 home/works/cases, 390 mobile menu open
```

Live probes: `/` `/works` `/work/*` → 200; `/contact` `/cv` → 404.
