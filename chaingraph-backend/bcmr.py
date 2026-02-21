import httpx

URL = "https://bcmr.paytaca.com/api"

async def get_token(token_id):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{URL}/token/{token_id}")
        if r.status_code == 200:
            return r.json()
        return None
