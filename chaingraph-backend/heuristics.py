def detect_patterns(tx):

    outputs = tx["outputs"]

    # Peel chain heuristic
    if len(outputs) == 2:
        vals = [o["value"] for o in outputs]
        if min(vals) < max(vals) * 0.2:
            return "Likely Automated Transfer"

    # Sink heuristic
    if tx.get("spent_count", 1) == 0:
        return "Cold Storage / Sink"

    return "Normal"
