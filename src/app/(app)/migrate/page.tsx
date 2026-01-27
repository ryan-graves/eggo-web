'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { getFirebaseApp } from '@/lib/firebase/config';
import styles from './page.module.css';

const CSV_DATA = `Name,Date Received,Has Been Assembled,Occasion,Pieces,Primary Owner,Set Number,Status
Assembly Square,08/29/2022,No,Birthday 2022 from Ryan,4002,Alyssa,10255,Unopened box
Lucky Bamboo,12/24/2025,No,Christmas 2025 from Kristin,325,Ryan,10344,Unopened box
Plum Blossom,08/18/2024,No,Pregnancy / Birthday 2024 from Kay,327,Alyssa,10369,Unopened box
Central Perk,12/25/2021,No,Christmas 2021 from Ryan,1070,Alyssa,21319,Unopened box
Motorized Lighthouse,12/25/2023,No,Christmas 2023 from Alyssa,2065,Ryan,21335,Unopened box
The Office,10/07/2022,No,Just because,1165,Ryan,21336,Unopened box
Tales of the Space Age,05/18/2023,No,Just because,688,Ryan,21340,Unopened box
Disney Pixar Luxo Jr.,06/04/2025,No,Just Because,613,Ryan,21357,Unopened box
AT-ST,05/01/2022,No,Add-on with dioramas,79,Ryan,30495,Unopened box
Surfer Beach House,12/25/2021,No,Christmas 2021 from James Leila Lewis and Eliot,564,Alyssa,31118,Unopened box
Goldfish,12/25/2022,No,Christmas 2022 from Alyssa,186,Ryan,40442,Unopened box
Mystic Witch,11/06/2022,No,add-on with AT-AT purchase,257,,40562,Unopened box
Cherry Blossoms,08/18/2024,No,Pregnancy / Birthday 2024 from Kay,438,Alyssa,40725,Unopened box
Pizza Van,12/25/2020,No,Christmas 2020 from James & Leila,249,Alyssa,60150,Unopened box
Y-wing Starfighter,12/25/2017,No,Christmas 2017 from grandma,691,Ryan,75172,Unopened box
Action Battle Endor Assault,,No,,193,Ryan,75238,Unopened box
Luke Skywalker's Landspeeder,12/25/2021,No,Christmas 2021 from ?,236,Ryan,75271,Unopened box
Armored Assault Tank (AAT),12/25/2021,No,Christmas 2021 from Ryan,286,Alyssa,75283,Unopened box
Mos Eisley Cantina,03/08/2023,No,Just because,3187,Ryan,75290,Unopened box
Duel on Mandalore,07/30/2022,No,From Ryan Just because,147,Alyssa,75310,Unopened box
AT-AT,11/06/2022,No,7th anniversary,6785,Ryan,75313,Unopened box
Dark Trooper Attack,12/25/2022,No,Christmas 2022 from Alyssa's parents,166,Ryan,75324,Unopened box
Dagobah Jedi Training Diorama,05/01/2022,No,Just because,1000,Ryan,75330,Unopened box
Death Star Trash Compactor Diorama,05/01/2022,No,Just because,802,Ryan,75339,Unopened box
TIE Bomber,12/25/2024,No,Christmas 2024 from James & Leila,625,Ryan,75347,Unopened box
Emperor's Throne Room Diorama,05/06/2023,No,May the Fourth 2023,807,Ryan,75352,Unopened box
Endor Speeder Chase Diorama,05/06/2023,No,May the Fourth 2023,608,Ryan,75353,Unopened box
Millenium Falcon,12/24/2024,No,Christmas 2024 from Ryan's parents,921,Ryan,75375,Unopened box
Tantive IV,05/04/2024,No,May the Fourth 2024,654,Ryan,75376,Unopened box
Mos Espa Podrace Diorama,05/04/2024,No,May the Fourth 2024,718,Ryan,75380,Unopened box
Ahsoka Tano's Duel on Peridea,10/16/2025,No,Just because,382,Ryan,75385,Unopened box
Desert Skiff & Sarlacc Pit,10/17/2025,No,Just Because,558,Ryan,75396,Unopened box
1974 Porsche 911 Turbo 3.0,,No,,180,Ryan,75895,Unopened box
Palace Cinema,,Yes,,2196,Alyssa,10232,Rebuild in progress
Death Star II,05/06/2023,No,Add-on with X-wing Purchase,289,Ryan,40591,In progress
Boba Fett Helmet,10/10/2020,No,Birthday 2020 from Alyssa,625,Ryan,75277,In progress
X-wing Starfighter,05/06/2023,No,Just because,1949,Ryan,75355,In progress
Mindstorms NXT 2.0,10/10/2014,Yes,Christmas 2014,619,Ryan,8547,Disassembled
Pet Shop,02/20/2017,Yes,Valentine's Day 2017,2032,Alyssa,10218,Disassembled
Brick Bank,08/29/2017,Yes,Birthday 2017,2380,Alyssa,10251,Disassembled
Bookshop,08/29/2020,Yes,Birthday 2020 from Ryan,2504,Alyssa,10270,Disassembled
The Eiffel Tower,02/14/2014,Yes,Valentine's Day 2014 from Ryan,321,Alyssa,21019,Disassembled
Louvre,12/25/2016,Yes,Christmas 2016 from Ryan,695,Alyssa,21024,Disassembled
Chicago,12/25/2018,Yes,Christmas 2018 from Ryan,444,Alyssa,21033,Disassembled
Townhouse Pet Shop & Cafe,08/29/2019,Yes,Birthday 2019 from Ryan,969,Alyssa,31097,Disassembled
AT-RT,01/17/2014,Yes,Our first date,222,Ryan,75002,Disassembled
Jedi Interceptor,,Yes,,223,Ryan,75038,Disassembled
AT-AT,05/02/2015,Yes,Engagement (May 2015),1137,Ryan,75054,Disassembled
T-16 Skyhopper,10/10/2015,Yes,Birthday 2015,247,Ryan,75081,Disassembled
Imperial Shuttle Tydirium,02/14/2016,Yes,Valentine's Day 2016,937,Ryan,75094,Disassembled
Rey's Speeder,12/25/2015,Yes,Christmas 2015,193,Alyssa,75099,Disassembled
Poe's X-wing Fighter,08/29/2016,Yes,Alyssa's Birthday 2016,717,Alyssa,75102,Disassembled
Eclipse Fighter,10/10/2016,Yes,Birthday 2016,363,Ryan,75145,Disassembled
Imperial Assault Hovertank,12/25/2017,Yes,Christmas 2017 from James & Leila,385,Ryan,75152,Disassembled
AT-ST Walker,10/10/2017,Yes,Birthday 2017,449,Ryan,75153,Disassembled
Rebel U-wing Fighter,11/06/2016,Yes,1-Year Anniversary,659,Ryan,75155,Disassembled
Kylo Ren's Tie Fighter,12/25/2017,Yes,,630,Ryan,75179,Disassembled
Darth Vader Transformation,12/25/2017,Yes,Christmas 2017 from Alyssa,282,Ryan,75183,Disassembled
Millenium Falcon,12/25/2017,Yes,Christmas 2017 gift to ourselves,7541,Ryan,75192,Disassembled
Bouquet,,Yes,,756,Alyssa,10280,Assembled
Back to the Future Time Machine,10/10/2022,Yes,Birthday 2022 from Alyssa,1872,Ryan,10300,Assembled
Succulents,11/28/2022,Yes,Just because,771,Ryan,10309,Assembled
Chrysanthemum,08/18/2024,Yes,Pregnancy / Birthday 2024 from Kay,278,Alyssa,10368,Assembled
X-wing Starfighter,05/06/2023,Yes,Add-on with X-wing purchase,87,Ryan,30654,Assembled
AAT,05/04/2024,Yes,May the Fourth 2024,75,Ryan,30680,Assembled
Lars Family Homestead,05/01/2022,Yes,add-on with lego diaoramas,195,Ryan,40531,Assembled
Spring Fun VIP Add-On Pack,05/06/2023,Yes,Add-on with X-wing purchase,128,Alyssa,40606,Assembled
Game Boy,10/03/2025,Yes,Just because,421,Ryan,72046,Assembled
Carbon-Freezing Chamber,01/13/2019,Yes,Just because,231,Ryan,75137,Assembled
Millennium Falcon Microfighter,12/25/2020,Yes,,92,Ryan,75193,Assembled
First Order TIE Fighter Microfighter,12/25/2020,Yes,,91,Ryan,75194,Assembled
Ahch-To Island Training,12/25/2019,Yes,,241,Ryan,75200,Assembled
Escape Pod vs. Dewback Microfighters,,Yes,,177,Ryan,75228,Assembled
Resistance A-wing Starfighter,12/25/2021,Yes,Christmas 2021 from Alyssa's parents,269,Ryan,75248,Assembled
Anakin's Podracer - 20th Anniversary Edition,12/25/2021,Yes,christmas 2021 from Alyssa,279,Alyssa,75258,Assembled
Obi-Wan's Hut,12/25/2020,Yes,,200,Ryan,75270,Assembled
Bespin Duel,05/15/2022,Yes,just because,295,Ryan,75294,Assembled
Boba Fett's Starship,12/25/2021,Yes,Christmas 2021 from James Leila Lewis and Eliot,593,Ryan,75312,Assembled
The Mandalorian's N-1 Starfighter,12/25/2022,Yes,Christmas 2022 from James & Leila,412,Ryan,75325,Assembled
Death Star Trench Run Diorama,05/01/2022,Yes,Just because,665,Ryan,75329,Assembled
Brick-Built Star Wars Logo,12/25/2025,Yes,Christmas 2025 from Alyssa's parents,700,Ryan,75407,Assembled
McLaren Senna,12/25/2020,Yes,Christmas 2020 from James & Leila,218,Ryan,75892,Assembled`;

