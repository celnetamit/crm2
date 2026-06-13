import "dotenv/config";
import { getEmailConfigurationStatus, verifyEmailConfiguration } from "../src/lib/email";

async function main() {
  const status = getEmailConfigurationStatus();
  const verified = await verifyEmailConfiguration();

  console.log(`Provider: ${verified.provider}`);
  console.log(`Mode: ${verified.mode}`);
  console.log(`Ready: ${verified.ready ? "yes" : "no"}`);
  console.log(`Message: ${verified.message}`);

  if (!status.ready || !verified.ready) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
