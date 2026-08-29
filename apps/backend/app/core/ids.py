import secrets

def generate_id(prefix: str) -> str:
    """
    Generates a secure random prefix-based ID, e.g. usr_a3f4e2...
    """
    # 8 bytes of entropy = 16 hex characters
    return f"{prefix}_{secrets.token_hex(8)}"
