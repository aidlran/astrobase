import { NodeCryptModule, NodeCryptAlgs } from './node.js';
import { testCryptSupport } from './testing/test-support.js';

const tests = (
  process.versions.bun
    ? NodeCryptAlgs.filter((alg) => alg !== 'ChaCha20-Poly1305' && alg !== 'AES-OCB')
    : NodeCryptAlgs
).map((encAlg) => ({ encAlg, nonceLength: 12 }));

testCryptSupport('Node', NodeCryptModule, tests);
