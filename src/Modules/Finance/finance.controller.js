/**
 * ===========================================
 * StudySpace ERP Backend - Finance Controller
 * ===========================================
 *
 * Controller for financial reporting and expense management.
 * Implements MongoDB aggregation pipelines for report generation.
 *
 * Report Types:
 * - Daily: Single day income, expenses, profit
 * - Weekly: 7-day aggregate with daily breakdown
 * - Monthly: Calendar month aggregate with weekly breakdown
 *
 * Calculations:
 * - Session Income: Sum of paid session amounts
 * - Cafe Income: Sum of paid cafe sale amounts
 * - Total Income: Session Income + Cafe Income
 * - Net Profit: Total Income - Total Expenses
 *
 * Business Rules:
 * - All financial data is cash-only (NON-NEGOTIABLE)
 * - Reports are generated on-demand via aggregation
 * - Cached reports available for performance
 *
 * @file src/Modules/Finance/finance.controller.js
 * @description Finance endpoints implementation
 * @tasks T131, T132, T133, T134, T136
 */

const {
  Payment,
  CafeSale,
  CafeExpense
} = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate } = require('../../Services/audit.service.js');
const { PAYMENT_STATUS } = require('../../Utils/enum.utils.js');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get start and end of a day (UTC)
 * @param {Date} date - Target date
 * @returns {Object} { start, end }
 */
const getDayBounds = (date) => {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Get start and end of a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Object} { start, end }
 */
const getMonthBounds = (year, month) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { start, end };
};

/**
 * Calculate session income for a date range
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Promise<Object>} Session income data
 */
const calculateSessionIncome = async (startDate, endDate) => {
  const result = await Payment.aggregate([
    {
      $match: {
        session: { $ne: null },
        paidAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      // Project only needed fields to reduce pipeline memory usage
      $project: {
        amount: 1,
        session: 1
      }
    },
    {
      // Lookup session details for room type breakdown
      $lookup: {
        from: 'sessions',
        localField: 'session',
        foreignField: '_id',
        as: 'session'
      }
    },
    {
      $unwind: { path: '$session', preserveNullAndEmptyArrays: true }
    },
    {
      // Lookup room details
      $lookup: {
        from: 'rooms',
        localField: 'session.room',
        foreignField: '_id',
        as: 'room'
      }
    },
    {
      $unwind: { path: '$room', preserveNullAndEmptyArrays: true }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        totalHours: { $sum: { $divide: ['$session.durationMinutes', 60] } },
        byRoomType: {
          $push: {
            type: '$room.type',
            amount: '$amount'
          }
        }
      }
    }
  ]);

  if (result.length === 0) {
    return { total: 0, count: 0, totalHours: 0, byRoomType: [] };
  }

  // Group by room type
  const roomTypeMap = {};
  result[0].byRoomType.forEach(item => {
    const type = item.type || 'unknown';
    if (!roomTypeMap[type]) {
      roomTypeMap[type] = { type, count: 0, amount: 0 };
    }
    roomTypeMap[type].count++;
    roomTypeMap[type].amount += item.amount;
  });

  return {
    total: result[0].total || 0,
    count: result[0].count || 0,
    totalHours: Math.round((result[0].totalHours || 0) * 100) / 100,
    byRoomType: Object.values(roomTypeMap)
  };
};

/**
 * Calculate cafe income for a date range
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Promise<Object>} Cafe income data
 */