const STATUS_MAP: Record<string, string> = {
  'Unopened box': 'unopened',
  'In progress': 'in_progress',
  'Rebuild in progress': 'rebuild_in_progress',
  'Assembled': 'assembled',
  'Disassembled': 'disassembled',
};

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i]?.trim() || '';
    });
    return row;
  });
}

function parseDate(dateStr: string): Timestamp | null {
  if (!dateStr) return null;
  const [month, day, year] = dateStr.split('/').map(Number);
  if (!month || !day || !year) return null;
  return Timestamp.fromDate(new Date(year, month - 1, day));
}

async function fetchFromRebrickable(setNumber: string): Promise<{
  theme: string | null;
  subtheme: string | null;
  imageUrl: string | null;
  pieceCount: number | null;
  year: number | null;
} | null> {
  const apiKey = process.env.NEXT_PUBLIC_REBRICKABLE_API_KEY;
  if (!apiKey) return null;

  const normalizedNumber = setNumber.includes('-') ? setNumber : `${setNumber}-1`;

  try {
    const response = await fetch(
      `https://rebrickable.com/api/v3/lego/sets/${normalizedNumber}/`,
      { headers: { Authorization: `key ${apiKey}` } }
    );
    if (!response.ok) return null;
    const data = await response.json();

    let theme: string | null = null;
    let subtheme: string | null = null;

    if (data.theme_id) {
      const themeRes = await fetch(
        `https://rebrickable.com/api/v3/lego/themes/${data.theme_id}/`,
        { headers: { Authorization: `key ${apiKey}` } }
      );
      if (themeRes.ok) {
        const themeData = await themeRes.json();
        if (themeData.parent_id) {
          const parentRes = await fetch(
            `https://rebrickable.com/api/v3/lego/themes/${themeData.parent_id}/`,
            { headers: { Authorization: `key ${apiKey}` } }
          );
          if (parentRes.ok) {
            const parentData = await parentRes.json();
            theme = parentData.name;
            subtheme = themeData.name;
          }
        } else {
          theme = themeData.name;
        }
      }
    }

    return { theme, subtheme, imageUrl: data.set_img_url, pieceCount: data.num_parts, year: data.year };
  } catch {
    return null;
  }
}

