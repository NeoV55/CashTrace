import httpx

URL = "https://demo.chaingraph.cash/v1/graphql"

async def query(q, variables=None):
    async with httpx.AsyncClient(timeout=20, verify=False) as client:
        r = await client.post(URL, json={"query": q, "variables": variables})

        j = r.json()

        if "errors" in j:
            raise Exception(f"GraphQL Error: {j['errors']}")

        if "data" not in j:
            raise Exception(f"Invalid response: {j}")

        return j["data"]
