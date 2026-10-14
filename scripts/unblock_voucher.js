const fs = require('fs');
const path = require('path');
const { MongoClient } = require('f:/ff/free-fire-top-up-boot-with-dashboard/node_modules/mongodb');

async function main() {
  const envContent = fs.readFileSync('f:/ff/free-fire-top-up-boot-with-dashboard/.env.local', 'utf8');
  let mongoUri = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('MONGODB_URI=')) {
      mongoUri = line.substring(line.indexOf('=') + 1).trim();
    }
  }

  if (!mongoUri) {
    console.error('No MONGODB_URI found!');
    return;
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db();
  const vouchers = db.collection('vouchers');

  const result = await vouchers.deleteMany({
    $or: [
      { serial: { $regex: '04215650', $options: 'i' } },
      { code: { $regex: '04215650', $options: 'i' } }
    ]
  });

  console.log('Deleted records count:', result.deletedCount);
  await client.close();
}

main().catch(console.error);