interface MigrationResult {
  setNumber: string;
  name: string;
  success: boolean;
  error?: string;
}

export default function MigratePage(): React.JSX.Element {
  const { user } = useAuth();
  const { activeCollection } = useCollection();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentSet, setCurrentSet] = useState('');
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [done, setDone] = useState(false);

  const runMigration = async () => {
    if (!activeCollection || !user) return;

    setIsRunning(true);
    setResults([]);
    setDone(false);

    const rows = parseCSV(CSV_DATA);
    setTotal(rows.length);

    const db = getFirestore(getFirebaseApp());
    const setsCollection = collection(db, 'sets');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const setNumber = row['Set Number'];
      const name = row['Name'];

      setProgress(i + 1);
      setCurrentSet(`${setNumber} - ${name}`);

      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        const rebrickableData = await fetchFromRebrickable(setNumber);

        const setData: Record<string, unknown> = {
          collectionId: activeCollection.id,
          setNumber,
          name,
          pieceCount: rebrickableData?.pieceCount ?? (row['Pieces'] ? parseInt(row['Pieces'], 10) : null),
          year: rebrickableData?.year ?? null,
          theme: rebrickableData?.theme ?? null,
          subtheme: rebrickableData?.subtheme ?? null,
          imageUrl: rebrickableData?.imageUrl ?? null,
          status: STATUS_MAP[row['Status']] || 'unopened',
          hasBeenAssembled: row['Has Been Assembled'] === 'Yes',
          occasion: row['Occasion'] || '',
          dateReceived: parseDate(row['Date Received']),
          owner: row['Primary Owner'] || '',
          dataSource: 'rebrickable',
          dataSourceId: setNumber.includes('-') ? setNumber : `${setNumber}-1`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const cleanData = Object.fromEntries(
          Object.entries(setData).filter(([, v]) => v !== undefined && v !== null)
        );

        await addDoc(setsCollection, cleanData);
        setResults(prev => [...prev, { setNumber, name, success: true }]);
      } catch (error) {
        setResults(prev => [...prev, {
          setNumber,
          name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }

    setIsRunning(false);
    setDone(true);
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <h1>Migration</h1>
        <p>Please log in first.</p>
      </div>
    );
  }

  if (!activeCollection) {
    return (
      <div className={styles.container}>
        <h1>Migration</h1>
        <p>Please create a collection first, then return here.</p>
        <a href="/collection">Go to Collection</a>
      </div>
    );
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div className={styles.container}>
      <h1>Notion Migration</h1>
      <p>Collection: <strong>{activeCollection.name}</strong></p>
      <p>This will import 76 sets from your Notion export.</p>

      {!isRunning && !done && (
        <button onClick={runMigration} className={styles.button}>
          Start Migration
        </button>
      )}

      {isRunning && (
        <div className={styles.progress}>
          <p>Progress: {progress} / {total}</p>
          <p>Current: {currentSet}</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {done && (
        <div className={styles.summary}>
          <h2>Migration Complete!</h2>
          <p>Success: {successCount}</p>
          <p>Errors: {errorCount}</p>
          <a href="/collection" className={styles.button}>Go to Collection</a>
        </div>
      )}

      {results.length > 0 && (
        <div className={styles.results}>
          <h3>Results:</h3>
          <ul>
            {results.slice(-10).map((r, i) => (
              <li key={i} className={r.success ? styles.success : styles.error}>
                {r.success ? '✓' : '✗'} {r.setNumber} - {r.name}
                {r.error && <span> ({r.error})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
