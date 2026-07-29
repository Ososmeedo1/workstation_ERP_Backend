/**
 * ===========================================
 * StudySpace ERP Backend - User Model
 * ===========================================
 *
 * Mongoose model for User entity.
 * Handles user account data, password hashing, and authentication methods.
 *
 * @file DB/Models/user.model.js
 * @description Mongoose schema and model for Users
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES_ARRAY, USER_STATUS_ARRAY, USER_STATUS } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    required: [true, 'User role is required'],
    enum: {
      values: USER_ROLES_ARRAY,
      message: 'Invalid role'
    }
  },
  status: {
    type: String,
    enum: {
      values: USER_STATUS_ARRAY,
      message: 'Invalid status'
    },
    default: USER_STATUS.ACTIVE
  },
  profileImage: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Indexes for efficient queries
 * - email index is auto-created by `unique: true` on the field definition
 * - role: Role-based filtering
 * - status: Active/inactive filtering (acts as isActive flag)
 */
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {return next();}

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with our new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check if password matches
userSchema.methods.isPasswordMatch = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to return user data without sensitive info
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Override standard toJSON to behave like toSafeObject by default
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const userModel = model('User', userSchema);

module.exports = userModel;
