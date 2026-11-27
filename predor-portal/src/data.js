// Demo dataset that mirrors the Predor data structures (persons, cards, doors,
// controllers, access events, time-attendance activity codes). Everything here
// is invented. The real connector writes the same shapes through /api/ingest.

import { budapestParts, budapestToEpoch, dayKey, addDays } from './time.js';

// Deterministic PRNG so the demo looks the same on every restart of a given day.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SITES = [
  { id: 'bp', name: 'Budapest, központ' },
  { id: 'gy', name: 'Győr, üzem' },
];

export const DOORS = [
  { id: 'bp-fo', siteId: 'bp', name: 'Főbejárat', controller: 'Phantom BP-01', reader: 'STid Architect (SSCP v2)', kind: 'perimeter' },
  { id: 'bp-mely', siteId: 'bp', name: 'Mélygarázs sorompó', controller: 'Phantom BP-01', reader: 'STid Architect (SSCP v2)', kind: 'vehicle' },
  { id: 'bp-iroda', siteId: 'bp', name: 'Iroda, 3. emelet', controller: 'Phantom BP-02', reader: 'STid Architect (SSCP v2)', kind: 'internal' },
  { id: 'bp-szerver', siteId: 'bp', name: 'Szerverszoba', controller: 'Phantom BP-02', reader: 'STid Architect + PIN', kind: 'restricted' },
  { id: 'bp-ebedlo', siteId: 'bp', name: 'Ebédlő', controller: 'Phantom BP-02', reader: 'Wiegand 26', kind: 'internal' },
  { id: 'gy-fo', siteId: 'gy', name: 'Porta, forgóvilla', controller: 'Phantom GY-01', reader: 'STid Architect (SSCP v2)', kind: 'perimeter' },
  { id: 'gy-sorompo', siteId: 'gy', name: 'Teherporta sorompó', controller: 'Phantom GY-01', reader: 'Wiegand 34', kind: 'vehicle' },
  { id: 'gy-csarnok', siteId: 'gy', name: 'Gyártócsarnok', controller: 'Sentinel GY-02', reader: 'Wiegand 26', kind: 'internal' },
  { id: 'gy-raktar', siteId: 'gy', name: 'Raktár', controller: 'Sentinel GY-02', reader: 'Wiegand 26', kind: 'internal' },
  { id: 'gy-veszelyes', siteId: 'gy', name: 'Vegyszerraktár', controller: 'Phantom GY-03', reader: 'STid Architect + PIN', kind: 'restricted' },
];

export const DEPARTMENTS = [
  { id: 'gyartas', name: 'Gyártás', siteId: 'gy', schedule: 'shift', door: 'gy-csarnok', size: 22 },
  { id: 'raktar', name: 'Raktár és logisztika', siteId: 'gy', schedule: 'shift', door: 'gy-raktar', size: 10 },
  { id: 'penzugy', name: 'Pénzügy', siteId: 'bp', schedule: 'office', door: 'bp-iroda', size: 6 },
  { id: 'it', name: 'IT', siteId: 'bp', schedule: 'office', door: 'bp-iroda', size: 5 },
  { id: 'ertekesites', name: 'Értékesítés', siteId: 'bp', schedule: 'office', door: 'bp-iroda', size: 8 },
  { id: 'hr', name: 'HR', siteId: 'bp', schedule: 'office', door: 'bp-iroda', size: 3 },
];

// Predor time-attendance activity codes (jelenléti jogcímek), simplified.
export const ACTIVITY = {
  present: 'Munkavégzés',
  late: 'Késés',
  overtime: 'Túlóra',
  vacation: 'Szabadság',
  sick: 'Betegszabadság',
  homeoffice: 'Home office',
  absent: 'Igazolatlan távollét',
  missingExit: 'Hiányzó kilépés',
  weekend: 'Pihenőnap',
  open: 'Bent van',
};

export const EVENT_TYPES = {
  granted: 'Belépés engedélyezve',
  denied_rights: 'Elutasítva: nincs jogosultság',
  denied_time: 'Elutasítva: időzónán kívül',
  denied_expired: 'Elutasítva: lejárt kártya',
  denied_unknown: 'Elutasítva: ismeretlen kártya',
  door_held: 'Ajtó nyitva maradt',
  door_forced: 'Ajtó erőszakos nyitása',
};

