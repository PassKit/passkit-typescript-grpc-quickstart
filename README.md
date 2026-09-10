# PassKit TypeScript gRPC Quickstart

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Create a working PassKit membership card, coupon, event ticket, or flight boarding pass with the TypeScript gRPC SDK. Each guided workflow runs with one command and cleans up the test resources it creates.

Both ESM and CommonJS builds are supported and tested.

## Quick start

You need Node.js 20 or later, a free [PassKit account](https://app.passkit.com/signup), and PassKit SDK credentials.

### 1. Install the project

```sh
git clone https://github.com/PassKit/passkit-typescript-grpc-quickstart.git
cd passkit-typescript-grpc-quickstart
npm install
```

The quickstart currently installs SDK `1.1.162` from its pinned GitHub revision and builds it during installation.

### 2. Add your credentials

In PassKit, open **Developer Tools → SDK Credentials**, choose a private-key password, and download `certificate.pem`, `key.pem`, and `ca-chain.pem`.

Create `certs/`, place all three files there, then create your local configuration:

```sh
mkdir -p certs
cp /path/to/downloads/certificate.pem certs/
cp /path/to/downloads/key.pem certs/
cp /path/to/downloads/ca-chain.pem certs/
cp .env.example .env
```

Open `.env` and replace `your_passphrase` with the password chosen when the credentials were generated. Use `grpc.pub1.passkit.io` for Europe or `grpc.pub2.passkit.io` for the US. Your account data exists in only one region.

Credentials and `.env` are ignored by Git. Never commit or share them.

### 3. Run an example

```sh
npm run example:loyalty
npm run example:coupons
npm run example:tickets
npm run example:flights
```

Run all four workflows with `npm run dev`. Flights additionally require an Apple pass certificate uploaded to PassKit; put its pass type identifier in `.env` as `PASSKIT_APPLE_CERTIFICATE`.

When successful, the workflow prints the generated pass URL. Set `PASSKIT_KEEP_ASSETS=true` or pass `--keep` to retain resources for inspection; you must then remove them manually.

## What the examples cover

- `loyalty`: images, templates, program, tiers, enrolment, lookup, member events, check-in/out, and points updates
- `coupons`: images, templates, campaign, offers, issuance, lookup, listing, redemption, and voiding
- `event-tickets`: images, template, production, venue, event, ticket type, issuance, lookup, listing, validation, and redemption
- `flights`: images, template, reusable carrier and airports, flight, designator, and boarding pass

The focused workflows live in [`quickstarts`](quickstarts). The shared client also exposes analytics, certificates, distribution, integrations, and raw-pass services, giving developers access to the wider SDK without creating another connection.

ConnectRPC uses a reusable HTTP/2 transport, so requests share the underlying gRPC connection.

## ESM and CommonJS

```sh
# Run TypeScript as ESM (default)
npm run dev:esm -- --quickstart loyalty

# Build and run CommonJS
npm run dev:cjs -- --quickstart loyalty

# Build both formats and run compiled output
npm run build
npm run start:esm -- --quickstart coupons
npm run start:cjs -- --quickstart coupons
```

| Task | ESM | CommonJS |
| --- | --- | --- |
| Develop/run | `npm run dev:esm` | `npm run dev:cjs` |
| Build | `npm run build:esm` | `npm run build:cjs` |
| Run compiled | `npm run start:esm` | `npm run start:cjs` |
| Output | `dist/esm` | `dist/cjs` |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PASSKIT_PASSPHRASE` | Required | Password for the encrypted SDK private key |
| `PASSKIT_ADDRESS` | `grpc.pub1.passkit.io` | PassKit API region |
| `PASSKIT_PORT` | `443` | gRPC port |
| `PASSKIT_ROOT_CERT` | `./certs/ca-chain.pem` | PassKit CA-chain path |
| `PASSKIT_PRIVATE_KEY` | `./certs/key.pem` | Encrypted private-key path |
| `PASSKIT_CERTIFICATE` | `./certs/certificate.pem` | Client-certificate path |
| `PASSKIT_RECIPIENT_EMAIL` | Empty | Optional pass recipient |
| `PASSKIT_APPLE_CERTIFICATE` | Empty | Apple pass type identifier required for flights |
| `PASSKIT_KEEP_ASSETS` | `false` | Keep generated resources after a workflow |

Legacy `PASSKIT_GRPC_ADDRESS` and `PASSKIT_GRPC_PORT` names remain supported.

## Checks

```sh
npm test
npm run security
```

`npm test` type-checks the source, builds ESM and CommonJS, and smoke-tests both outputs without connecting to PassKit.

## Troubleshooting

- **Credential file not found:** ensure all three PEM files are in `certs/` and run commands from the repository root.
- **Private key cannot be loaded:** verify `PASSKIT_PASSPHRASE` is the SDK credential password, not your PassKit login password.
- **Authentication fails:** confirm that `PASSKIT_ADDRESS` matches your account’s API region.
- **Flights are rejected:** upload an Apple pass certificate and set `PASSKIT_APPLE_CERTIFICATE` to its pass type identifier.
- **Resources remain:** cleanup is best-effort. Remove remaining test resources in PassKit, especially after interrupted runs.

## License

MIT — see [LICENSE](LICENSE).
