import { createClient, type Client } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { Images } from '@passkit/typescript-grpc-sdk/io/core/a_rpc_images_pb';
import { Users } from '@passkit/typescript-grpc-sdk/io/core/a_rpc_others_pb';
import { Templates } from '@passkit/typescript-grpc-sdk/io/core/a_rpc_templates_pb';
import { EventTickets } from '@passkit/typescript-grpc-sdk/io/event_tickets/a_rpc_pb';
import { Flights } from '@passkit/typescript-grpc-sdk/io/flights/a_rpc_pb';
import { Members } from '@passkit/typescript-grpc-sdk/io/member/a_rpc_pb';
import { SingleUseCoupons } from '@passkit/typescript-grpc-sdk/io/single_use_coupons/a_rpc_pb';
import { Analytics } from '@passkit/typescript-grpc-sdk/io/analytics/a_rpc_pb';
import { Certificates } from '@passkit/typescript-grpc-sdk/io/core/a_rpc_certificates_pb';
import { Distribution } from '@passkit/typescript-grpc-sdk/io/core/a_rpc_distribution_pb';
import { Integrations } from '@passkit/typescript-grpc-sdk/io/core/a_rpc_others_pb';
import { Raw } from '@passkit/typescript-grpc-sdk/io/raw/a_rpc_pb';

import config from '../config/config.js';

export class PassKitClient {
    readonly users: Client<typeof Users>;
    readonly templates: Client<typeof Templates>;
    readonly members: Client<typeof Members>;
    readonly images: Client<typeof Images>;
    readonly coupons: Client<typeof SingleUseCoupons>;
    readonly eventTickets: Client<typeof EventTickets>;
    readonly flights: Client<typeof Flights>;
    readonly analytics: Client<typeof Analytics>;
    readonly certificates: Client<typeof Certificates>;
    readonly distribution: Client<typeof Distribution>;
    readonly integrations: Client<typeof Integrations>;
    readonly raw: Client<typeof Raw>;

    constructor() {
        const encryptedKey = fs.readFileSync(config.PRIVATE_KEY);
        const privateKey = crypto.createPrivateKey({
            format: 'pem',
            key: encryptedKey,
            passphrase: config.PASSPHRASE,
            type: 'pkcs8',
        });
        const transport = createGrpcTransport({
            baseUrl: `https://${config.ADDRESS}:${config.PORT}`,
            nodeOptions: {
                ca: fs.readFileSync(config.ROOT_CERT),
                cert: fs.readFileSync(config.CERTIFICATE),
                key: privateKey.export({ format: 'pem', type: 'pkcs8' }),
            },
        });

        this.users = createClient(Users, transport);
        this.templates = createClient(Templates, transport);
        this.members = createClient(Members, transport);
        this.images = createClient(Images, transport);
        this.coupons = createClient(SingleUseCoupons, transport);
        this.eventTickets = createClient(EventTickets, transport);
        this.flights = createClient(Flights, transport);
        this.analytics = createClient(Analytics, transport);
        this.certificates = createClient(Certificates, transport);
        this.distribution = createClient(Distribution, transport);
        this.integrations = createClient(Integrations, transport);
        this.raw = createClient(Raw, transport);
    }
}

let sharedClient: PassKitClient | undefined;

export function getPassKitClient(): PassKitClient {
    sharedClient ??= new PassKitClient();
    return sharedClient;
}

// Preserve the concise passKitClient.members style while delaying certificate
// loading until the selected workflow actually makes its first API call.
const passKitClient = new Proxy({} as PassKitClient, {
    get: (_target, property: keyof PassKitClient) => getPassKitClient()[property],
});

export default passKitClient;
