import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def get_encryption_key() -> bytes:
    """
    Derive a 32-byte AES key from the config CREDENTIAL_ENCRYPTION_KEY using SHA-256.
    Ensures that any configured string resolves to a valid key length.
    """
    key_material = settings.CREDENTIAL_ENCRYPTION_KEY.encode("utf-8")
    return hashlib.sha256(key_material).digest()

def encrypt_data(plaintext: str) -> str:
    """
    Encrypt plaintext string using AES-256-GCM.
    Returns a URL-safe base64 string combining the 12-byte nonce and ciphertext.
    """
    if not plaintext:
        return ""
    
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    
    # 12-byte nonce for GCM
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    
    # Combine nonce and ciphertext and encode
    combined = nonce + ciphertext
    return base64.urlsafe_b64encode(combined).decode("utf-8")

def decrypt_data(ciphertext_b64: str) -> str:
    """
    Decrypt base64 ciphertext string using AES-256-GCM.
    Returns the original plaintext string.
    """
    if not ciphertext_b64:
        return ""
        
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    
    try:
        combined = base64.urlsafe_b64decode(ciphertext_b64.encode("utf-8"))
        if len(combined) < 12:
            raise ValueError("Ciphertext too short.")
            
        nonce = combined[:12]
        ciphertext = combined[12:]
        
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception as e:
        raise ValueError("Decryption failed. Invalid key or corrupted payload.") from e
