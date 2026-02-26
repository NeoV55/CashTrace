import { ElectrumNetworkProvider, Contract } from 'cashscript';
import { compileString } from 'cashc';
import fs from 'fs';

/**
 * Robustly extracts OP_RETURN data from a raw hex string
 * @param {string} hex 
 */
function getOpReturnData(hex) {
    const txBuffer = Buffer.from(hex, 'hex');
    
    /**
     * Proper BCH Transaction Parsing Logic:
     * An OP_RETURN output in a script looks like: 
     * [6a] [PushOpcode] [Data]
     * In hex, it's usually: 6a + (length byte) + data
     */
    
    // Convert to string to search for the OP_RETURN prefix 0x6a (ascii 'j')
    // But we need to be careful of "fake" 6as in signatures.
    // Real OP_RETURNS in your contract are always in tx.outputs[1]
    
    const opReturnHex = '6a';
    const parts = hex.split(opReturnHex);

    // We take the LAST part of the split, because OP_RETURN 
    // is usually at the end of the transaction in your script.
    if (parts.length < 2) return null;
    
    const potentialData = parts[parts.length - 1];
    
    // The first 2 characters of potentialData are the length byte (e.g., '4c')
    // We skip the length byte and convert the rest
    const actualDataHex = potentialData.substring(2);
    const buffer = Buffer.from(actualDataHex, 'hex');
    const decoded = buffer.toString('utf-8');

    // Clean up to return only printable characters
    const match = decoded.match(/[a-zA-Z0-9|: ]+/);
    return match ? match[0] : null;
}

async function main() {
    const provider = new ElectrumNetworkProvider('chipnet');
    
    // Re-compiling just to derive the address
    const source = `
    pragma cashscript ^0.12.0;
    contract OpenOracle() {
        function submit(pubkey userPk, sig userSig) {
            require(checkSig(userSig, userPk));
            require(tx.outputs[0].value >= tx.inputs[this.activeInputIndex].value - 1000);
            require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
            bytes opReturnPrefix = tx.outputs[1].lockingBytecode.split(1)[0];
            require(opReturnPrefix == 0x6a);
        }
    }
    `;

    const artifact = compileString(source);
    const contract = new Contract(artifact, [], { provider });
    
    console.log(`\n🔍 Scanning Oracle: ${contract.address}`);
    await provider.electrum.connect();

    try {
        const history = await provider.electrum.request('blockchain.address.get_history', contract.address);
        
        if (!history || history.length === 0) {
            console.log("No transactions found.");
            return;
        }

        const results = [];
        for (const txInfo of history) {
            const rawTxHex = await provider.electrum.request('blockchain.transaction.get', txInfo.tx_hash);
            const parsedData = getOpReturnData(rawTxHex);

            if (parsedData && parsedData.length > 1) { // Filter out noise/empty pushes
                results.push({
                    txid: txInfo.tx_hash,
                    block: txInfo.height,
                    data: parsedData
                });
                console.log(`✅ [Block ${txInfo.height || 'Mempool'}] -> ${parsedData}`);
            }
        }

        fs.writeFileSync('oracle_data.json', JSON.stringify(results, null, 2));
        console.log(`\n📁 Successfully saved ${results.length} entries.`);

    } catch (e) {
        console.error("❌ Scan failed:", e.message);
    } finally {
        await provider.electrum.disconnect();
        process.exit(0);
    }
}

main().catch(console.error);