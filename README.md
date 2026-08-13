# PassKit TypeScript gRPC Quickstart

This quickstart uses the current [PassKit TypeScript gRPC SDK](https://github.com/PassKit/passkit-typescript-grpc-sdk) and follows the flows in PassKit's Node and Java quickstarts.

It demonstrates how to:

- connect to PassKit with mutual TLS;
- upload pass images;
- create templates, a membership program, and tiers;
- enrol and update members;
- check a member in and out;
- list members and member events with server-streaming RPCs;
- create a carrier, airports, flight designator, flight, and boarding pass; and
- clean up the objects created by the example.

## Requirements

- Node.js 20 or later
- A free [PassKit account](https://app.passkit.com)
- PassKit SDK credentials from **Developer Tools** in your account

## Setup

1. Put the following credentials in `certs/`:

   - `ca-chain.pem`
   - `certificate.pem`
   - `key.pem`

2. Update the API region in `config/config.ts`. Use `grpc.pub1.passkit.io` for Europe or `grpc.pub2.passkit.io` for the US.

3. Install dependencies. The latest SDK commit is currently ahead of npm, so it is pinned to its GitHub source archive and built automatically during installation.

   ```bash
   npm install
   ```

4. To run flights, provide the identifier of an Apple pass certificate already uploaded to PassKit:

   ```bash
   export PASSKIT_APPLE_CERTIFICATE='pass.com.your-airline'
   ```

5. Supply the private-key passphrase and run all four quickstarts:

   ```bash
   PASSKIT_PASSPHRASE='your-passphrase' npm run dev
   ```

Run one quickstart at a time with `--quickstart`:

```bash
npm run dev -- --quickstart loyalty
npm run dev -- --quickstart coupons
npm run dev -- --quickstart event-tickets
npm run dev -- --quickstart flights
```

The examples delete the resources they create after completing. Pass `--keep` if you want to inspect them in your PassKit account:

```bash
npm run dev -- --quickstart loyalty --keep
```

## ESM and CommonJS

The repository builds and runs in both module formats. You do not need to edit imports or change `package.json` when switching—the npm script selects the appropriate build.

### Run from TypeScript during development

Use ESM:

```bash
npm run dev:esm -- --quickstart loyalty
```

Use CommonJS:

```bash
npm run dev:cjs -- --quickstart loyalty
```

`npm run dev` is an alias for `dev:esm`, so ESM is the default. The `--` forwards subsequent options such as `--quickstart` and `--keep` to the quickstart.

### Run compiled JavaScript

First build both formats:

```bash
npm run build
```

Then select the format when starting:

```bash
# ESM
npm run start:esm -- --quickstart loyalty

# CommonJS
npm run start:cjs -- --quickstart loyalty
```

`npm start` is an alias for `start:esm`. To retain created PassKit resources, the same flags work with either format:

```bash
npm run start:esm -- --quickstart coupons --keep
npm run start:cjs -- --quickstart coupons --keep
```

### Build one format only

```bash
npm run build:esm
npm run build:cjs
```

The ESM compiler uses `tsconfig.esm.json` and writes to `dist/esm`. The CommonJS compiler uses `tsconfig.cjs.json` and writes to `dist/cjs`. Each build script also writes a small `package.json` into the output directories so Node interprets their `.js` files correctly.

| Task | ESM | CommonJS |
| --- | --- | --- |
| Develop/run | `npm run dev:esm` | `npm run dev:cjs` |
| Build | `npm run build:esm` | `npm run build:cjs` |
| Run built output | `npm run start:esm` | `npm run start:cjs` |
| Output | `dist/esm` | `dist/cjs` |

## Build

```bash
npm run build
npm start
```

The SDK uses Buf-generated message schemas. Create messages with `create(Schema, initialValues)`. ConnectRPC supplies the gRPC transport and exposes server streams as async iterables.
