/**
 * Hämtar galaxens rollista och LADDAR NER porträtten till public/characters/.
 *
 * SWAPI självt har inga bilder — bara text. Bilderna kommer från akababs statiska
 * SWAPI-dataset, som pekar vidare på Wookieepedias filer. Samma skäl som för flottan
 * att baka i stället för att hotlinka: bilderna ändras aldrig, och appen ska inte vara
 * nere för att någon annans bildserver är det. Kör om: `npm run swapi:people`.
 *
 * Bilderna föreställer Lucasfilms figurer — samma val som redan gjorts för
 * public/badges/darth-vader.png. Håll appen intern.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';

const SOURCE = process.env.SWAPI_PEOPLE_URL ?? 'https://akabab.github.io/starwars-api/api/all.json';
const OUT_DIR = 'public/characters';
/**
 * Porträtten laddas ner HIT och flyttas på plats först när hela rollistan är validerad.
 * Utan mellanlandningen river en halvfärdig körning de incheckade bilderna medan
 * swapi-people.json fortfarande listar dem — och varenda porträtt 404:ar. Nätverksfel,
 * en saknad sips och rollistevakten nedan kastar alla efter att raderingen redan skett.
 * Syskonkatalog, så att rename aldrig korsar en filsystemsgräns.
 */
const STAGING = `${OUT_DIR}.incoming`;
const TARGET = 24;

/**
 * Önskelista, avsiktligt längre än TARGET: Wookieepedia flyttar och tar bort filer, och
 * en död bild ska kosta nästa namn i listan — inte hela körningen. Alla är igenkännbara;
 * ingen ska behöva googla vem Ratts Tyerell är.
 */
const ROSTER = [
  'Luke Skywalker', 'Darth Vader', 'Leia Organa', 'Han Solo', 'Chewbacca', 'Obi-Wan Kenobi',
  'Yoda', 'R2-D2', 'C-3PO', 'BB8', 'Boba Fett', 'Jango Fett',
  'Palpatine', 'Lando Calrissian', 'Darth Maul', 'Padmé Amidala', 'Anakin Skywalker', 'Mace Windu',
  'Qui-Gon Jinn', 'Jabba Desilijic Tiure', 'Jar Jar Binks', 'Grievous', 'Dooku', 'Ackbar',
  'Rey', 'Finn', 'Poe Dameron', 'Captain Phasma', 'Wedge Antilles', 'Bossk',
];

type Person = { name: string; image?: string; species?: string; homeworld?: string };

/** Filnamnsvänligt namn: diakriter bort (Padmé → padme), allt annat till bindestreck. */
const slug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Wookieepedia stryper den som hämtar för snabbt — ett par körningar i rad räckte för att
 * få 403 på varenda bild i en halvtimme. En paus mellan hämtningarna är billigare än att
 * bli blockerad mitt i rollistan.
 */
const breathe = () => new Promise((r) => setTimeout(r, 400));

/** Wookieepedia svarar med webp om man inte ber om annat, och Satori läser inte webp. */
const original = (url: string) => `${url}/revision/latest/scale-to-width-down/400?format=original`;

/** png från Wookieepedia är ~300 kB, jpeg ~35 kB. sips finns på varje mac. */
function toJpeg(pngPath: string, jpgPath: string) {
  try {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', pngPath, '--out', jpgPath], { stdio: 'ignore' });
    } catch {
      throw new Error('sips saknas — kör skriptet på macOS, eller konvertera png till jpeg för hand.');
    }
    unlinkSync(pngPath);
  }

  async function main() {
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`Rollistan svarade ${res.status}`);
    const all = (await res.json()) as Person[];
    console.log(`${all.length} karaktärer i datasetet`);

    rmSync(STAGING, { recursive: true, force: true });
    mkdirSync(STAGING, { recursive: true });
    const people = [];
    const skipped: string[] = [];

    try {
    for (const wanted of ROSTER) {
      if (people.length === TARGET) break;
      const person = all.find((p) => p.name === wanted);
      if (!person?.image) { skipped.push(`${wanted} (saknas i datasetet)`); continue; }

      await breathe();
      const img = await fetch(original(person.image));
      if (!img.ok) { skipped.push(`${wanted} (bild ${img.status})`); continue; }
      const type = (img.headers.get('content-type') ?? '').split(';')[0];
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png' }[type];
      if (!ext) { skipped.push(`${wanted} (${type || 'okänd typ'})`); continue; }

      const base = slug(person.name);
      const path = `${STAGING}/${base}.${ext}`;
      writeFileSync(path, Buffer.from(await img.arrayBuffer()));
      if (ext === 'png') toJpeg(path, `${STAGING}/${base}.jpg`);

      people.push({ name: person.name, image: `/characters/${base}.jpg`, species: person.species ?? null, homeworld: person.homeworld ?? null });
      console.log(`  ${(statSync(`${STAGING}/${base}.jpg`).size / 1024).toFixed(0).padStart(4)} kB  ${person.name}`);
    }

    if (skipped.length) console.log(`Hoppade över: ${skipped.join(', ')}`);
    if (people.length < TARGET) throw new Error(`Bara ${people.length} av ${TARGET} porträtt gick att hämta — fyll på ROSTER. De gamla porträtten är orörda.`);

    // Hela rollistan är hämtad och validerad. Först nu rörs det som redan ligger på plats.
    rmSync(OUT_DIR, { recursive: true, force: true });
    renameSync(STAGING, OUT_DIR);

    const path = 'lib/theme/themes/swapi-people.json';
    writeFileSync(path, JSON.stringify({ source: SOURCE, fetchedAt: new Date().toISOString().slice(0, 10), people }, null, 2) + '\n');
    console.log(`Skrev ${path} och ${people.length} porträtt till ${OUT_DIR}/`);
  } finally {
    // Tom vid lyckad körning (den flyttades); städar halvfärdiga bilder vid fel.
    rmSync(STAGING, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
