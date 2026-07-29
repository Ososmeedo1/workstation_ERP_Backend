const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    trim: true
  },
  value: {
    type: String,
    required: [true, 'Category value is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cafeCategory', 'expenseType'],
    default: 'cafeCategory'
  },
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

categorySchema.index({ type: 1, sortOrder: 1 });
categorySchema.index({ value: 1 }, { unique: true });

const Category = model('Category', categorySchema);

module.exports = Category;