const calculateCafeIncome = async (startDate, endDate) => {
  const result = await CafeSale.aggregate([
    {
      $match: {
        paymentStatus: PAYMENT_STATUS.PAID,
        saleTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $unwind: '$items'
    },
    {
      // Lookup item details for category
      $lookup: {
        from: 'cafeitems',
        localField: 'items.itemId',
        foreignField: '_id',
        as: 'itemDetails'
      }
    },
    {
      $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$items.subtotal' },
        salesCount: { $addToSet: '$_id' },
        byCategory: {
          $push: {
            category: '$itemDetails.category',
            amount: '$items.subtotal'
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        salesCount: { $size: '$salesCount' },
        byCategory: 1
      }
    }
  ]);

  if (result.length === 0) {
    return { total: 0, salesCount: 0, byCategory: [] };
  }

  // Group by category
  const categoryMap = {};
  result[0].byCategory.forEach(item => {
    const category = item.category || 'other';
    if (!categoryMap[category]) {
      categoryMap[category] = { category, count: 0, amount: 0 };
    }
    categoryMap[category].count++;
    categoryMap[category].amount += item.amount;
  });

  return {
    total: result[0].total || 0,
    salesCount: result[0].salesCount || 0,
    byCategory: Object.values(categoryMap)
  };
};

/**
 * Calculate expenses for a date range
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Promise<Object>} Expense data
 */
const calculateExpenses = async (startDate, endDate) => {
  const result = await CafeExpense.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        byType: {
          $push: {
            type: '$expenseType',
            amount: '$amount'
          }
        }
      }
    }
  ]);

  if (result.length === 0) {
    return { total: 0, count: 0, byType: [] };
  }

  // Group by expense type
  const typeMap = {};
  result[0].byType.forEach(item => {
    const type = item.type || 'other';
    if (!typeMap[type]) {
      typeMap[type] = { type, count: 0, amount: 0 };
    }
    typeMap[type].count++;
    typeMap[type].amount += item.amount;
  });

  return {
    total: result[0].total || 0,
    count: result[0].count || 0,
    byType: Object.values(typeMap)
  };
};

// ============================================
// REPORT ENDPOINTS
// ============================================

/**
 * Generate daily financial report (T131)
 *
 * Calculates:
 * - Session income from paid sessions on the date
 * - Cafe income from paid cafe sales on the date
 * - Expenses recorded for the date
 * - Net profit
 *
 * @route GET /api/finance/reports/daily
 * @access Private (Admin only)
 */
const getDailyReport = catchAsync(async (req, res, next) => {
  const { date } = req.query;
  const targetDate = new Date(date);
  const { start, end } = getDayBounds(targetDate);

  // Calculate all metrics in parallel
  const [sessionData, cafeData, expenseData] = await Promise.all([
    calculateSessionIncome(start, end),
    calculateCafeIncome(start, end),
    calculateExpenses(start, end)
  ]);

  // Calculate totals
  const totalIncome = sessionData.total + cafeData.total;
  const netProfit = totalIncome - expenseData.total;

  const report = {
    date: targetDate.toISOString().split('T')[0],
    sessionIncome: sessionData.total,
    cafeIncome: cafeData.total,
    totalIncome,
    totalExpenses: expenseData.total,
    netProfit,
    breakdown: {
      sessions: {
        count: sessionData.count,
        totalHours: sessionData.totalHours,
        byRoomType: sessionData.byRoomType
      },
      cafe: {
        salesCount: cafeData.salesCount,
        byCategory: cafeData.byCategory
      },
      expenses: {
        count: expenseData.count,
        byType: expenseData.byType
      }
    }
  };

  // Audit log for report generation (T136)
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'FinanceReport',
    description: `Generated daily report for ${report.date}`,
    metadata: { reportType: 'daily', date: report.date },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Daily report generated successfully',
    payload: { report }
  });
});

/**
 * Generate weekly financial report (T132)
 *
 * Calculates aggregate data for a 7-day period.
 * Includes daily breakdown for trend analysis.
 *
 * @route GET /api/finance/reports/weekly
 * @access Private (Admin only)
 */
const getWeeklyReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  // Calculate all metrics in parallel
  const [sessionData, cafeData, expenseData] = await Promise.all([
    calculateSessionIncome(start, end),
    calculateCafeIncome(start, end),
    calculateExpenses(start, end)
  ]);

  // Calculate totals
  const totalIncome = sessionData.total + cafeData.total;
  const netProfit = totalIncome - expenseData.total;

  // Get daily breakdown for the week
  const dailyBreakdown = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const { start: dayStart, end: dayEnd } = getDayBounds(currentDate);

    const [daySession, dayCafe, dayExpense] = await Promise.all([
      calculateSessionIncome(dayStart, dayEnd),
      calculateCafeIncome(dayStart, dayEnd),
      calculateExpenses(dayStart, dayEnd)
    ]);

    dailyBreakdown.push({
      date: currentDate.toISOString().split('T')[0],
      sessionIncome: daySession.total,
      cafeIncome: dayCafe.total,
      totalIncome: daySession.total + dayCafe.total,
      expenses: dayExpense.total,
      profit: (daySession.total + dayCafe.total) - dayExpense.total
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const report = {
    periodStart: startDate,
    periodEnd: endDate,
    sessionIncome: sessionData.total,
    cafeIncome: cafeData.total,
    totalIncome,
    totalExpenses: expenseData.total,
    netProfit,
    breakdown: {
      sessions: {
        count: sessionData.count,
        totalHours: sessionData.totalHours,
        byRoomType: sessionData.byRoomType
      },
      cafe: {
        salesCount: cafeData.salesCount,
        byCategory: cafeData.byCategory
      },
      expenses: {
        count: expenseData.count,
        byType: expenseData.byType
      }
    },
    dailyBreakdown
  };

  // Audit log for report generation (T136)
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'FinanceReport',
    description: `Generated weekly report for ${startDate} to ${endDate}`,
    metadata: { reportType: 'weekly', startDate, endDate },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Weekly report generated successfully',
    payload: { report }
  });
});

/**
 * Generate monthly financial report (T133)
 *
 * Calculates aggregate data for a calendar month.
 * Includes weekly breakdown for trend analysis.
 *
 * @route GET /api/finance/reports/monthly
 * @access Private (Admin only)
 */
const getMonthlyReport = catchAsync(async (req, res, next) => {
  const { year, month } = req.query;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  const { start, end } = getMonthBounds(yearNum, monthNum);

  // Calculate all metrics in parallel
  const [sessionData, cafeData, expenseData] = await Promise.all([
    calculateSessionIncome(start, end),
    calculateCafeIncome(start, end),
    calculateExpenses(start, end)
  ]);

  // Calculate totals
  const totalIncome = sessionData.total + cafeData.total;
  const netProfit = totalIncome - expenseData.total;

  // Get weekly breakdown for the month
  const weeklyBreakdown = [];
  let weekStart = new Date(start);
  let weekNumber = 1;

  while (weekStart <= end) {
    let weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Don't go past month end
    if (weekEnd > end) {
      weekEnd = new Date(end);
    }

    const { start: wStart, end: wEnd } = {
      start: new Date(weekStart.setUTCHours(0, 0, 0, 0)),
      end: new Date(weekEnd.setUTCHours(23, 59, 59, 999))
    };

    const [weekSession, weekCafe, weekExpense] = await Promise.all([
      calculateSessionIncome(wStart, wEnd),
      calculateCafeIncome(wStart, wEnd),
      calculateExpenses(wStart, wEnd)
    ]);

    weeklyBreakdown.push({
      week: weekNumber,
      startDate: wStart.toISOString().split('T')[0],
      endDate: wEnd.toISOString().split('T')[0],
      sessionIncome: weekSession.total,
      cafeIncome: weekCafe.total,
      totalIncome: weekSession.total + weekCafe.total,
      expenses: weekExpense.total,
      profit: (weekSession.total + weekCafe.total) - weekExpense.total
    });

    weekNumber++;
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  const report = {
    year: yearNum,
    month: monthNum,
    monthName: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
    periodStart: start.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
    sessionIncome: sessionData.total,
    cafeIncome: cafeData.total,
    totalIncome,
    totalExpenses: expenseData.total,
    netProfit,
    breakdown: {
      sessions: {
        count: sessionData.count,
        totalHours: sessionData.totalHours,
        byRoomType: sessionData.byRoomType
      },
      cafe: {
        salesCount: cafeData.salesCount,
        byCategory: cafeData.byCategory
      },
      expenses: {
        count: expenseData.count,
        byType: expenseData.byType
      }
    },
    weeklyBreakdown
  };

  // Audit log for report generation (T136)
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'FinanceReport',
    description: `Generated monthly report for ${report.monthName} ${yearNum}`,
    metadata: { reportType: 'monthly', year: yearNum, month: monthNum },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Monthly report generated successfully',
    payload: { report }
  });
});

