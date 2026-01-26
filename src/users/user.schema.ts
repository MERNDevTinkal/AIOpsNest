import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  password: string; // hashed

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, required: false })
  emailVerificationToken?: string;

  @Prop({ type: String, required: false })
  passwordResetToken?: string;

  @Prop({ type: String, required: false })
  refreshToken?: string; // hashed refresh token

  @Prop({ default: [] })
  roles: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
