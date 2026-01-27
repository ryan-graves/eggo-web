import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// CSV data from Notion export
const CSV_DATA = `Name,Date Received,Has Been Assembled,Occasion,Pieces,Primary Owner,Set Number,Status,Tags
Assembly Square,08/29/2022,No,Birthday 2022 from Ryan,4002,Alyssa Graves,10255,Unopened box,"Creator, Expert"
Lucky Bamboo,12/24/2025,No,Christmas 2025 from Kristin,325,Ryan Graves,10344,Unopened box,Botanical
Plum Blossom,08/18/2024,No,Pregnancy / Birthday 2024 from Kay,327,Alyssa Graves,10369,Unopened box,"Botanical, Icons"
Central Perk,12/25/2021,No,Christmas 2021 from Ryan,1070,Alyssa Graves,21319,Unopened box,Ideas
Motorized Lighthouse,12/25/2023,No,Christmas 2023 from Alyssa,2065,Ryan Graves,21335,Unopened box,Ideas
The Office,10/07/2022,No,Just because,1165,Ryan Graves,21336,Unopened box,Ideas
Tales of the Space Age,05/18/2023,No,Just because,688,Ryan Graves,21340,Unopened box,Ideas
Disney Pixar Luxo Jr.,06/04/2025,No,Just Because,613,Ryan Graves,21357,Unopened box,Ideas
AT-ST,05/01/2022,No,Add-on with dioramas,79,Ryan Graves,30495,Unopened box,Star Wars
Surfer Beach House,12/25/2021,No,"Christmas 2021 from James, Leila, Lewis and Eliot",564,Alyssa Graves,31118,Unopened box,"3-in-1, Creator"
Goldfish,12/25/2022,No,Christmas 2022 from Alyssa,186,Ryan Graves,40442,Unopened box,
Mystic Witch,11/06/2022,No,add-on with AT-AT purchase,257,,40562,Unopened box,"3-in-1, Creator"
Cherry Blossoms,08/18/2024,No,Pregnancy / Birthday 2024 from Kay,438,Alyssa Graves,40725,Unopened box,"Botanical, Creator"
Pizza Van,12/25/2020,No,Christmas 2020 from James & Leila,249,Alyssa Graves,60150,Unopened box,City
Y-wing Starfighter,12/25/2017,No,Christmas 2017 from grandma,691,Ryan Graves,75172,Unopened box,Star Wars
Action Battle Endor Assault,,No,,193,Ryan Graves,75238,Unopened box,Star Wars
Luke Skywalker's Landspeeder,12/25/2021,No,Christmas 2021 from ?,236,Ryan Graves,75271,Unopened box,Star Wars
Armored Assault Tank (AAT),12/25/2021,No,Christmas 2021 from Ryan,286,Alyssa Graves,75283,Unopened box,Star Wars
Mos Eisley Cantina,03/08/2023,No,Just because,3187,Ryan Graves,75290,Unopened box,Star Wars
Duel on Mandalore,07/30/2022,No,"From Ryan, Just because",147,Alyssa Graves,75310,Unopened box,Star Wars
AT-AT,11/06/2022,No,7th anniversary,6785,Ryan Graves,75313,Unopened box,"Star Wars, UCS"
Dark Trooper Attack,12/25/2022,No,Christmas 2022 from Alyssa's parents,166,Ryan Graves,75324,Unopened box,Star Wars
Dagobah Jedi Training Diorama,05/01/2022,No,Just because,1000,Ryan Graves,75330,Unopened box,"Diorama, Star Wars"
Death Star Trash Compactor Diorama,05/01/2022,No,Just because,802,Ryan Graves,75339,Unopened box,"Diorama, Star Wars"
TIE Bomber,12/25/2024,No,Christmas 2024 from James & Leila,625,Ryan Graves,75347,Unopened box,Star Wars
Emperor's Throne Room Diorama,05/06/2023,No,May the Fourth 2023,807,Ryan Graves,75352,Unopened box,"Diorama, Star Wars"
Endor Speeder Chase Diorama,05/06/2023,No,May the Fourth 2023,608,Ryan Graves,75353,Unopened box,"Diorama, Star Wars"
Millenium Falcon,12/24/2024,No,Christmas 2024 from Ryan's parents,921,Ryan Graves,75375,Unopened box,Star Wars
Tantive IV,05/04/2024,No,May the Fourth 2024,654,Ryan Graves,75376,Unopened box,Star Wars
Mos Espa Podrace Diorama,05/04/2024,No,May the Fourth 2024,718,Ryan Graves,75380,Unopened box,"Diorama, Star Wars"
Ahsoka Tano's Duel on Peridea,10/16/2025,No,Just because,382,Ryan Graves,75385,Unopened box,Star Wars
Desert Skiff & Sarlacc Pit,10/17/2025,No,Just Because,558,Ryan Graves,75396,Unopened box,Star Wars
1974 Porsche 911 Turbo 3.0,,No,,180,Ryan Graves,75895,Unopened box,Speed Champions
Palace Cinema,,Yes,,2196,Alyssa Graves,10232,Rebuild in progress,"Creator, Expert"
Death Star II,05/06/2023,No,Add-on with X-wing Purchase,289,Ryan Graves,40591,In progress,Star Wars
Boba Fett Helmet,10/10/2020,No,Birthday 2020 from Alyssa,625,Ryan Graves,75277,In progress,Star Wars
X-wing Starfighter,05/06/2023,No,Just because,1949,Ryan Graves,75355,In progress,"Star Wars, UCS"
Mindstorms NXT 2.0,10/10/2014,Yes,Christmas 2014,619,Ryan Graves,8547,Disassembled,Mindstorms
Pet Shop,02/20/2017,Yes,Valentine's Day 2017,2032,Alyssa Graves,10218,Disassembled,"Creator, Expert"
Brick Bank,08/29/2017,Yes,Birthday 2017,2380,Alyssa Graves,10251,Disassembled,"Creator, Expert"
Bookshop,08/29/2020,Yes,Birthday 2020 from Ryan,2504,Alyssa Graves,10270,Disassembled,"Creator, Expert"
The Eiffel Tower,02/14/2014,Yes,Valentine's Day 2014 from Ryan,321,Alyssa Graves,21019,Disassembled,"Architecture, Landmarks"
Louvre,12/25/2016,Yes,Christmas 2016 from Ryan,695,Alyssa Graves,21024,Disassembled,"Architecture, Landmarks"
Chicago,12/25/2018,Yes,Christmas 2018 from Ryan,444,Alyssa Graves,21033,Disassembled,"Architecture, Skylines"
Townhouse Pet Shop & Cafe,08/29/2019,Yes,Birthday 2019 from Ryan,969,Alyssa Graves,31097,Disassembled,"3-in-1, Creator"
AT-RT,01/17/2014,Yes,Our first date,222,Ryan Graves,75002,Disassembled,Star Wars
Jedi Interceptor,,Yes,,223,Ryan Graves,75038,Disassembled,Star Wars
AT-AT,05/02/2015,Yes,Engagement (May 2015),1137,Ryan Graves,75054,Disassembled,Star Wars
T-16 Skyhopper,10/10/2015,Yes,Birthday 2015,247,Ryan Graves,75081,Disassembled,Star Wars
Imperial Shuttle Tydirium,02/14/2016,Yes,Valentine's Day 2016,937,Ryan Graves,75094,Disassembled,Star Wars
Rey's Speeder,12/25/2015,Yes,Christmas 2015,193,Alyssa Graves,75099,Disassembled,Star Wars
Poe's X-wing Fighter,08/29/2016,Yes,Alyssa's Birthday 2016,717,Alyssa Graves,75102,Disassembled,Star Wars
Eclipse Fighter,10/10/2016,Yes,Birthday 2016,363,Ryan Graves,75145,Disassembled,Star Wars
Imperial Assault Hovertank,12/25/2017,Yes,Christmas 2017 from James & Leila,385,Ryan Graves,75152,Disassembled,Star Wars
AT-ST Walker,10/10/2017,Yes,Birthday 2017,449,Ryan Graves,75153,Disassembled,Star Wars
Rebel U-wing Fighter,11/06/2016,Yes,1-Year Anniversary,659,Ryan Graves,75155,Disassembled,Star Wars
Kylo Ren's Tie Fighter,12/25/2017,Yes,,630,Ryan Graves,75179,Disassembled,Star Wars
Darth Vader Transformation,12/25/2017,Yes,Christmas 2017 from Alyssa,282,Ryan Graves,75183,Disassembled,Star Wars
Millenium Falcon,12/25/2017,Yes,Christmas 2017 gift to ourselves,7541,Ryan Graves,75192,Disassembled,"Star Wars, UCS"
Bouquet,,Yes,,756,Alyssa Graves,10280,Assembled,"Botanical, Creator"
Back to the Future Time Machine,10/10/2022,Yes,Birthday 2022 from Alyssa,1872,Ryan Graves,10300,Assembled,Icons
Succulents,11/28/2022,Yes,Just because,771,Ryan Graves,10309,Assembled,Botanical
Chrysanthemum,08/18/2024,Yes,Pregnancy / Birthday 2024 from Kay,278,Alyssa Graves,10368,Assembled,"Botanical, Icons"
X-wing Starfighter,05/06/2023,Yes,Add-on with X-wing purchase,87,Ryan Graves,30654,Assembled,Star Wars
AAT,05/04/2024,Yes,May the Fourth 2024,75,Ryan Graves,30680,Assembled,Star Wars
Lars Family Homestead,05/01/2022,Yes,add-on with lego diaoramas,195,Ryan Graves,40531,Assembled,Star Wars
Spring Fun VIP Add-On Pack,05/06/2023,Yes,Add-on with X-wing purchase,128,Alyssa Graves,40606,Assembled,Miscellaneous
Game Boy,10/03/2025,Yes,Just because,421,Ryan Graves,72046,Assembled,Super Mario
Carbon-Freezing Chamber,01/13/2019,Yes,Just because,231,Ryan Graves,75137,Assembled,Star Wars
Millennium Falcon Microfighter,12/25/2020,Yes,,92,Ryan Graves,75193,Assembled,"Microfighters, Star Wars"
First Order TIE Fighter Microfighter,12/25/2020,Yes,,91,Ryan Graves,75194,Assembled,"Microfighters, Star Wars"
Ahch-To Island Training,12/25/2019,Yes,,241,Ryan Graves,75200,Assembled,Star Wars
Escape Pod vs. Dewback Microfighters,,Yes,,177,Ryan Graves,75228,Assembled,Star Wars
Resistance A-wing Starfighter,12/25/2021,Yes,Christmas 2021 from Alyssa's parents,269,Ryan Graves,75248,Assembled,Star Wars
Anakin's Podracer - 20th Anniversary Edition,12/25/2021,Yes,christmas 2021 from Alyssa,279,Alyssa Graves,75258,Assembled,Star Wars
Obi-Wan's Hut,12/25/2020,Yes,,200,Ryan Graves,75270,Assembled,Star Wars
Bespin Duel,05/15/2022,Yes,just because,295,Ryan Graves,75294,Assembled,Star Wars
Boba Fett's Starship,12/25/2021,Yes,"Christmas 2021 from James, Leila, Lewis, and Eliot",593,Ryan Graves,75312,Assembled,Star Wars
The Mandalorian's N-1 Starfighter,12/25/2022,Yes,Christmas 2022 from James & Leila,412,Ryan Graves,75325,Assembled,Star Wars
Death Star Trench Run Diorama,05/01/2022,Yes,Just because,665,Ryan Graves,75329,Assembled,"Diorama, Star Wars"
Brick-Built Star Wars Logo,12/25/2025,Yes,Christmas 2025 from Alyssa's parents,700,Ryan Graves,75407,Assembled,Star Wars
McLaren Senna,12/25/2020,Yes,Christmas 2020 from James & Leila,218,Ryan Graves,75892,Assembled,Speed Champions`;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const STATUS_MAP: Record<string, string> = {
  'Unopened box': 'unopened',
  'In progress': 'in_progress',
  'Rebuild in progress': 'rebuild_in_progress',
  'Assembled': 'assembled',
  'Disassembled': 'disassembled',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
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

function extractOwnerName(ownerField: string): string {
  if (!ownerField) return '';
  const match = ownerField.match(/^([^(]+)/);
  return match ? match[1].trim() : ownerField.trim();
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

    return {
      theme,
      subtheme,
      imageUrl: data.set_img_url,
      pieceCount: data.num_parts,
      year: data.year,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get('collectionId');
  const secret = searchParams.get('secret');

  // Simple protection - require a secret
  if (secret !== 'migrate-eggo-2024') {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!collectionId) {
    return NextResponse.json({ error: 'Missing collectionId parameter' }, { status: 400 });
  }

  try {
    // Initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);
    const setsCollection = collection(db, 'sets');

    const rows = parseCSV(CSV_DATA);
    const results: { setNumber: string; name: string; success: boolean; error?: string }[] = [];

    for (const row of rows) {
      const setNumber = row['Set Number'];
      const name = row['Name'];

      try {
        // Fetch from Rebrickable (with small delay to avoid rate limits)
        await new Promise(resolve => setTimeout(resolve, 300));
        const rebrickableData = await fetchFromRebrickable(setNumber);

        const setData: Record<string, unknown> = {
          collectionId,
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
          owner: extractOwnerName(row['Primary Owner']),
          dataSource: 'rebrickable',
          dataSourceId: setNumber.includes('-') ? setNumber : `${setNumber}-1`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Remove null/undefined values
        const cleanData = Object.fromEntries(
          Object.entries(setData).filter(([, v]) => v !== undefined && v !== null)
        );

        await addDoc(setsCollection, cleanData);
        results.push({ setNumber, name, success: true });
      } catch (error) {
        results.push({
          setNumber,
          name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: 'Migration complete',
      total: rows.length,
      success: successCount,
      errors: errorCount,
      results,
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
