import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async create(user: Partial<User>) {
    const created = new this.userModel(user);
    return created.save();
  }

  async setRefreshToken(userId: string, hashedToken: string | null) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.refreshToken = hashedToken || undefined;
    await user.save();
  }

  async markEmailVerified(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
  }

  async setPasswordResetToken(email: string, token: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    user.passwordResetToken = token;
    await user.save();
  }
}
