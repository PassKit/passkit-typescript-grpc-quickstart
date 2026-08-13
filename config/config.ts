const config = {
    ROOT_CERT: process.env.PASSKIT_ROOT_CERT ?? "./certs/ca-chain.pem",
    PRIVATE_KEY: process.env.PASSKIT_PRIVATE_KEY ?? "./certs/key.pem",
    CERTIFICATE: process.env.PASSKIT_CERTIFICATE ?? "./certs/certificate.pem",
    ADDRESS: process.env.PASSKIT_GRPC_ADDRESS ?? "grpc.pub1.passkit.io",
    PORT: Number(process.env.PASSKIT_GRPC_PORT ?? 443),
    PASSPHRASE: process.env.PASSKIT_PASSPHRASE ?? "password",
    APPLE_CERTIFICATE: process.env.PASSKIT_APPLE_CERTIFICATE ?? "pass.com.example",
} as const;

export default config;
