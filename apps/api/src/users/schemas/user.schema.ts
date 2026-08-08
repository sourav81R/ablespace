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
   * The Firebase UID from the verified ID token.
   *
   * Firebase is the identity source; this is the join key between it and our
   * database, and it is never accepted from a request body. The document's
   * `_id` remains the application's own internal identity — every foreign key
   * in the system references that, not the UID, so the database does not depend
   * on the identity provider's key format.
   */
  @Prop({ required: true, unique: true, index: true })
  firebaseUid: string;

  /** Anonymous users have no email; Google users do. */
  @Prop({ type: String, default: null })
  email: string | null;

  /** The name shown throughout the UI. */
  @Prop({ required: true, trim: true, maxlength: 120 })
  displayName: string;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  /** Job title shown on the profile screen. */
  @Prop({ type: String, default: null, maxlength: 120 })
  title: string | null;

  @Prop({ type: String, default: null, maxlength: 60 })
  username: string | null;

  /** True for Firebase Anonymous Authentication (guest login). */
  @Prop({ required: true, default: false })
  isAnonymous: boolean;

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

// Email lookup, used when resolving a person by address rather than by UID.
//
// Sparse rather than plain: anonymous users have no email, and a non-sparse
// index would store an entry for every one of them under `null`. Not unique
// either — Firebase already guarantees one account per address, and a unique
// index here would reject the many legitimate `null` values.
UserSchema.index({ email: 1 }, { sparse: true });

// Username is optional but must identify exactly one person when set. `sparse`
// keeps the uniqueness constraint from applying to users who have not chosen
// one.
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