const SURNAMES = ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos', 'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete', 'Szilágyi', 'Török', 'Fehér', 'Balázs', 'Gál', 'Kis', 'Szűcs', 'Kocsis', 'Orsós', 'Pintér', 'Fodor', 'Szalai', 'Sipos', 'Magyar', 'Lukács', 'Gulyás', 'Biró', 'Király', 'László', 'Katona'];
const GIVEN = ['Bence', 'Máté', 'Levente', 'Dávid', 'Ádám', 'Péter', 'Gábor', 'Zoltán', 'László', 'Tamás', 'Attila', 'Norbert', 'Balázs', 'Krisztián', 'Róbert', 'Anna', 'Eszter', 'Réka', 'Katalin', 'Judit', 'Zsófia', 'Orsolya', 'Andrea', 'Viktória', 'Nóra', 'Petra', 'Dóra', 'Erika', 'Ildikó', 'Mónika'];
const POSITIONS = {
  gyartas: ['Gépkezelő', 'Gépkezelő', 'Összeszerelő', 'Minőségellenőr', 'Műszakvezető'],
  raktar: ['Raktáros', 'Targoncavezető', 'Logisztikai koordinátor'],
  penzugy: ['Pénzügyi elemző', 'Könyvelő', 'Kontroller'],
  it: ['Rendszergazda', 'Fejlesztő', 'IT biztonsági szakértő'],
  ertekesites: ['Értékesítő', 'Key account manager', 'Ügyfélszolgálati munkatárs'],
  hr: ['HR generalista', 'Bérszámfejtő'],
};

const CARD_TYPES = ['MIFARE DESFire EV3', 'MIFARE DESFire EV2', 'MIFARE Classic 1K', 'STid Mobile ID'];

