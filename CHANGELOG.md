# Changelog

## Unreleased

### Breaking Changes

#### Dependency Upgrades

- Upgraded to TypeScript 5.9 and resolved type definition changes.
- Updated peer dependency `@noble/secp256k1` to `^3.0.0`.
- Updated peer dependency `bip32` to `^5.0.0`.

#### BIP39

- Changed `@astrobase/sdk/bip39/wordlist/english` to be JavaScript rather than JSON.

#### Common

- Removed `ECDSA` type wrap from `Common`. Existing projects can add `WithEcdsaWrap` to their
  instance for compatibility.

#### Crypt

- Added support for supplying crypt algorithm implementations via instance config. Add
  `WithWebCryptoCrypt` from `@astrobase/sdk/crypt/web-crypto` to your instance config to restore
  previous behaviour.
- Renamed module import location from `@astrobase/sdk/encrypt` to `@astrobase/sdk/crypt`.
- Renamed the wrap type `encrypt` to `crypt`. `encrypt` still works for compatibility, but migrating
  these to `crypt` is recommended.
- Renamed several symbols:
  - `DEFAULTS` to `CRYPT_DEFAULTS`.
  - `EncryptOptions` to `CryptOptions`.
  - `buildFullOptions` to `cryptOptions`.
  - `sanitizeOptions` to `sanitizeCryptOptions`.
  - `EncryptWrapModule` to `CryptWrapModule`.
- Changed `decrypt` and `encrypt` to return `Uint8Array`.
- Removed `EncryptWrapMetadata`. Use `CryptOptionsSanitized` instead.

#### ECDSA

- Removed `sign` and `verify` functions in favour of the new signatures API.
- `wrap` for `ECDSA` type wraps is no longer supported and will now throw an error. Projects should
  create `sig` type wraps instead, going forward.
- `unwrap` for `ECDSA` still works for compatibility, but will now unwrap as a `sig` type wrap.
  Migrating any existing `ECDSA` type wraps in your data model to `sig` type wraps is recommended.

#### Identity

- The identity scheme now uses and expects a `sig` type wrap including a valid signature, instead of
  an `ECDSA` type wrap.

#### Instance

- Renamed `maps` to `dicts`.

#### KDF

- KDF implementations are now supplied via instance config. To enable KDF functionality, add either
  `WithWebCryptoKDF` from `@astrobase/sdk/kdf/web-crypto` or `WithNodeKDF` from
  `@astrobase/sdk/kdf/node` to your instance config.
- KDF input option `pubKey` was renamed to `publicKey`. Existing `encrypt` (now `crypt`)
  wraps will be affected as they store the `pubKey` field in wrap metadata which is passed verbatim
  to decrypt.

### Deprecated

#### ECDSA

- Marked `@astrobase/sdk/ecdsa` as deprecated.

### Added

#### Common

- Added `sig` type wrap.

#### Crypt

- Added dedicated module for WebCrypto API `@astrobase/sdk/crypt/web-crypto`.
- Added support for `node:crypto` API with `@astrobase/sdk/crypt/node`.
- Added support for `@noble/ciphers` with `@astrobase/sdk/crypt/noble`.

#### ECDSA

- Added `WithEcdsaWrap` to use with `createInstance`.

#### KDF

- Added modules `@astrobase/sdk/kdf/node` & `@astrobase/sdk/kdf/web-crypto`.
- Added support for using a raw input material for KDF.

#### Signatures

- Added modules `@astrobase/sdk/signatures` & `@astrobase/sdk/signatures/ecdsa`.

#### SQLite

- Added support for passing a `Database` instance instead of a config.

#### Wraps

- Added `typeOverride` return option for `WrapFn` which enables a wrap implementation to override
  its type after wrapping or unwrapping.

### Developer

- Migrated to `pnpm`.

## [0.5.0-beta.2](https://github.com/AstrobaseTech/Astrobase/releases/tag/v0.5.0-beta.2) - 2025-06-22

### Added

- **Identity:** Added `getNextIdentity` function.

### Breaking

- **Identity:** Changed the error thrown by `getIdentity` to `RangeError`.
- **Identity:** Changed `bip32` peer dependency version.

### Fixed

