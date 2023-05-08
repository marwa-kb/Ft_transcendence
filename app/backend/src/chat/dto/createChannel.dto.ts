import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString
} from "class-validator";

import { ChannelType } from "@prisma/client";

export class CreateChannelDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ChannelType)
    type: ChannelType;

    @IsOptional()
    password?: string;

    @IsNumber()
    ownerId: number;
}
