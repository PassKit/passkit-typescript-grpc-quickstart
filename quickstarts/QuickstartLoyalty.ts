import { create } from '@bufbuild/protobuf';
import { readFile } from 'node:fs/promises';
import { IdSchema, type Id } from '@passkit/typescript-grpc-sdk/io/common/common_objects_pb';
import {
    FieldFilterSchema,
    FilterGroupSchema,
    FiltersSchema,
    Operator,
} from '@passkit/typescript-grpc-sdk/io/common/filter_pb';
import { ProjectStatus, type Project } from '@passkit/typescript-grpc-sdk/io/common/project_pb';
import { PassProtocol } from '@passkit/typescript-grpc-sdk/io/common/protocols_pb';
import {
    DefaultTemplateRequestSchema,
    PassTemplateSchema,
    type PassTemplate,
} from '@passkit/typescript-grpc-sdk/io/common/template_pb';
import {
    CreateImageInputSchema,
    ImageDataSchema,
    ImageIdsSchema,
    type ImageData,
    type ImageIds,
} from '@passkit/typescript-grpc-sdk/io/image/image_pb';
import {
    EarnBurnPointsRequestSchema,
    ListRequestSchema,
    MemberCheckInOutRequestSchema,
    MemberSchema,
} from '@passkit/typescript-grpc-sdk/io/member/member_pb';
import { BalanceType, PointsTypeSchema, ProgramSchema } from '@passkit/typescript-grpc-sdk/io/member/program_pb';
import { TierSchema } from '@passkit/typescript-grpc-sdk/io/member/tier_pb';

import passKitClient from './grpcConnection.js';

const imageAsBase64 = async (path: string): Promise<string> =>
    (await readFile(path)).toString('base64');

class QuickStartLoyalty {
    private bronzeTemplate: PassTemplate = create(PassTemplateSchema);
    private silverTemplate: PassTemplate = create(PassTemplateSchema);
    private bronzeTemplateId: Id = create(IdSchema);
    private silverTemplateId: Id = create(IdSchema);
    private bronzeTierId: Id = create(IdSchema);
    private silverTierId: Id = create(IdSchema);
    private programId: Id = create(IdSchema);
    private bronzeMemberId: Id = create(IdSchema);
    private silverMemberId: Id = create(IdSchema);
    private imageIds: ImageIds = create(ImageIdsSchema);
    private shortCode?: Project;

    async runQuickStart(): Promise<void> {
        const imageData = create(ImageDataSchema, {
            icon: await imageAsBase64('./src/images/shared/icon.png'),
            logo: await imageAsBase64('./src/images/shared/logo.png'),
            hero: await imageAsBase64('./src/images/loyalty/hero.png'),
            strip: await imageAsBase64('./src/images/loyalty/strip.png'),
        });

        await this.createImages(imageData);
        await this.getTemplates();
        await this.createTemplates();
        await this.createProgram();
        await this.getShortCode();
        await this.createTiers();
        await this.createMembers();
        await this.checkMemberInAndOut();
        await this.earnPoints();
        await this.updateMember();
        await this.getMember();
        await this.listMembers();
        await this.listMemberEvents();
        await this.deleteMember();
    }

    async cleanUp(): Promise<void> {
        if (this.programId.id) await passKitClient.members.deleteProgram(this.programId);
        if (this.bronzeTemplateId.id) await passKitClient.templates.deleteTemplate(this.bronzeTemplateId);
        if (this.silverTemplateId.id) await passKitClient.templates.deleteTemplate(this.silverTemplateId);

        for (const id of [
            this.imageIds.icon,
            this.imageIds.logo,
            this.imageIds.hero,
            this.imageIds.strip,
            this.imageIds.appleLogo,
        ]) {
            if (id) await passKitClient.images.deleteImage({ id });
        }
    }

    private async createImages(imageData: ImageData): Promise<void> {
        console.log('Creating images');
        this.imageIds = await passKitClient.images.createImages(
            create(CreateImageInputSchema, { imageData }),
        );
    }

    private async getTemplates(): Promise<void> {
        const request = create(DefaultTemplateRequestSchema, {
            protocol: PassProtocol.MEMBERSHIP,
            revision: 1,
        });
        this.bronzeTemplate = await passKitClient.templates.getDefaultTemplate(request);
        this.silverTemplate = await passKitClient.templates.getDefaultTemplate(request);

        Object.assign(this.bronzeTemplate, {
            name: 'Quickstart Bronze Tier',
            description: 'Quickstart Bronze Tier Pass',
            timezone: 'Europe/London',
            imageIds: this.imageIds,
        });
        Object.assign(this.silverTemplate, {
            name: 'Quickstart Silver Tier',
            description: 'Quickstart Silver Tier Pass',
            timezone: 'Europe/London',
            imageIds: this.imageIds,
        });
    }

