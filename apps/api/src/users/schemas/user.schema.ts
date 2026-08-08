import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuthProvider } from '@ablespace/shared';

export type UserDocument = HydratedDocument<User>;

/**
 * An application user, keyed by Firebase UID.
 *
 * Records are created just-in-time the first time a verified token is seen
 * (see AuthService.resolveSession) — there is no separate signup endpoint,
 * because Firebase owns account creation.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  /**
   * The Firebase UID from the verified ID token. This is the join key between
   * Firebase and our database and is never accepted from a request body.
   */
  @Prop({ required: true, unique: true, index: true })
  firebaseUid: string;

  /** Anonymous guests have no email; Google users do. */
  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  /** Job title shown on the profile screen. */
  @Prop({ type: String, default: null, maxlength: 120 })
  title: string | null;

  @Prop({ type: String, default: null, maxlength: 60 })
  username: string | null;

  @Prop({ required: true, default: false })
  isGuest: boolean;

  @Prop({
    type: String,
    enum: Object.values(AuthProvider),
    required: true,
    default: AuthProvider.ANONYMOUS,
  })
  provider: AuthProvider;

  // Supplied by `timestamps: true`; declared for type-safety at call sites.
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
