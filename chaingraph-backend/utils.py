from cashaddress import convert

_script_cache = {}

def address_to_script(addr: str) -> str:
    if addr in _script_cache:
        return _script_cache[addr]

    conv = convert.Address.from_string(addr)
    pubkey_hash = bytes(conv.payload)

    script = (
        b'\x76' +
        b'\xa9' +
        b'\x14' +
        pubkey_hash +
        b'\x88' +
        b'\xac'
    )

    result = "\\x" + script.hex()
    _script_cache[addr] = result
    return result
