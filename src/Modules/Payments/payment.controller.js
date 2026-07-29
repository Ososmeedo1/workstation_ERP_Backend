/**
 * ===========================================
 * StudySpace ERP Backend - Payment Controller
 * ===========================================
 *
 * Controller for payment operations.
 * Handles cash payment recording for sessions and cafe sales.
 *
 * IMPORTANT (NON-NEGOTIABLE):
 * This system only supports CASH payments.
 * All paymentMethod values are set to "cash".
 *
 * Payment workflow:
 * 1. Session/cafe sale is completed with pending payment
 * 2. Staff collects cash from customer
 * 3. Staff creates payment record
 * 4. Receipt number is generated
 * 5. Original record's paymentStatus is updated to "paid"
 *
 * @file src/Modules/Payments/payment.controller.js
 * @description Payment endpoints implementation
 */

const { Payment, Session, CafeSale, Workspace } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate } = require('../../Services/audit.service.js');
const { generateReceiptNumber } = require('../../Services/receipt.service.js');
const { PAYMENT_STATUS, PAYMENT_METHODS } = require('../../Utils/enum.utils.js');
const { PAYMENT_TYPES } = Payment;

/**
 * Create a payment for a session
 *
 * @route POST /api/payments/session
 * @access Private (Staff, Admin)
 *
 * This function:
 * 1. Validates session exists and is completed
 * 2. Validates session hasn't been paid
 * 3. Generates unique receipt number (T078)
 * 4. Creates payment record
 * 5. Updates session paymentStatus to "paid" (T079)
 * 6. Logs the action for audit (T083)
 */
const createSessionPayment = catchAsync(async (req, res, next) => {
  const { sessionId, workspace: workspaceId, amount: overrideAmount, notes } = req.body;
  const staffId = req.user._id;

  // Verify workspace exists
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Find the session
  const session = await Session.findById(sessionId)
    .populate('user', 'name email')
    .populate('room', 'name');

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  // Verify session is completed (checked out)
  if (session.status !== 'completed') {
    return next(new AppError('Cannot pay for an active session. Please check out first.', 400));
  }

  // Verify session hasn't been paid already
  if (session.paymentStatus === PAYMENT_STATUS.PAID) {
    return next(new AppError('Session has already been paid', 400));
  }

  // Determine payment amount (use override or session total)
  const paymentAmount = overrideAmount || session.totalAmount;

  if (paymentAmount <= 0) {
    return next(new AppError('Payment amount must be greater than 0', 400));
  }

  // Generate unique receipt number (T078)
  const receiptNumber = generateReceiptNumber();

  // Create the payment record
  const payment = await Payment.create({
    receiptNumber,
    paymentType: PAYMENT_TYPES.SESSION,
    amount: paymentAmount,
    paymentMethod: PAYMENT_METHODS.CASH, // NON-NEGOTIABLE: Cash only
    session: sessionId,
    workspace: workspaceId,
    paidBy: session.user._id,
    receivedBy: staffId,
    paidAt: new Date(),
    notes: notes || ''
  });

  // Update session paymentStatus to "paid" (T079)
  session.paymentStatus = PAYMENT_STATUS.PAID;
  session.payment = payment._id;
  await session.save();

  // Log the payment for audit (T083)
  await logCreate({
    performedBy: staffId,
    targetModel: 'Payment',
    targetId: payment._id,
    description: `Recorded cash payment of ${paymentAmount} for session`,
    metadata: {
      receiptNumber,
      amount: paymentAmount,
      sessionId,
      userName: session.user.name,
      roomName: session.room.name,
      paymentMethod: PAYMENT_METHODS.CASH
    },
    req
  });

  // Populate payment for response
  await payment.populate([
    { path: 'session', select: 'checkIn checkOut durationMinutes' },
    { path: 'paidBy', select: 'name email' },
    { path: 'receivedBy', select: 'name' },
    { path: 'workspace', select: 'name' }
  ]);

  res.status(201).json({
    status: 'success',
    message: 'Payment recorded successfully',
    payload: {
      payment,
      receiptNumber
    }
  });
});

/**
 * Create a payment for a cafe sale
 *
 * @route POST /api/payments/cafe
 * @access Private (Staff, Admin)
 *
 * This function:
 * 1. Validates cafe sale exists
 * 2. Validates sale hasn't been paid
 * 3. Generates unique receipt number
 * 4. Creates payment record
 * 5. Updates cafe sale paymentStatus to "paid"
 * 6. Logs the action for audit
 */