/**
 * Get financial summary for dashboard (T134)
 *
 * Returns quick KPI summary:
 * - Today's metrics
 * - This week's metrics
 * - This month's metrics
 * - Comparison percentages
 *
 * @route GET /api/finance/summary
 * @access Private (Admin only)
 */
const getFinanceSummary = catchAsync(async (req, res, next) => {
  const now = new Date();

  // Today
  const { start: todayStart, end: todayEnd } = getDayBounds(now);

  // This week (Monday to Sunday)
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  // This month
  const { start: monthStart, end: monthEnd } = getMonthBounds(
    now.getFullYear(),
    now.getMonth() + 1
  );

  // Last week for comparison
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  lastWeekEnd.setUTCHours(23, 59, 59, 999);

  // Last month for comparison
  const lastMonthDate = new Date(now);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const { start: lastMonthStart, end: lastMonthEnd } = getMonthBounds(
    lastMonthDate.getFullYear(),
    lastMonthDate.getMonth() + 1
  );

  // Calculate all metrics in parallel
  const [
    todaySession, todayCafe, todayExpense,
    weekSession, weekCafe, weekExpense,
    monthSession, monthCafe, monthExpense,
    lastWeekSession, lastWeekCafe, _lastWeekExpense,
    lastMonthSession, lastMonthCafe, _lastMonthExpense
  ] = await Promise.all([
    // Today
    calculateSessionIncome(todayStart, todayEnd),
    calculateCafeIncome(todayStart, todayEnd),
    calculateExpenses(todayStart, todayEnd),
    // This week
    calculateSessionIncome(weekStart, weekEnd),
    calculateCafeIncome(weekStart, weekEnd),
    calculateExpenses(weekStart, weekEnd),
    // This month
    calculateSessionIncome(monthStart, monthEnd),
    calculateCafeIncome(monthStart, monthEnd),
    calculateExpenses(monthStart, monthEnd),
    // Last week
    calculateSessionIncome(lastWeekStart, lastWeekEnd),
    calculateCafeIncome(lastWeekStart, lastWeekEnd),
    calculateExpenses(lastWeekStart, lastWeekEnd),
    // Last month
    calculateSessionIncome(lastMonthStart, lastMonthEnd),
    calculateCafeIncome(lastMonthStart, lastMonthEnd),
    calculateExpenses(lastMonthStart, lastMonthEnd)
  ]);

  // Calculate comparisons
  const thisWeekIncome = weekSession.total + weekCafe.total;
  const lastWeekIncome = lastWeekSession.total + lastWeekCafe.total;
  const thisMonthIncome = monthSession.total + monthCafe.total;
  const lastMonthIncome = lastMonthSession.total + lastMonthCafe.total;

  const weekOverWeek = lastWeekIncome > 0
    ? Math.round(((thisWeekIncome - lastWeekIncome) / lastWeekIncome) * 100)
    : 0;

  const monthOverMonth = lastMonthIncome > 0
    ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
    : 0;

  const summary = {
    today: {
      sessionIncome: todaySession.total,
      cafeIncome: todayCafe.total,
      totalExpenses: todayExpense.total,
      netProfit: todaySession.total + todayCafe.total - todayExpense.total,
      sessions: todaySession.count,
      cafeSales: todayCafe.salesCount
    },
    thisWeek: {
      sessionIncome: weekSession.total,
      cafeIncome: weekCafe.total,
      totalExpenses: weekExpense.total,
      netProfit: thisWeekIncome - weekExpense.total,
      sessions: weekSession.count,
      cafeSales: weekCafe.salesCount
    },
    thisMonth: {
      sessionIncome: monthSession.total,
      cafeIncome: monthCafe.total,
      totalExpenses: monthExpense.total,
      netProfit: thisMonthIncome - monthExpense.total,
      sessions: monthSession.count,
      cafeSales: monthCafe.salesCount
    },
    comparison: {
      weekOverWeek,
      monthOverMonth
    }
  };

  res.status(200).json({
    status: 'success',
    message: 'Finance summary retrieved successfully',
    payload: { summary }
  });
});

