import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    // select: false keeps the hash out of normal queries; login asks for it explicitly.
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// Hash a plain password before storing it. Plain passwords are never saved.
userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Shape sent to clients: no hash, no internal version key.
userSchema.methods.toPublic = function () {
  return { id: this._id.toString(), name: this.name, email: this.email, createdAt: this.createdAt };
};

export default mongoose.model('User', userSchema);
