import httpx

RPC_URL = "https://bch-rpc.example.com"

async def get_tx(txid):
    async with httpx.AsyncClient() as client:
        r = await client.post(RPC_URL, json={
            "method": "getrawtransaction",
            "params": [txid, True],
            "id": 1
        })
        return r.json()["result"]

async def trace_tx(txid, depth=0, max_depth=3):
    if depth > max_depth:
        return {}

    tx = await get_tx(txid)

    children = []
    for vout in tx["vout"]:
        if "addresses" in vout["scriptPubKey"]:
            addr = vout["scriptPubKey"]["addresses"][0]
            children.append({
                "address": addr,
                "value": vout["value"]
            })

    return {
        "txid": txid,
        "outputs": children
    }
