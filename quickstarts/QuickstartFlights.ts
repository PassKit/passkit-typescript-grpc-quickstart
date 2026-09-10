import { create } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import { readFile } from 'node:fs/promises';
import { DateSchema, LocalDateTimeSchema, TimeSchema, type Date as PassKitDate } from '@passkit/typescript-grpc-sdk/io/common/common_objects_pb';
import { PassProtocol } from '@passkit/typescript-grpc-sdk/io/common/protocols_pb';
import { ColorsSchema, DefaultTemplateRequestSchema } from '@passkit/typescript-grpc-sdk/io/common/template_pb';
import { AirportCodeSchema, PortSchema } from '@passkit/typescript-grpc-sdk/io/flights/airport_pb';
import { BoardingPassRecordSchema } from '@passkit/typescript-grpc-sdk/io/flights/boarding_pass_pb';
import { FlightScheduleSchema, FlightTimesSchema } from '@passkit/typescript-grpc-sdk/io/flights/barcode_pb';
import { CarrierCodeSchema, CarrierSchema } from '@passkit/typescript-grpc-sdk/io/flights/carrier_pb';
import { FlightDesignatorRequestSchema, FlightDesignatorSchema } from '@passkit/typescript-grpc-sdk/io/flights/flight_designator_pb';
import { FlightRequestSchema, FlightSchema } from '@passkit/typescript-grpc-sdk/io/flights/flight_pb';
import { PassengerSchema } from '@passkit/typescript-grpc-sdk/io/flights/passenger_pb';
import { CreateImageInputSchema, ImageDataSchema, ImageIdsSchema, type ImageIds } from '@passkit/typescript-grpc-sdk/io/image/image_pb';
import config from '../config/config.js';
import passKitClient from './grpcConnection.js';

const CARRIER_CODE = 'YY';
const FLIGHT_NUMBER = '123';
const ORIGIN = 'YY4';
const DESTINATION = 'ADP';
const DESIGNATOR_REVISION = 1;
const image = async (path: string) => (await readFile(path)).toString('base64');

export default class QuickStartFlights {
    private imageIds: ImageIds = create(ImageIdsSchema);
    private templateId = '';
    private departureDate: PassKitDate = create(DateSchema);
    private createdCarrier = false;
    private createdOrigin = false;
    private createdDestination = false;

    async runQuickStart(): Promise<void> {
        if (!config.APPLE_CERTIFICATE) {
            throw new Error('Set PASSKIT_APPLE_CERTIFICATE to your uploaded Apple pass certificate ID before running flights.');
        }
        this.departureDate = this.futureDepartureDate();
        await this.createImages();
        await this.createTemplate();
        await this.createCarrierAndPorts();
        await this.createFlightAndDesignator();
        const response = await passKitClient.flights.createBoardingPass(create(BoardingPassRecordSchema, {
            operatingCarrierPNR: 'P8F8R8',
            boardingPoint: ORIGIN,
            deplaningPoint: DESTINATION,
            carrierCode: CARRIER_CODE,
            flightNumber: FLIGHT_NUMBER,
            departureDate: this.departureDate,
            passenger: create(PassengerSchema, {
                passengerDetails: {
                    forename: 'Flight',
                    surname: 'Passenger',
                    emailAddress: 'insert-email@example.com',
                },
            }),
            sequenceNumber: 123,
            seatNumber: '12A',
            class: 'Economy',
        }));
        for (const pass of response.boardingPasses) {
            console.log('Boarding pass:', pass.url || pass.googlePayURL, `(id: ${pass.id})`);
        }
    }

    async cleanUp(): Promise<void> {
        const flight = {
            carrierCode: CARRIER_CODE,
            flightNumber: FLIGHT_NUMBER,
            boardingPoint: ORIGIN,
            deplaningPoint: DESTINATION,
            departureDate: this.departureDate,
        };
        if (this.departureDate.year) {
            await passKitClient.flights.deleteFlight(create(FlightRequestSchema, flight));
            await passKitClient.flights.deleteFlightDesignator(create(FlightDesignatorRequestSchema, {
                carrierCode: CARRIER_CODE, flightNumber: FLIGHT_NUMBER, revision: DESIGNATOR_REVISION,
            }));
        }
        if (this.createdOrigin) await passKitClient.flights.deletePort(create(AirportCodeSchema, { airportCode: ORIGIN }));
        if (this.createdDestination) await passKitClient.flights.deletePort(create(AirportCodeSchema, { airportCode: DESTINATION }));
        if (this.createdCarrier) {
            await new Promise((resolve) => setTimeout(resolve, 5_000));
            await passKitClient.flights.deleteCarrier(create(CarrierCodeSchema, { carrierCode: CARRIER_CODE }));
        }
        if (this.templateId) await passKitClient.templates.deleteTemplate({ id: this.templateId });
        for (const id of [this.imageIds.icon, this.imageIds.logo, this.imageIds.appleLogo]) {
            if (id) await passKitClient.images.deleteImage({ id });
        }
    }

