/**
 * ===========================================
 * StudySpace ERP Backend - AuditLog Model
 * ===========================================
 *
 * Mongoose model for tracking user actions.
 * Provides an audit trail for critical operations.
 *
 * @file DB/Models/auditLog.model.js
 * @description Mongoose schema and model for AuditLogs
 */

const mongoose = require('mongoose');
const { AUDIT_ACTIONS_ARRAY } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

const auditLogSchema = new Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: {
      values: AUDIT_ACTIONS_ARRAY,
      message: 'Invalid action type'
    }
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performer is required']
  },
  targetModel: {
    type: String,
    required: [true, 'Target model is required'],
    trim: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: false // Optional - some actions may not have a specific target
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  changes: {
    type: Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
// Index for entity history lookups
auditLogSchema.index({ targetId: 1 });

// Virtual to populate user details
auditLogSchema.virtual('performer', {
  ref: 'User',
  localField: 'performedBy',
  foreignField: '_id',
  justOne: true
});

const auditLogModel = model('AuditLog', auditLogSchema);

module.exports = auditLogModel;
