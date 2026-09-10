import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { readFile } from 'node:fs/promises';
import { IdSchema, type Id } from '@passkit/typescript-grpc-sdk/io/common/common_objects_pb';
import { FieldFilterSchema, FilterGroupSchema, FiltersSchema, Operator } from '@passkit/typescript-grpc-sdk/io/common/filter_pb';
import { ProjectStatus } from '@passkit/typescript-grpc-sdk/io/common/project_pb';
import { PassProtocol } from '@passkit/typescript-grpc-sdk/io/common/protocols_pb';
import { DefaultTemplateRequestSchema, PassTemplateSchema, type PassTemplate } from '@passkit/typescript-grpc-sdk/io/common/template_pb';
import { CreateImageInputSchema, ImageDataSchema, ImageIdsSchema, type ImageIds } from '@passkit/typescript-grpc-sdk/io/image/image_pb';
import { CouponCampaignSchema } from '@passkit/typescript-grpc-sdk/io/single_use_coupons/campaign_pb';
import { CouponSchema, ListRequestSchema } from '@passkit/typescript-grpc-sdk/io/single_use_coupons/coupon_pb';
import { CouponOfferSchema } from '@passkit/typescript-grpc-sdk/io/single_use_coupons/offer_pb';
import passKitClient from './grpcConnection.js';

const image = async (path: string) => (await readFile(path)).toString('base64');

export default class QuickStartCoupons {
    private baseTemplate: PassTemplate = create(PassTemplateSchema);
    private vipTemplate: PassTemplate = create(PassTemplateSchema);
    private baseTemplateId: Id = create(IdSchema);
    private vipTemplateId: Id = create(IdSchema);
    private baseOfferId: Id = create(IdSchema);
    private vipOfferId: Id = create(IdSchema);
    private campaignId: Id = create(IdSchema);
    private baseCouponId: Id = create(IdSchema);
    private vipCouponId: Id = create(IdSchema);
    private imageIds: ImageIds = create(ImageIdsSchema);

    async runQuickStart(): Promise<void> {
        this.imageIds = await passKitClient.images.createImages(create(CreateImageInputSchema, {
            imageData: create(ImageDataSchema, {
                icon: await image('./src/images/shared/icon.png'),
                logo: await image('./src/images/shared/logo.png'),
                hero: await image('./src/images/loyalty/hero.png'),
                strip: await image('./src/images/loyalty/strip.png'),
            }),
        }));
        await this.createTemplates();
        this.campaignId = await passKitClient.coupons.createCouponCampaign(create(CouponCampaignSchema, {
            name: 'Quickstart Campaign',
            status: [ProjectStatus.PROJECT_DRAFT, ProjectStatus.PROJECT_ACTIVE_FOR_OBJECT_CREATION],
        }));
        await this.createOffers();
        await this.createCoupons();
        await passKitClient.coupons.updateCoupon(create(CouponSchema, {
            id: this.baseCouponId.id,
            person: {
                displayName: 'Base Billy',
                emailAddress: 'insert-email@example.com',
            },
        }));
        console.log('Coupon:', await passKitClient.coupons.getCouponById(this.baseCouponId));
        await this.listCoupons();
        await passKitClient.coupons.redeemCoupon(create(CouponSchema, { id: this.baseCouponId.id }));
        await passKitClient.coupons.voidCoupon(create(CouponSchema, { id: this.vipCouponId.id }));
    }

    async cleanUp(): Promise<void> {
        if (this.campaignId.id) await passKitClient.coupons.deleteCouponCampaign(this.campaignId);
        if (this.baseTemplateId.id) await passKitClient.templates.deleteTemplate(this.baseTemplateId);
        if (this.vipTemplateId.id) await passKitClient.templates.deleteTemplate(this.vipTemplateId);
        for (const id of [this.imageIds.icon, this.imageIds.logo, this.imageIds.hero, this.imageIds.strip, this.imageIds.appleLogo]) {
            if (id) await passKitClient.images.deleteImage({ id });
        }
    }

    private async createTemplates(): Promise<void> {
        const request = create(DefaultTemplateRequestSchema, { protocol: PassProtocol.SINGLE_USE_COUPON, revision: 1 });
        this.baseTemplate = await passKitClient.templates.getDefaultTemplate(request);
        this.vipTemplate = await passKitClient.templates.getDefaultTemplate(request);
        Object.assign(this.baseTemplate, { name: 'Quickstart Base Offer', description: 'Quickstart Base Offer Pass', timezone: 'Europe/London', imageIds: this.imageIds });
        Object.assign(this.vipTemplate, { name: 'Quickstart VIP Offer', description: 'Quickstart VIP Offer Pass', timezone: 'Europe/London', imageIds: this.imageIds });
        this.baseTemplateId = await passKitClient.templates.createTemplate(this.baseTemplate);
        this.vipTemplateId = await passKitClient.templates.createTemplate(this.vipTemplate);
    }

    private async createOffers(): Promise<void> {
        const issueStartDate = timestampFromDate(new Date());
        const issueEndDate = timestampFromDate(new Date(Date.now() + 86_400_000));
        this.baseOfferId = await passKitClient.coupons.createCouponOffer(create(CouponOfferSchema, {
            id: 'base', campaignId: this.campaignId.id, beforeRedeemPassTemplateId: this.baseTemplateId.id,
            offerTitle: 'Quickstart Base Offer', offerShortTitle: 'Base Offer', offerDetails: 'Your Quickstart Offer',
            issueStartDate, issueEndDate, ianaTimezone: 'Europe/London',
        }));
        this.vipOfferId = await passKitClient.coupons.createCouponOffer(create(CouponOfferSchema, {
            id: 'vip', campaignId: this.campaignId.id, beforeRedeemPassTemplateId: this.vipTemplateId.id,
            offerTitle: 'Quickstart VIP Offer', offerShortTitle: 'VIP Offer', offerDetails: 'Your Quickstart Offer',
            issueStartDate, issueEndDate, ianaTimezone: 'Europe/London',
        }));
    }

    private async createCoupons(): Promise<void> {
        this.baseCouponId = await passKitClient.coupons.createCoupon(create(CouponSchema, {
            offerId: this.baseOfferId.id, campaignId: this.campaignId.id,
            person: { displayName: 'Base Billy', emailAddress: 'base.billy@dummy.passkit.com' },
        }));
        this.vipCouponId = await passKitClient.coupons.createCoupon(create(CouponSchema, {
            offerId: this.vipOfferId.id, campaignId: this.campaignId.id,
            person: { displayName: 'VIP Steve', emailAddress: 'vip.steve@dummy.passkit.com' },
        }));
        console.log('Coupon passes:', `https://pub1.pskt.io/${this.baseCouponId.id}`, `https://pub1.pskt.io/${this.vipCouponId.id}`);
    }

    private async listCoupons(): Promise<void> {
        const filters = create(FiltersSchema, { limit: -1, filterGroups: [create(FilterGroupSchema, {
            condition: Operator.AND,
            fieldFilters: [
                create(FieldFilterSchema, { filterField: 'passStatus', filterValue: 'PASS_ISSUED', filterOperator: 'eq' }),
                create(FieldFilterSchema, { filterField: 'passkitId', filterValue: this.baseCouponId.id, filterOperator: 'eq' }),
            ],
        })] });
        const request = create(ListRequestSchema, { couponCampaignId: this.campaignId.id, filters });
        for await (const coupon of passKitClient.coupons.listCouponsByCouponCampaign(request)) console.log('Listed coupon:', coupon);
    }
}