- **Identity:** Fixed `putIdentity` not using first available new identity.

## [0.5.0-beta.1](https://github.com/AstrobaseTech/Astrobase/releases/tag/v0.5.0-beta.1) - 2025-06-03

> Big update, added a lot of new functionality and redesigned much of the project. As a result, this
> changelog is probably not exhaustive.

### Breaking

- Changed middleware processing to recurse on arrays and simple objects only.
- Changed middleware processing to skip number and boolean primitive types.
- Removed type parameter from `decodeWithCodec`.
- Removed `LocalFallbackClient`.
- Comments (including JSDoc) are stripped from transpiled JS. They are still available in
  declaration files.
- Renamed `File` to `FileBuilder`.
- Changed File format.
- Changed instance system.
- Changed Content Identifier format to bech32.

### Added

- Added modules `ascii`, `bip39`, `common`, `ecdsa`, `encrypt`, `events`, `fs`, `http/client`,
  `http/server`, `identity`, `in-memory`, `instance`, `keyrings`, `media-types`, `sqlite`, `varint`,
  and `wraps`.
- Added `validateRequest` function for runtime validation of RPC request messages.
- Added request handlers for content procedures.
- Added `MaybePromise` support for `RPCClientStrategy` procedure implementations.
- Added `FileBuilder` instance serialization.

### Fixed

- Fixed `ContentIdentifier` instance serialization.
- Fixed a rogue conditional `&&` where it should have been `||` while checking for null content in
  `getContent`.

## [0.4.0](https://github.com/AstrobaseTech/Astrobase/releases/tag/v0.4.0) - 2024-09-21

### Breaking

- Removed the channels system in favour of more powerful RPC system. IndexedDB and S3 have been
  upgraded to use this system.
- Binary middleware is now scoped only to the JSON codec.
- Renamed `deleteOne`, `getOne`, `putOne` to `deleteContent`, `getContent`, `putContent`
  respectively.
- Separate module for hashes.
- Improvements to make `Registry` construction nicer.

### Added

- Added remote procedure call (RPC) system.
- Added registry for hash functions.
- Add support for codec-scoped middleware.

## [0.3.1](https://github.com/AstrobaseTech/Astrobase/releases/tag/v0.3.1) - 2024-09-11

### Breaking

- Renamed `IdentifierRegistry` to `SchemeRegistry`. `IdentifierRegistry` still works, but is
  deprecated.

### Added

- Added experimental (untested) support for the mutable `ContentIdentifierScheme`.

### Deprecated

- Deprecated usage of `getImmutable` without passing a type parameter.
- Deprecated `IdentifierRegistry` in favour of `SchemeRegistry`.

## [0.3.0](https://github.com/AstrobaseTech/Astrobase/releases/tag/v0.3.0) - 2024-09-10

### Breaking

- Renamed `IdentiferSchema` to `ContentIdentifierScheme`.
- Replaced `Identifier` with `ContentIdentifier`.
  - The constructor now accepts only a single argument.
  - `.type` now returns a `Varint` parser.
  - `.value` is now `.rawValue`.
  - `.toString` is now an alias of `.toBase58`.
- Changed `Hash`:
  - The constructor now accepts only a single argument.
  - Replaced `toBytes()` with `.bytes`.
  - `.algorithm` now returns a `Varint` parser.
- `File` is now generic and accepts the type argument. The `getValue` & `setValue` methods no longer
  need a type argument.
- Immutable scheme now parses and returns a `File` instance.
- `getImmutable` now returns a `File` instance.
- `putImmutable` now returns a `ContentIdentifier` instead of `Hash`.

### Added

- Added `ContentIdentifierLike` convenience type.

## [0.2.0](https://github.com/AstrobaseTech/Astrobase/releases/tag/v0.2.0) - 2024-09-04

:seedling: Initial release as Astrobase.

### Added

#### Channels

- IndexedDB
- S3 (and S3-compatible APIs)

#### Codecs

- Binary (`application/octet-stream`)
- JSON (`application/json`)

#### Content Identifier Schemes

- Immutable

#### Other

- Implement core functionality
- Add channels system
- Add codecs system
- Add identifiers system
- Add middleware system
- Add ASCII, media type, and varint parsers
- Support file protocol version 1
