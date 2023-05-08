import {
    IsNotEmpty,
    IsNumber,
    IsString,
} from "class-validator";

export class MessageDto {
    @IsNotEmpty()
    @IsNumber()
    fromId: number;

    @IsNotEmpty()
    @IsNumber()
    toId: number;

    @IsNotEmpty()
    @IsString()
    fromUsername: string;

    @IsNotEmpty()
    dm: boolean;

    @IsString()
    content: string;
}