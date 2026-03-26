import { initDb } from '../src/lib/db';

async function main() {
  console.log('Seeding database...');
  await initDb();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
