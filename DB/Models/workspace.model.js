/**
 * ===========================================
 * StudySpace ERP Backend - Workspace Model
 * ===========================================
 *
 * Mongoose model for Workspace entity.
 * Represents the coworking space or study space business location.
 * A workspace contains multiple rooms where sessions take place.
 *
 * @file DB/Models/workspace.model.js
 * @description Mongoose schema and model for Workspaces
 */

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

/**
 * Workspace Schema
 *
 * Defines the structure for workspace documents.
 * Each workspace represents a physical location of the business.
 */
const workspaceSchema = new Schema({
  /**
   * Name of the workspace
   * Required field for identification
   * Example: "StudySpace Downtown", "StudySpace University"
   */
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    minlength: [3, 'Workspace name must be at least 3 characters'],
    maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    trim: true
  },

  /**
   * Physical address of the workspace
   * Optional field for location details
   * Example: "123 Main Street, City Center"
   */
  address: {
    type: String,
    maxlength: [200, 'Address cannot exceed 200 characters'],
    trim: true,
    default: ''
  }
}, {
  /**
   * Schema options
   * - timestamps: Automatically adds createdAt and updatedAt fields
   * - versionKey: Disable __v field (not needed for this simple model)
   */
  timestamps: true,
  versionKey: false
});

/**
 * Create index on name for faster lookups
 */
workspaceSchema.index({ name: 1 });

/**
 * Transform output when converting to JSON
 * Renames _id to id for cleaner API responses
 */
workspaceSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

/**
 * Workspace Model
 * @type {mongoose.Model}
 */
const Workspace = model('Workspace', workspaceSchema);

module.exports = Workspace;