// ============================================
// EXPENSE ENDPOINTS
// ============================================

/**
 * List expenses with filters
 *
 * @route GET /api/finance/expenses
 * @access Private (Admin only)
 */
const listExpenses = catchAsync(async (req, res, next) => {
  const {
    search,
    startDate,
    endDate,
    expenseType,
    page = 1,
    limit = 20,
    sort = 'date:desc'
  } = req.query;

  // Build filter
  const filter = {};

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (expenseType) {
    filter.expenseType = expenseType;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { description: regex },
      { vendor: regex }
    ];
  }

  // Build sort
  const [sortField, sortDir] = sort.split(':');
  const sortOrder = sortDir === 'asc' ? 1 : -1;

  // Execute query
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [expenses, total] = await Promise.all([
    CafeExpense.find(filter)
      .select('description amount expenseType date vendor recordedBy workspace createdAt notes')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('recordedBy', 'name')
      .lean(),
    CafeExpense.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Expenses retrieved successfully',
    payload: {
      expenses,
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
 * Get expense by ID
 *
 * @route GET /api/finance/expenses/:id
 * @access Private (Admin only)
 */
const getExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const expense = await CafeExpense.findById(id)
    .populate('recordedBy', 'name email')
    .lean();

  if (!expense) {
    return next(new AppError('Expense not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Expense retrieved successfully',
    payload: { expense }
  });
});

/**
 * Create a new expense
 *
 * @route POST /api/finance/expenses
 * @access Private (Admin only)
 */
const createExpense = catchAsync(async (req, res, next) => {
  const expenseData = {
    ...req.body,
    recordedBy: req.user._id
  };

  const expense = await CafeExpense.create(expenseData);

  // Audit log
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'CafeExpense',
    targetId: expense._id,
    description: `Created expense: ${expense.description} (${expense.amount})`,
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'Expense created successfully',
    payload: { expense }
  });
});

/**
 * Update an expense
 *
 * @route PUT /api/finance/expenses/:id
 * @access Private (Admin only)
 */
const updateExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const expense = await CafeExpense.findById(id);
  if (!expense) {
    return next(new AppError('Expense not found', 404));
  }

  // Store old values for audit
  const oldValues = expense.toObject();

  // Update
  Object.assign(expense, req.body);
  await expense.save();

  // Audit log
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'CafeExpense',
    targetId: expense._id,
    description: `Updated expense: ${expense.description}`,
    changes: { before: oldValues, after: req.body },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Expense updated successfully',
    payload: { expense }
  });
});

/**
 * Delete an expense
 *
 * @route DELETE /api/finance/expenses/:id
 * @access Private (Admin only)
 */
const deleteExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const expense = await CafeExpense.findById(id);
  if (!expense) {
    return next(new AppError('Expense not found', 404));
  }

  await expense.deleteOne();

  // Audit log
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'CafeExpense',
    targetId: expense._id,
    description: `Deleted expense: ${expense.description}`,
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Expense deleted successfully'
  });
});

module.exports = {
  // Reports
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getFinanceSummary,
  // Expenses
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
};
