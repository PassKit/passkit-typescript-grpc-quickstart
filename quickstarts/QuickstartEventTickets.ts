import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { readFile } from 'node:fs/promises';
import { IdSchema, type Id } from '@passkit/typescript-grpc-sdk/io/common/common_objects_pb';
import { FieldFilterSchema, FilterGroupSchema, FiltersSchema, Operator } from '@passkit/typescript-grpc-sdk/io/common/filter_pb';
import { ProjectStatus } from '@passkit/typescript-grpc-sdk/io/common/project_pb';
import { PassProtocol } from '@passkit/typescript-grpc-sdk/io/common/protocols_pb';
import { DefaultTemplateRequestSchema, PassTemplateSchema, type PassTemplate } from '@passkit/typescript-grpc-sdk/io/common/template_pb';
import { EventSchema } from '@passkit/typescript-grpc-sdk/io/event_tickets/event_pb';
import { ProductionSchema } from '@passkit/typescript-grpc-sdk/io/event_tickets/production_pb';
import { IssueTicketRequestSchema, OrderNumberRequestSchema, RedeemTicketRequestSchema, TicketIdSchema, TicketListRequestSchema, TicketNumberRequestSchema, TicketSchema, ValidateTicketRequestSchema } from '@passkit/typescript-grpc-sdk/io/event_tickets/ticket_pb';
import { TicketTypeSchema } from '@passkit/typescript-grpc-sdk/io/event_tickets/ticket_type_pb';
import { VenueSchema } from '@passkit/typescript-grpc-sdk/io/event_tickets/venue_pb';
import { CreateImageInputSchema, ImageDataSchema, ImageIdsSchema, type ImageIds } from '@passkit/typescript-grpc-sdk/io/image/image_pb';
import passKitClient from './grpcConnection.js';

const image = async (path: string) => (await readFile(path)).toString('base64');

export default class QuickStartEventTickets {
    private eventTemplate: PassTemplate = create(PassTemplateSchema);
    private eventTemplateId: Id = create(IdSchema);
    private ticketTypeId: Id = create(IdSchema);
    private productionId: Id = create(IdSchema);
    private venueId: Id = create(IdSchema);
    private eventId: Id = create(IdSchema);
    private ticketId: Id = create(IdSchema);
    private imageIds: ImageIds = create(ImageIdsSchema);

    async runQuickStart(): Promise<void> {
        this.imageIds = await passKitClient.images.createImages(create(CreateImageInputSchema, { imageData: create(ImageDataSchema, {
            icon: await image('./src/images/shared/icon.png'), logo: await image('./src/images/shared/logo.png'),
            hero: await image('./src/images/loyalty/hero.png'), strip: await image('./src/images/loyalty/strip.png'),
        }) }));
        await this.createTemplate();
        this.productionId = await passKitClient.eventTickets.createProduction(create(ProductionSchema, {
            name: 'Quickstart Event Tickets Test', finePrint: 'Quickstart Fine Print', autoInvalidateTicketsUponEventEnd: 1,
            status: [ProjectStatus.PROJECT_DRAFT, ProjectStatus.PROJECT_ACTIVE_FOR_OBJECT_CREATION],
        }));
        this.venueId = await passKitClient.eventTickets.createVenue(create(VenueSchema, {
            name: 'Quickstart Venue', address: '123 ABC Street', timezone: 'Europe/London',
        }));
        await this.createEventAndTicketType();
        await this.issueAndExerciseTicket();
    }

    async cleanUp(): Promise<void> {
        if (this.productionId.id) await passKitClient.eventTickets.deleteProduction(create(ProductionSchema, { id: this.productionId.id }));
        if (this.eventTemplateId.id) await passKitClient.templates.deleteTemplate(this.eventTemplateId);
        for (const id of [this.imageIds.icon, this.imageIds.logo, this.imageIds.hero, this.imageIds.strip, this.imageIds.appleLogo]) {
            if (id) await passKitClient.images.deleteImage({ id });
        }
    }