function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
function gauss(rnd, mean, sd) {
  const u = 1 - rnd(); const v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function hex4(rnd) { return Math.floor(rnd() * 65536).toString(16).toUpperCase().padStart(4, '0'); }

export const DAYS_BACK = 35;

export function buildDataset(now = Date.now()) {
  const rnd = mulberry32(20261127);
  const persons = [];
  let seq = 1;
  for (const dep of DEPARTMENTS) {
    for (let i = 0; i < dep.size; i++) {
      const last = pick(rnd, SURNAMES);
      const first = pick(rnd, GIVEN);
      const position = i === 0 && dep.id === 'gyartas' ? 'Műszakvezető' : pick(rnd, POSITIONS[dep.id]);
      const cardType = pick(rnd, CARD_TYPES);
      persons.push({
        id: `p${String(seq).padStart(3, '0')}`,
        employeeNo: `T-${1000 + seq}`,
        name: `${last} ${first}`,
        departmentId: dep.id,
        siteId: dep.siteId,
        position,
        // Card numbers are masked at the connector, the portal never sees the full UID.
        card: { type: cardType, masked: `•••• ${hex4(rnd)}`, validUntil: '2027-12-31' },
        hasCar: rnd() < 0.35,
        shiftGroup: rnd() < 0.5 ? 'A' : 'B',
        homeOfficeRate: dep.schedule === 'office' ? 0.15 + rnd() * 0.15 : 0,
        punctuality: rnd(), // low value means more frequently late
        active: true,
      });
      seq++;
    }
  }
  // One leaver with an expired card who still tries the gate.
  const leaver = persons[27];
  leaver.card.validUntil = '2026-10-31 (lejárt)';
  leaver.active = false;

  const todayKey = dayKey(now);
  // HR side: leave and sick days the time-attendance module would hold.
  const leave = new Map();
  const rnd2 = mulberry32(7);
  for (const p of persons) {
    for (let d = DAYS_BACK; d >= 0; d--) {
      const key = addDays(todayKey, -d);
      const x = rnd2();
      const wd = new Date(key + 'T12:00:00Z').getUTCDay();
      if (wd === 0 || wd === 6) continue;
      if (x < 0.05) leave.set(`${p.id}|${key}`, 'vacation');
      else if (x < 0.08) leave.set(`${p.id}|${key}`, 'sick');
    }
  }

  const events = [];
  let evSeq = 1;
  const push = (ts, personId, doorId, type, direction) => {
    if (ts > now) return;
    events.push({ id: `e${evSeq++}`, ts, personId, doorId, type, direction });
  };

  for (let d = DAYS_BACK; d >= 0; d--) {
    const key = addDays(todayKey, -d);
    const [y, m, dd] = key.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); // 0 Sunday
    const isWeekend = weekday === 0 || weekday === 6;
    const weekNo = Math.floor((Date.UTC(y, m - 1, dd) / 86400000 + 3) / 7);
    const at = (h, min) => budapestToEpoch(y, m, dd, h, min);

    for (const p of persons) {
      const dep = DEPARTMENTS.find((x) => x.id === p.departmentId);
      const perim = dep.siteId === 'bp' ? 'bp-fo' : 'gy-fo';
      const vehicle = dep.siteId === 'bp' ? 'bp-mely' : 'gy-sorompo';
      if (!p.active) {
        if (!isWeekend && rnd() < 0.08) push(at(7, Math.floor(rnd() * 50)), p.id, perim, 'denied_expired', 'in');
        continue;
      }
      if (isWeekend) {
        if (dep.schedule === 'shift' && rnd() < 0.06) {
          const s = at(6, Math.floor(gauss(rnd, -8, 5)) + 0);
          push(s, p.id, perim, 'granted', 'in');
          push(s + 120000, p.id, dep.door, 'granted', 'in');
          push(s + (6 * 60 + Math.floor(rnd() * 60)) * 60000, p.id, perim, 'granted', 'out');
        }
        continue;
      }
      if (leave.has(`${p.id}|${key}`)) continue; // vacation or sick leave: code comes from HR
      if (rnd() < 0.006) continue; // unexcused absence
      if (dep.schedule === 'office' && rnd() < p.homeOfficeRate) { leave.set(`${p.id}|${key}`, 'homeoffice'); continue; }

      let startH, startM, lenMin;
      if (dep.schedule === 'office') { startH = 8; startM = 0; lenMin = 510; }
      else {
        const morning = (weekNo % 2 === 0) === (p.shiftGroup === 'A');
        startH = morning ? 6 : 14; startM = 0; lenMin = 480;
      }
      let offset = Math.round(gauss(rnd, dep.schedule === 'office' ? -6 : -12, dep.schedule === 'office' ? 12 : 5));
      if (rnd() < 0.04 + (1 - p.punctuality) * 0.1) offset = 6 + Math.floor(rnd() * 40);
      const arrive = at(startH, startM) + offset * 60000;
      if (p.hasCar && rnd() < 0.7) push(arrive - 90000, p.id, vehicle, 'granted', 'in');
      push(arrive, p.id, perim, 'granted', 'in');
      push(arrive + (1 + Math.floor(rnd() * 3)) * 60000, p.id, dep.door, 'granted', 'in');

      // Lunch in the canteen (Budapest) and the odd attempt at a restricted room.
      if (dep.siteId === 'bp' && rnd() < 0.6) push(at(startH + 4, Math.floor(rnd() * 50)), p.id, 'bp-ebedlo', 'granted', 'in');
      if (dep.id === 'it' && rnd() < 0.5) push(at(startH + 2, Math.floor(rnd() * 59)), p.id, 'bp-szerver', 'granted', 'in');
      if (dep.siteId === 'bp' && dep.id !== 'it' && rnd() < 0.012) {
        const t = at(startH + 1 + Math.floor(rnd() * 6), Math.floor(rnd() * 59));
        const tries = rnd() < 0.4 ? 3 : 1;
        for (let k = 0; k < tries; k++) push(t + k * 40000, p.id, 'bp-szerver', 'denied_rights', 'in');
      }
      if (dep.id === 'raktar' && rnd() < 0.25) push(at(startH + 3, Math.floor(rnd() * 59)), p.id, 'gy-veszelyes', 'granted', 'in');
      if (dep.id === 'gyartas' && rnd() < 0.01) push(at(startH + 2, Math.floor(rnd() * 59)), p.id, 'gy-veszelyes', 'denied_rights', 'in');

      let leaveMin = lenMin + Math.round(gauss(rnd, 8, 6));
      if (rnd() < 0.12) leaveMin += 30 + Math.floor(rnd() * 120); // overtime
      const leaveTs = at(startH, startM) + leaveMin * 60000;
      if (rnd() < 0.025) continue; // tailgating or forgotten card on exit: missing exit
      push(leaveTs, p.id, perim, 'granted', 'out');
      if (p.hasCar && rnd() < 0.7) push(leaveTs + 120000, p.id, vehicle, 'granted', 'out');
    }

    // Door-only events from the controllers.
    if (!isWeekend && rnd() < 0.35) push(at(10 + Math.floor(rnd() * 8), Math.floor(rnd() * 59)), null, pick(rnd, ['gy-raktar', 'gy-csarnok', 'bp-iroda']), 'door_held', null);
    if (rnd() < 0.18) push(at(Math.floor(rnd() * 5) + 0, Math.floor(rnd() * 59)), null, pick(rnd, ['gy-sorompo', 'bp-mely']), 'denied_unknown', 'in');
    if (rnd() < 0.03) push(at(2, Math.floor(rnd() * 59)), null, 'gy-raktar', 'door_forced', null);
    if (!isWeekend && rnd() < 0.15) {
      const shift = persons.filter((x) => x.departmentId === 'gyartas');
      push(at(23, 10 + Math.floor(rnd() * 40)), pick(rnd, shift).id, 'gy-fo', 'denied_time', 'in');
    }
  }

  events.sort((a, b) => a.ts - b.ts);

  return { persons, events, leave, generatedAt: now, todayKey };
}

export function siteOfDoor(doorId) {
  return DOORS.find((d) => d.id === doorId)?.siteId;
}

export { budapestParts };
