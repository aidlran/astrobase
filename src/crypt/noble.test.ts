import { chacha20poly1305, xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { NobleCrypt } from './noble.js';
import { testCryptSupport } from './testing/test-support.js';

testCryptSupport('@noble/ciphers - ChaCha20-Poly1305', NobleCrypt(chacha20poly1305), [
  { encAlg: 'ChaCha20-Poly1305', nonceLength: 12 },
]);

testCryptSupport('@noble/ciphers - XChaCha20-Poly1305', NobleCrypt(xchacha20poly1305), [
  { encAlg: 'XChaCha20-Poly1305', nonceLength: 24 },
]);
