import {
    IsNotEmpty,
    IsNumber,
    IsString
} from "class-validator";

export class JoinChatDto {
    @IsNumber()
    @IsNotEmpty()
    userId: number

    @IsString()
    @IsNotEmpty()
    username: string
}