    private async createTemplates(): Promise<void> {
        this.bronzeTemplateId = await passKitClient.templates.createTemplate(this.bronzeTemplate);
        this.silverTemplateId = await passKitClient.templates.createTemplate(this.silverTemplate);
        console.log('Bronze and silver templates created');
    }

    private async createProgram(): Promise<void> {
        const program = create(ProgramSchema, {
            name: 'Quickstart Loyalty Program Test',
            status: [ProjectStatus.PROJECT_DRAFT, ProjectStatus.PROJECT_ACTIVE_FOR_OBJECT_CREATION],
            pointsType: create(PointsTypeSchema, { balanceType: BalanceType.INT }),
        });
        this.programId = await passKitClient.members.createProgram(program);
        console.log('Program created:', this.programId.id);
    }

    private async getShortCode(): Promise<void> {
        this.shortCode = await passKitClient.users.getProjectByUuid(this.programId);
        console.log('Enrollment page:', `https://${this.shortCode.shortCode}.pskt.io`);
    }

    private async createTiers(): Promise<void> {
        this.bronzeTierId = await passKitClient.members.createTier(create(TierSchema, {
            id: 'bronze', name: 'Bronze', tierIndex: 1,
            passTemplateId: this.bronzeTemplateId.id,
            programId: this.programId.id, timezone: 'Europe/London',
        }));
        this.silverTierId = await passKitClient.members.createTier(create(TierSchema, {
            id: 'silver', name: 'Silver', tierIndex: 2,
            passTemplateId: this.silverTemplateId.id,
            programId: this.programId.id, timezone: 'Europe/London',
        }));
    }

    private async createMembers(): Promise<void> {
        this.bronzeMemberId = await passKitClient.members.enrolMember(create(MemberSchema, {
            tierId: this.bronzeTierId.id, programId: this.programId.id, points: 100,
            person: { displayName: 'Bronze Billy', emailAddress: 'bronze.billy@dummy.passkit.com' },
        }));
        this.silverMemberId = await passKitClient.members.enrolMember(create(MemberSchema, {
            tierId: this.silverTierId.id, programId: this.programId.id, points: 100,
            person: { displayName: 'Silver Sally', emailAddress: 'silver.sally@dummy.passkit.com' },
        }));
        console.log('Member passes:', `https://pub1.pskt.io/${this.bronzeMemberId.id}`, `https://pub1.pskt.io/${this.silverMemberId.id}`);
    }

    private async checkMemberInAndOut(): Promise<void> {
        const request = create(MemberCheckInOutRequestSchema, {
            memberId: this.bronzeMemberId.id,
            lat: 51.5014,
            lon: 0.1419,
            address: 'Buckingham Palace, Westminster, London SW1A 1AA',
        });
        await passKitClient.members.checkInMember(request);
        await passKitClient.members.checkOutMember(request);
    }

    private async earnPoints(): Promise<void> {
        await passKitClient.members.earnPoints(create(EarnBurnPointsRequestSchema, {
            id: this.bronzeMemberId.id,
            points: 10,
        }));
    }

    private async updateMember(): Promise<void> {
        await passKitClient.members.updateMember(create(MemberSchema, {
            id: this.bronzeMemberId.id,
            points: 150,
            person: {
                displayName: 'New Billy',
                emailAddress: 'bronze.billy@dummy.passkit.com',
            },
        }));
    }

    private async getMember(): Promise<void> {
        const member = await passKitClient.members.getMemberRecordById(this.bronzeMemberId);
        console.log('Member record:', member);
    }

    private async listMembers(): Promise<void> {
        const filters = create(FiltersSchema, {
            limit: -1,
            filterGroups: [create(FilterGroupSchema, {
                condition: Operator.AND,
                fieldFilters: [
                    create(FieldFilterSchema, { filterField: 'passStatus', filterValue: 'PASS_ISSUED', filterOperator: 'eq' }),
                    create(FieldFilterSchema, { filterField: 'displayName', filterValue: 'New Billy', filterOperator: 'eq' }),
                ],
            })],
        });
        const request = create(ListRequestSchema, { programId: this.programId.id, filters });
        for await (const member of passKitClient.members.listMembers(request)) {
            console.log('Listed member:', member);
        }
    }

    private async listMemberEvents(): Promise<void> {
        for await (const event of passKitClient.members.listEventsForMember(this.bronzeMemberId)) {
            console.log('Member event:', event);
        }
    }

    private async deleteMember(): Promise<void> {
        await passKitClient.members.deleteMember(create(MemberSchema, { id: this.bronzeMemberId.id }));
    }
}

export default QuickStartLoyalty;