    private async createImages(): Promise<void> {
        console.log('Creating flight images');
        this.imageIds = await passKitClient.images.createImages(create(CreateImageInputSchema, {
            imageData: create(ImageDataSchema, {
                icon: await image('./src/images/shared/icon.png'),
                logo: await image('./src/images/shared/logo.png'),
                appleLogo: await image('./src/images/flights/appleLogo.png'),
            }),
        }));
    }

    private async createTemplate(): Promise<void> {
        const template = await passKitClient.templates.getDefaultTemplate(create(DefaultTemplateRequestSchema, {
            protocol: PassProtocol.FLIGHT_PROTOCOL,
            revision: 1,
        }));
        Object.assign(template, {
            name: 'Quickstart Flight Ticket',
            description: 'Quickstart Economy Flight Ticket',
            timezone: 'Europe/London',
            imageIds: this.imageIds,
            colors: create(ColorsSchema, {
                textColor: '000000', labelColor: '000000', stripColor: '000000', backgroundColor: 'FFEA6C',
            }),
        });
        this.templateId = (await passKitClient.templates.createTemplate(template)).id;
    }

    private async createCarrierAndPorts(): Promise<void> {
        this.createdCarrier = await this.createOrReuse('Carrier', CARRIER_CODE, () => passKitClient.flights.createCarrier(create(CarrierSchema, {
            airlineName: 'Quickstart Airline', iataCarrierCode: CARRIER_CODE, passTypeIdentifier: config.APPLE_CERTIFICATE,
        })));
        this.createdOrigin = await this.createOrReuse('Airport', ORIGIN, () => passKitClient.flights.createPort(create(PortSchema, {
            airportName: 'Quickstart Origin Airport', cityName: 'Origin', iataAirportCode: ORIGIN,
            icaoAirportCode: 'YYYY', countryCode: 'GB', timezone: 'Europe/London',
        })));
        this.createdDestination = await this.createOrReuse('Airport', DESTINATION, () => passKitClient.flights.createPort(create(PortSchema, {
            airportName: 'Quickstart Destination Airport', cityName: 'Destination', iataAirportCode: DESTINATION,
            icaoAirportCode: 'VHHH', countryCode: 'HK', timezone: 'Asia/Hong_Kong',
        })));
    }

    private async createOrReuse(label: string, code: string, operation: () => Promise<unknown>): Promise<boolean> {
        try {
            await operation();
            console.log(`Created ${label.toLowerCase()} ${code}.`);
            return true;
        } catch (error) {
            if (error instanceof ConnectError && error.code === Code.AlreadyExists) {
                console.log(`${label} ${code} already exists; reusing it.`);
                return false;
            }
            throw error;
        }
    }

    private async createFlightAndDesignator(): Promise<void> {
        const date = `${this.departureDate.year}-${String(this.departureDate.month).padStart(2, '0')}-${String(this.departureDate.day).padStart(2, '0')}`;
        await passKitClient.flights.createFlight(create(FlightSchema, {
            carrierCode: CARRIER_CODE, flightNumber: FLIGHT_NUMBER,
            boardingPoint: ORIGIN, deplaningPoint: DESTINATION,
            departureDate: this.departureDate,
            scheduledDepartureTime: create(LocalDateTimeSchema, { dateTime: `${date}T13:00:00` }),
            scheduledArrivalTime: create(LocalDateTimeSchema, { dateTime: `${date}T21:00:00` }),
            passTemplateId: this.templateId,
        }));
        const times = create(FlightTimesSchema, {
            scheduledDepartureTime: create(TimeSchema, { hour: 13 }),
            boardingTime: create(TimeSchema, { hour: 12, minute: 15 }),
            gateClosingTime: create(TimeSchema, { hour: 12, minute: 30 }),
            scheduledArrivalTime: create(TimeSchema, { hour: 21 }),
        });
        await passKitClient.flights.createFlightDesignator(create(FlightDesignatorSchema, {
            carrierCode: CARRIER_CODE, flightNumber: FLIGHT_NUMBER, revision: DESIGNATOR_REVISION,
            active: true, origin: ORIGIN, destination: DESTINATION, passTemplateId: this.templateId,
            schedule: create(FlightScheduleSchema, {
                monday: times, tuesday: times, wednesday: times, thursday: times,
                friday: times, saturday: times, sunday: times,
            }),
        }));
    }

    private futureDepartureDate(): PassKitDate {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() + 7);
        return create(DateSchema, { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
    }
}
