from fastapi import FastAPI
from crawler import crawl
from crawler import get_utxos


app = FastAPI()

@app.get("/trace/{txid}")
async def trace(txid: str):
    return await crawl(txid)

@app.get("/address/{addr}")
async def trace_address(addr: str):
    return await get_utxos(addr)
