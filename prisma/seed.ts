import { ensureSeedData } from "../src/lib/seed";

async function main() {
  await ensureSeedData();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
