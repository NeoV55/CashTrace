import { Contract, ElectrumNetworkProvider } from 'cashscript';
import fs from 'fs';

async function main() {
  const provider = new ElectrumNetworkProvider('chipnet');

  // Use fs to bypass ESM import wrapping issues
  const artifact = JSON.parse(fs.readFileSync('./oracle.json', 'utf8'));
  const contract = new Contract(artifact, [], { provider });

  console.log("--- Oracle Deployment Info ---");
  console.log("Address: ", contract.address);

  // Check if library recognized the 'submit' function
  const availableFunctions = Object.keys(contract.unlock || {});
  console.log("Available Functions:", availableFunctions);

  const utxos = await contract.getUtxos();
  console.log("Current UTXO count:", utxos.length);

  if (utxos.length === 0) {
    console.log("\nACTION REQUIRED:");
    console.log(`Send about 10,000 - 50,000 sats to ${contract.address} to begin.`);
  }
}

main().catch(console.error);