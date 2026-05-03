import { IsNotEmpty, IsString, Length } from 'class-validator'

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment body is required' })
  @Length(1, 1000, { message: 'Comment must be 1–1000 characters' })
  body!: string
}
