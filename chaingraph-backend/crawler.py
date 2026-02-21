from chaingraph import query
from heuristics import detect_patterns
from utils import address_to_script


TX_QUERY = """
query($tx: bytea!) {
  transaction(where:{hash:{_eq:$tx}}){
    hash
    outputs{
      output_index
      value_satoshis
      locking_bytecode
      spent_by{
        transaction_hash
      }
    }
  }
}
"""

SPEND_QUERY = """
query($tx:String!,$idx:Int!){
  inputs(where:{
    spentTransactionHash:{_eq:$tx},
    spentOutputIndex:{_eq:$idx}
  }){
    transaction{
      hash
    }
  }
}
"""

UTXO_QUERY = """
query($script: bytea!){
  output(
    where:{
      locking_bytecode:{_eq:$script}
      spent_by:{transaction_hash:{_is_null:true}}
    }
  ){
    transaction_hash
    output_index
    value_satoshis
  }
}
"""

async def get_utxos(address: str):
    script = address_to_script(address)
    data = await query(UTXO_QUERY, {"script": script})
    return data["data"]["output"]


async def get_tx(txid):
    if not txid.startswith("\\x"):
        txid = "\\x" + txid

    data = await query(TX_QUERY, {"tx": txid})

    txs = data["transactions"]
    if not txs:
        raise Exception("Transaction not found")

    return txs[0]

async def find_spender(txid, idx):
    data = await query(SPEND_QUERY, {"tx": txid, "idx": idx})

    inputs = data["inputs"]
    if not inputs:
        return None

    return inputs[0]["transaction"]["hash"]


async def crawl(txid, depth=0, max_depth=5):
    if depth > max_depth:
        return None

    tx = await get_tx(txid)

    node = {
        "id": txid,
        "outputs": [],
        "label": detect_patterns(tx)
    }

    for o in tx["outputs"]:

        child = await find_spender(txid, o["index"])

        node["outputs"].append({
            "address": o["address"],
            "value": o["value"],
            "next": child
        })

    node["children"] = []

    for o in node["outputs"]:
        if o["next"]:
            c = await crawl(o["next"], depth+1)
            if c:
                node["children"].append(c)

    return node