const createCafePayment = catchAsync(async (req, res, next) => {
  const { cafeSaleId, workspace: workspaceId, notes } = req.body;
  const staffId = req.user._id;

  // Verify workspace exists
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Find the cafe sale
  const sale = await CafeSale.findById(cafeSaleId)
    .populate('servedBy', 'name email')
    .populate('customerId', 'name email');

  if (!sale) {
    return next(new AppError('Cafe sale not found', 404));
  }

  // Verify sale hasn't been paid already
  if (sale.paymentStatus === PAYMENT_STATUS.PAID) {
    return next(new AppError('Cafe sale has already been paid', 400));
  }

  // Determine payment amount from sale total
  const paymentAmount = sale.totalAmount;

  if (paymentAmount <= 0) {
    return next(new AppError('Payment amount must be greater than 0', 400));
  }

  // Generate unique receipt number
  const receiptNumber = generateReceiptNumber();

  // Create the payment record
  const payment = await Payment.create({
    receiptNumber,
    paymentType: PAYMENT_TYPES.CAFE,
    amount: paymentAmount,
    paymentMethod: PAYMENT_METHODS.CASH, // NON-NEGOTIABLE: Cash only
    cafeSale: cafeSaleId,
    workspace: workspaceId,
    paidBy: sale.customerId || null,
    receivedBy: staffId,
    paidAt: new Date(),
    notes: notes || ''
  });

  // Update cafe sale payment status
  sale.paymentStatus = PAYMENT_STATUS.PAID;
  sale.payment = payment._id;
  await sale.save();

  // Log the payment for audit
  await logCreate({
    performedBy: staffId,
    targetModel: 'Payment',
    targetId: payment._id,
    description: `Recorded cash payment of ${paymentAmount} for cafe sale`,
    metadata: {
      receiptNumber,
      amount: paymentAmount,
      cafeSaleId,
      itemCount: sale.items.length,
      servedBy: sale.servedBy?.name,
      paymentMethod: PAYMENT_METHODS.CASH
    },
    req
  });

  // Populate payment for response
  await payment.populate([
    { path: 'cafeSale', select: 'items totalAmount saleTime' },
    { path: 'paidBy', select: 'name email' },
    { path: 'receivedBy', select: 'name' },
    { path: 'workspace', select: 'name' }
  ]);

  res.status(201).json({
    status: 'success',
    message: 'Payment recorded successfully',
    payload: {
      payment,
      receiptNumber
    }
  });
});

/**
 * List payments with filters
 *
 * @route GET /api/payments
 * @access Private (Staff, Admin)
 */
const listPayments = catchAsync(async (req, res, next) => {
  const {
    workspace,
    paymentType,
    session,
    cafeSale,
    paidBy,
    receivedBy,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sort = 'paidAt:desc'
  } = req.query;

  // Build filter object
  const filter = {};

  if (workspace) {filter.workspace = workspace;}
  if (paymentType) {filter.paymentType = paymentType;}
  if (session) {filter.session = session;}
  if (cafeSale) {filter.cafeSale = cafeSale;}
  if (paidBy) {filter.paidBy = paidBy;}
  if (receivedBy) {filter.receivedBy = receivedBy;}

  // Date range filter
  if (startDate || endDate) {
    filter.paidAt = {};
    if (startDate) {filter.paidAt.$gte = new Date(startDate);}
    if (endDate) {filter.paidAt.$lte = new Date(endDate);}
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Build and execute query
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .select('receiptNumber paymentType amount paymentMethod session cafeSale paidBy receivedBy workspace paidAt createdAt')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('session', 'checkIn checkOut durationMinutes totalAmount')
      .populate('paidBy', 'name email')
      .populate('receivedBy', 'name')
      .populate('workspace', 'name')
      .lean(),
    Payment.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Payments retrieved successfully',
    payload: {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * Get a single payment by ID
 *
 * @route GET /api/payments/:id
 * @access Private (Staff, Admin)
 */
const getPayment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const payment = await Payment.findById(id)
    .populate('session')
    .populate('cafeSale')
    .populate('paidBy', 'name email phone')
    .populate('receivedBy', 'name')
    .populate('workspace', 'name address')
    .lean();

  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Payment retrieved successfully',
    payload: { payment }
  });
});

/**
 * Get a payment by receipt number
 *
 * @route GET /api/payments/receipt/:receiptNumber
 * @access Private (Staff, Admin)
 */
const getByReceipt = catchAsync(async (req, res, next) => {
  const { receiptNumber } = req.params;

  const payment = await Payment.findOne({ receiptNumber })
    .populate('session')
    .populate('cafeSale')
    .populate('paidBy', 'name email phone')
    .populate('receivedBy', 'name')
    .populate('workspace', 'name address')
    .lean();

  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Payment retrieved successfully',
    payload: { payment }
  });
});

/**
 * Get today's payment summary
 *
 * @route GET /api/payments/summary/today
 * @access Private (Staff, Admin)
 */
const getTodaySummary = catchAsync(async (req, res, next) => {
  const { workspace } = req.query;

  // Get start and end of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Build filter
  const filter = {
    paidAt: { $gte: today, $lt: tomorrow }
  };

  if (workspace) {
    filter.workspace = workspace;
  }

  // Aggregate payment data
  const summary = await Payment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$paymentType',
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Format summary
  const result = {
    session: { count: 0, total: 0 },
    cafe: { count: 0, total: 0 },
    overall: { count: 0, total: 0 }
  };

  summary.forEach(item => {
    result[item._id] = { count: item.count, total: item.total };
    result.overall.count += item.count;
    result.overall.total += item.total;
  });

  res.status(200).json({
    status: 'success',
    message: 'Today\'s payment summary retrieved',
    payload: {
      date: today.toISOString().split('T')[0],
      summary: result
    }
  });
});

module.exports = {
  createSessionPayment,
  createCafePayment,
  listPayments,
  getPayment,
  getByReceipt,
  getTodaySummary
};
