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

import config from '../config/config.js';

class PassKitClient {
    readonly users: Client<typeof Users>;
    readonly templates: Client<typeof Templates>;
    readonly members: Client<typeof Members>;
    readonly images: Client<typeof Images>;
    readonly coupons: Client<typeof SingleUseCoupons>;
    readonly eventTickets: Client<typeof EventTickets>;
    readonly flights: Client<typeof Flights>;

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
    }
}

export default new PassKitClient();
