import { Contract, SignatureTemplate, ElectrumNetworkProvider, TransactionBuilder } from 'cashscript';
import { compileString } from 'cashc';

async function main() {
    // 1. Setup Provider (Chipnet)
    const provider = new ElectrumNetworkProvider('chipnet');

    // 2. Contract Source Code
    const source = `
    pragma cashscript ^0.12.0;
    contract OpenOracle() {
        function submit(pubkey userPk, sig userSig) {
            require(checkSig(userSig, userPk));
            // Sustainability: Check output 0 value remains within 1000 sats of input
            require(tx.outputs[0].value >= tx.inputs[this.activeInputIndex].value - 1000);
            // Covenant: Check output 0 locking bytecode matches current contract
            require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
            // Metadata: Ensure output 1 is an OP_RETURN (0x6a)
            bytes opReturnPrefix = tx.outputs[1].lockingBytecode.split(1)[0];
            require(opReturnPrefix == 0x6a);
        }
    }
    `;

    // 3. Compile in-memory
    console.log("Compiling contract...");
    const artifact = compileString(source);

    if (!artifact.abi || artifact.abi.length === 0) {
        throw new Error("Compilation failed: ABI is empty.");
    }

    const contract = new Contract(artifact, [], { provider });
    console.log("Contract Address:", contract.address);

    // 4. Setup Signer (Private Key)
    const wif = ''; // Replace with your WIF private key
    const sig = new SignatureTemplate(wif);

    // 5. Check UTXOs
    const utxos = await contract.getUtxos();
    if (utxos.length === 0) {
        console.log(`\n[!] Address empty: ${contract.address}`);
        console.log("Please fund the address with Chipnet BCH and try again.");
        return;
    }

    const contractUtxo = utxos[0];
    const text = "ADDR|bitcoincash:qexample|1700000000";

    try {
        console.log(`Using UTXO: ${contractUtxo.txid} (${contractUtxo.satoshis} sats)`);

        const feeBuffer = 1000n;
        const outputValue = contractUtxo.satoshis - feeBuffer;

        if (outputValue < 546n) {
            throw new Error("Insufficient funds for fee and dust limit.");
        }

        console.log("Submitting transaction (TransactionBuilder)...");

        // We use 'hex' as the second argument if the library version supports it, 
        // OR we just pass the hex string directly.
        const hexText = Buffer.from(text).toString('hex');

        const tx = await new TransactionBuilder({ provider })
            .addInput(contractUtxo, contract.unlock.submit(sig.getPublicKey(), sig))
            .addOutput({ to: contract.address, amount: outputValue })
            .addOpReturnOutput([hexText]) // Pass the hex string
            .send();

        console.log("\n✅ Transaction Success!");
        console.log("TXID:", tx.txid);
        console.log(`Explorer: https://chipnet.imaginary.cash/tx/${tx.txid}`);

    } catch (e) {
        console.error("\n❌ Submission failed:", e.message);
        if (e.message.includes('replace')) {
            console.log("⚠️ This looks like a library string bug. Try using hex strings for OP_RETURN.");
        }
    }
}

main().catch(console.error);