import { describe, expect, it } from 'vitest';
import {
    ENCRYPTION_SEQUENCE_STEPS,
    countDifferentHexNibbles,
    sha256Hex,
} from '../../src/crypto-lab/hashing';

describe('SHA-256 Hashing Laboratory & 9-Stage Animation', () => {
    it('matches official NIST SHA-256 test vectors', async () => {
        expect(await sha256Hex('')).toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
        expect(await sha256Hex('abc')).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
        );
        expect(
            await sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')
        ).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    });

    it('demonstrates avalanche effect on a 1-character modification', async () => {
        const h1 = await sha256Hex('Transfer $100 to Bob');
        const h2 = await sha256Hex('Transfer $900 to Bob');
        expect(h1).not.toBe(h2);
        expect(countDifferentHexNibbles(h1, h2)).toBeGreaterThan(40);
    });

    it('defines all 9 educational encryption sequence stages with complete metadata', () => {
        expect(ENCRYPTION_SEQUENCE_STEPS).toHaveLength(9);
        for (const step of ENCRYPTION_SEQUENCE_STEPS) {
            expect(step.operation.length).toBeGreaterThan(0);
            expect(step.primitive.length).toBeGreaterThan(0);
            expect(step.why.length).toBeGreaterThan(0);
            expect(step.attackerView.length).toBeGreaterThan(0);
            expect(step.securityProperty.length).toBeGreaterThan(0);
        }
    });
});
