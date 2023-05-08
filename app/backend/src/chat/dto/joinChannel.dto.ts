import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString
} from "class-validator";

export class JoinChannelDto {
    @IsNotEmpty()
    @IsString()
    channelName: string;

    @IsNotEmpty()
    @IsNumber()
    userId: number;

    @IsString()
    @IsOptional()
    password?: string;
}