import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DeliveryFeeWebhookDto {
    @IsNotEmpty()
    @IsString()
    bid: string;

    @IsNotEmpty()
    @IsString()
    orderId: string;

    @IsNotEmpty()
    @IsString()
    externalId: string;

    @IsString()
    platform?: string;

    @IsNotEmpty()
    @IsBoolean()
    deliveryFeePaid: boolean;
}