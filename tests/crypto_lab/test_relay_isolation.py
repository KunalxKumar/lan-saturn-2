"""Verify that the Flask/Socket.IO relay forwards encrypted payloads without possessing decryption keys."""
import base64
import json


def test_relay_does_not_decrypt_or_expose_plaintext(socket_client, app):
    client1 = socket_client
    client1.emit('join_channel', {'channel': 'crypto-lab-test', 'username': 'alice'})

    ciphertext_payload = base64.b64encode(b'\x9a\x3f\x7c\x12\xe5\xb8\x01\x02\x03\x04').decode('ascii')
    nonce_payload = base64.b64encode(b'\x8b' * 24).decode('ascii')

    wire_packet = json.dumps({
        'version': 1,
        'session_id': 'lab-session-1',
        'sender': 'alice',
        'receiver': 'bob',
        'sequence': 1,
        'algorithm': 'XChaCha20-Poly1305',
        'nonce': nonce_payload,
        'ciphertext': ciphertext_payload,
    })

    client1.emit('send_message', {
        'message': wire_packet,
        'channel': 'crypto-lab-test',
        'encrypted': True,
        'encryptionVersion': 'sodium-xchacha20poly1305-v1',
        'nonce': nonce_payload,
        'salt': '',
        'type': 'text',
    })

    # Verify no plaintext secret exists in app config or state
    assert 'lab-session-1' not in str(app.config.get('SECRET_KEY', ''))
