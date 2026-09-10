import 'dotenv/config';
import { existsSync } from 'node:fs';

const config = {
    ROOT_CERT: process.env.PASSKIT_ROOT_CERT ?? './certs/ca-chain.pem',
    PRIVATE_KEY: process.env.PASSKIT_PRIVATE_KEY ?? './certs/key.pem',
    CERTIFICATE: process.env.PASSKIT_CERTIFICATE ?? './certs/certificate.pem',
    ADDRESS: process.env.PASSKIT_ADDRESS ?? process.env.PASSKIT_GRPC_ADDRESS ?? 'grpc.pub1.passkit.io',
    PORT: Number(process.env.PASSKIT_PORT ?? process.env.PASSKIT_GRPC_PORT ?? 443),
    PASSPHRASE: process.env.PASSKIT_PASSPHRASE ?? '',
    APPLE_CERTIFICATE: process.env.PASSKIT_APPLE_CERTIFICATE ?? '',
    RECIPIENT_EMAIL: process.env.PASSKIT_RECIPIENT_EMAIL ?? '',
    KEEP_ASSETS: /^(1|true|yes)$/i.test(process.env.PASSKIT_KEEP_ASSETS ?? ''),
} as const;

export function validateConfig(requireAppleCertificate = false): typeof config {
    const problems: string[] = [];
    if (!config.PASSPHRASE) problems.push('PASSKIT_PASSPHRASE is required');
    if (!Number.isInteger(config.PORT) || config.PORT < 1 || config.PORT > 65_535) {
        problems.push('PASSKIT_PORT must be a valid port number');
    }
    for (const [name, path] of [
        ['PASSKIT_ROOT_CERT', config.ROOT_CERT],
        ['PASSKIT_PRIVATE_KEY', config.PRIVATE_KEY],
        ['PASSKIT_CERTIFICATE', config.CERTIFICATE],
    ] as const) {
        if (!existsSync(path)) problems.push(`${name} file not found: ${path}`);
    }
    if (requireAppleCertificate && !config.APPLE_CERTIFICATE) {
        problems.push('PASSKIT_APPLE_CERTIFICATE is required for flights');
    }
    if (problems.length) {
        throw new Error(`Configuration error:\n- ${problems.join('\n- ')}\n\nCopy .env.example to .env and complete the required values.`);
    }
    return config;
}

export default config;
