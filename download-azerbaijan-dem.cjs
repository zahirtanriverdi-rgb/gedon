const fs = require('fs');
const path = require('path');
const https = require('https');

// AWS-in ictimai terrarium bazasından yükləyirik (Heç bir API açarı lazım deyil)
const baseUrl = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const outputDir = path.join(__dirname, 'public', 'tiles', 'terrain-dem');

// Azərbaycan koordinatları (Zirvələr ətrafı)
const tiles = [
  { z: 12, x: 2548, y: 1391 },
  { z: 12, x: 2549, y: 1391 },
  { z: 12, x: 2548, y: 1392 },
  { z: 12, x: 2549, y: 1392 }
];

async function downloadTile(tile) {
  const dir = path.join(outputDir, `${tile.z}`, `${tile.x}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${tile.y}.png`);
  const url = `${baseUrl}/${tile.z}/${tile.x}/${tile.y}.png`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => resolve(true));
      } else {
        console.log(`Xəta: ${tile.x}/${tile.y} yüklənə bilmədi.`);
        resolve(false);
      }
    });
  });
}

async function run() {
  for (const tile of tiles) {
    console.log(`Yüklənir: ${tile.z}/${tile.x}/${tile.y}`);
    await downloadTile(tile);
  }
}

run();