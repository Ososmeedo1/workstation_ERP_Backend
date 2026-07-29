/**
 * ===========================================
 * StudySpace ERP Backend - Models Index
 * ===========================================
 *
 * Central export point for all Mongoose models.
 * Ensures all models are registered with Mongoose.
 *
 * @file DB/Models/index.js
 * @description Exports all database models
 */

const userModel = require('./user.model.js');
const auditLogModel = require('./auditLog.model.js');
const workspaceModel = require('./workspace.model.js');
const roomModel = require('./room.model.js');
const sessionModel = require('./session.model.js');
const paymentModel = require('./payment.model.js');
const subscriptionModel = require('./subscription.model.js');
const cafeItemModel = require('./cafeItem.model.js');
const cafeSaleModel = require('./cafeSale.model.js');
const cafeExpenseModel = require('./cafeExpense.model.js');
const financeReportModel = require('./financeReport.model.js');
const categoryModel = require('./category.model.js');

// Export models
module.exports = {
  User: userModel,
  AuditLog: auditLogModel,
  Workspace: workspaceModel,
  Room: roomModel,
  Session: sessionModel,
  Payment: paymentModel,
  Subscription: subscriptionModel,
  CafeItem: cafeItemModel,
  CafeSale: cafeSaleModel,
  CafeExpense: cafeExpenseModel,
  FinanceReport: financeReportModel,
  Category: categoryModel
};
