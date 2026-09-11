/**
 * Hämtar galaxens flotta från SWAPI och BAKAR ner den till en incheckad JSON.
 *
 * Varför baka i stället för att hämta vid varje sidvisning: datat är kanon och har inte
 * ändrats sedan filmerna. Ett nätanrop per rendering skulle ge latens, ett fel-läge och
 * ett beroende av att någon annans hobbyserver lever — för uppgifter som aldrig rör sig.
 * Kör om skriptet när du vill: `npm run swapi`.
 */
import { writeFileSync } from 'node:fs';

const API = process.env.SWAPI_URL ?? 'https://swapi.dev/api';

/**
 * Stegen i flottan, valda ur SWAPI:s 36 skepp för att vara igenkännbara OCH strikt
 * växande i längd. Ordningen verifieras mot API:ts egna längder nedan — ändrar SWAPI
 * sina siffror ska skriptet skrika, inte tyst bygga en trasig stege.
 */
const LADDER = ['TIE Advanced x1', 'X-wing', 'Millennium Falcon', 'CR90 corvette', 'Star Destroyer', 'Death Star'];

type Starship = { name: string; model: string; starship_class: string; length: string; hyperdrive_rating: string; manufacturer: string };

async function allStarships(): Promise<Starship[]> {
  const out: Starship[] = [];
  let url: string | null = `${API}/starships/?page=1`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SWAPI svarade ${res.status} på ${url}`);
    const page = (await res.json()) as { results: Starship[]; next: string | null };
    out.push(...page.results);
    url = page.next;
  }
  return out;
}

const metres = (s: Starship) => Number(s.length.replace(/,/g, ''));

async function main() {
  const ships = await allStarships();
  console.log(`SWAPI: ${ships.length} skepp hämtade`);

  const picked = LADDER.map((name) => {
    const ship = ships.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!ship) throw new Error(`"${name}" finns inte längre i SWAPI — välj ett annat steg i LADDER.`);
    return ship;
  });

  const lengths = picked.map(metres);
  if (lengths.some((l) => !Number.isFinite(l))) throw new Error('Ett av skeppen saknar användbar längd i SWAPI.');
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] <= lengths[i - 1]) {
      throw new Error(`Stegen är inte växande: ${picked[i - 1].name} (${lengths[i - 1]} m) ≥ ${picked[i].name} (${lengths[i]} m).`);
    }
  }

  const data = picked.map((s) => ({
    name: s.name,
    model: s.model,
    starshipClass: s.starship_class,
    manufacturer: s.manufacturer,
    lengthM: metres(s),
    hyperdrive: s.hyperdrive_rating,
  }));

  const path = 'lib/theme/themes/swapi-starships.json';
  writeFileSync(path, JSON.stringify({ source: API, fetchedAt: new Date().toISOString().slice(0, 10), ships: data }, null, 2) + '\n');
  console.log(`Skrev ${path}:`);
  for (const s of data) console.log(`  ${s.lengthM.toLocaleString('sv-SE')} m  ${s.name} (${s.starshipClass})`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