    private async createTemplate(): Promise<void> {
        this.eventTemplate = await passKitClient.templates.getDefaultTemplate(create(DefaultTemplateRequestSchema, {
            protocol: PassProtocol.EVENT_TICKETING, revision: 1,
        }));
        Object.assign(this.eventTemplate, { name: 'Quickstart Event Tickets', description: 'Quickstart Event Tickets', timezone: 'Europe/London', imageIds: this.imageIds });
        this.eventTemplateId = await passKitClient.templates.createTemplate(this.eventTemplate);
    }

    private async createEventAndTicketType(): Promise<void> {
        this.eventId = await passKitClient.eventTickets.createEvent(create(EventSchema, {
            production: { id: this.productionId.id, name: 'Quickstart Event Production' },
            venue: { id: this.venueId.id, name: 'Quickstart Venue', address: '123 ABC Street' },
            doorsOpen: timestampFromDate(new Date(Date.now() + 3_600_000)),
            scheduledStartDate: timestampFromDate(new Date(Date.now() + 7_200_000)),
            endDate: timestampFromDate(new Date(Date.now() + 10_800_000)),
        }));
        this.ticketTypeId = await passKitClient.eventTickets.createTicketType(create(TicketTypeSchema, {
            name: 'Quickstart Ticket Type', beforeRedeemPassTemplateId: this.eventTemplateId.id,
            productionId: this.productionId.id, uid: '',
        }));
    }

    private async issueAndExerciseTicket(): Promise<void> {
        this.ticketId = await passKitClient.eventTickets.issueTicket(create(IssueTicketRequestSchema, {
            eventInfo: { case: 'eventId', value: this.eventId.id }, ticketTypeId: this.ticketTypeId.id, ticketNumber: '1', orderNumber: '1',
            person: { displayName: 'Bronze Billy', emailAddress: 'bronze.billy@dummy.passkit.com' },
        }));
        console.log('Ticket pass:', `https://pub1.pskt.io/${this.ticketId.id}`);
        const ticketRef = create(TicketIdSchema, { id: { case: 'ticketId', value: this.ticketId.id } });
        await passKitClient.eventTickets.validateTicket(create(ValidateTicketRequestSchema, { ticket: ticketRef, maxNumberOfValidations: 3 }));
        await passKitClient.eventTickets.updateTicket(create(TicketSchema, {
            id: this.ticketId.id,
            person: {
                displayName: 'Bronze',
                emailAddress: 'insert-email@example.com',
            },
        }));
        console.log('Ticket by ID:', await passKitClient.eventTickets.getTicketById(this.ticketId));
        console.log('Tickets by order:', await passKitClient.eventTickets.getTicketsByOrderNumber(create(OrderNumberRequestSchema, { orderNumber: '1', productionId: this.productionId.id })));
        console.log('Ticket by number:', await passKitClient.eventTickets.getTicketByTicketNumber(create(TicketNumberRequestSchema, { ticketNumber: '1', productionId: this.productionId.id })));
        await this.listTickets();
        await passKitClient.eventTickets.redeemTicket(create(RedeemTicketRequestSchema, { ticket: ticketRef }));
        await passKitClient.eventTickets.deleteTicket(ticketRef);
    }

    private async listTickets(): Promise<void> {
        const filters = create(FiltersSchema, { limit: -1, filterGroups: [create(FilterGroupSchema, {
            condition: Operator.AND,
            fieldFilters: [
                create(FieldFilterSchema, { filterField: 'passStatus', filterValue: 'PASS_ISSUED', filterOperator: 'eq' }),
                create(FieldFilterSchema, { filterField: 'ticketId', filterValue: this.ticketId.id, filterOperator: 'eq' }),
            ],
        })] });
        const request = create(TicketListRequestSchema, { production: { case: 'productionId', value: this.productionId.id }, filters });
        for await (const ticket of passKitClient.eventTickets.listTickets(request)) console.log('Listed ticket:', ticket);
    }
}
