/**
 * ===========================================
 * StudySpace ERP Backend - Auth Validation
 * ===========================================
 *
 * Joi validation schemas for authentication routes.
 *
 * @file src/Modules/Auth/auth.validation_schema.js
 * @description Validation rules for login and registration
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');

const registerSchema = {
  body: Joi.object({
    name: generalRules.name.required(),
    email: generalRules.email.required(),
    password: generalRules.password.required(),
    cPassword: generalRules.password.valid(Joi.ref('password')).required().messages({
      'any.only': 'Confirm password must match password'
    }),
    phone: generalRules.phone.optional(),
    role: Joi.string().optional()
  }).required()
};

const loginSchema = {
  body: Joi.object({
    email: generalRules.email.required(),
    password: generalRules.password.required()
  }).required()
};

module.exports = {
  registerSchema,
  loginSchema
};
