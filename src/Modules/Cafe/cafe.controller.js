/**
 * ===========================================
 * StudySpace ERP Backend - Cafe Controller
 * ===========================================
 *
 * Controller for cafe operations.
 * Handles item CRUD, sales creation, and inventory management.
 *
 * Features:
 * - Item CRUD (list, create, update, delete) - T108
 * - Sales creation and listing - T109
 * - Auto-decrement inventory on sale - T110
 * - Stock validation before sale - T111
 * - Audit logging for cafe operations - T114
 * - Inventory restock with audit - T142, T145
 * - Low-stock query filter - T143
 * - Expense CRUD endpoints - T144
 *
 * Business Rules:
 * - Cash-only payments (NON-NEGOTIABLE)
 * - Stock must be available before sale is allowed
 * - Inventory auto-decrements when sale is created
 * - Out-of-stock items cannot be sold
 *
 * @file src/Modules/Cafe/cafe.controller.js
 * @description Cafe endpoints implementation
 * @tasks T108, T109, T110, T111, T114, T142, T143, T144, T145
 */

const { CafeItem, CafeSale, CafeExpense } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate, logUpdate, logDelete } = require('../../Services/audit.service.js');
const { PAYMENT_STATUS } = require('../../Utils/enum.utils.js');

// ===========================================
// CAFE ITEM CONTROLLERS (T108)
// ===========================================

/**
 * List cafe items with filters
 *
 * @route GET /api/cafe/items
 * @access Private (Staff, Admin)
 *
 * Query Parameters:
 * - category: Filter by category
 * - isAvailable: Filter by availability
 * - lowStockOnly: Show only low stock items
 * - search: Search by name
 * - page, limit: Pagination
 * - sort: Sort field and direction
 */
const listItems = catchAsync(async (req, res, next) => {
  const {
    category,
    isAvailable,
    lowStockOnly,
    search,
    workspace,
    page = 1,
    limit = 50,
    sort = 'name:asc'
  } = req.query;

  // Build filter object
  const filter = {};

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Availability filter
  if (isAvailable !== undefined) {
    filter.isAvailable = isAvailable === 'true' || isAvailable === true;
  }

  // Low stock filter - items where quantity <= lowStockThreshold
  if (lowStockOnly === 'true' || lowStockOnly === true) {
    filter.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
  }

  // Name search (case-insensitive partial match)
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  // Workspace filter
  if (workspace) {
    filter.workspace = workspace;
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query with pagination
  const [items, total] = await Promise.all([
    CafeItem.find(filter)
      .select('name category description price cost quantity lowStockThreshold unit isAvailable imageUrl workspace createdAt')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    CafeItem.countDocuments(filter)
  ]);

  // Add computed fields to response
  const itemsWithComputed = items.map(item => ({
    ...item,
    isLowStock: item.quantity <= item.lowStockThreshold,
    isOutOfStock: item.quantity === 0,
    profitMargin: item.price > 0 ? ((item.price - item.cost) / item.price * 100).toFixed(2) : 0
  }));

  res.status(200).json({
    status: 'success',
    message: 'Items retrieved successfully',
    payload: {
      items: itemsWithComputed,
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
 * Get a single cafe item by ID
 *
 * @route GET /api/cafe/items/:id
 * @access Private (Staff, Admin)
 */
const getItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const item = await CafeItem.findById(id).lean();

  if (!item) {
    return next(new AppError('Item not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Item retrieved successfully',
    payload: { item }
  });
});

/**
 * Create a new cafe item
 *
 * @route POST /api/cafe/items
 * @access Private (Admin only)
 */
const createItem = catchAsync(async (req, res, next) => {
  const {
    name,
    category,
    description,
    price,
    cost,
    quantity,
    lowStockThreshold,
    unit,
    isAvailable,
    imageUrl,
    workspace
  } = req.body;

  // Check for duplicate item name (optional - can be allowed)
  const existingItem = await CafeItem.findOne({ name, category }).lean();
  if (existingItem) {
    return next(new AppError(`Item "${name}" already exists in ${category} category`, 409));
  }

  // Create the item
  const item = await CafeItem.create({
    name,
    category,
    description: description || '',
    price,
    cost,
    quantity,
    lowStockThreshold: lowStockThreshold || 5,
    unit: unit || 'pieces',
    isAvailable: isAvailable !== false, // Default to true
    imageUrl: imageUrl || null,
    workspace
  });

  // Log the creation (audit)
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'CafeItem',
    targetId: item._id,
    description: `Created cafe item: ${name}`,
    metadata: {
      itemName: name,
      category,
      price,
      initialQuantity: quantity
    },
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'Item created successfully',
    payload: { item }
  });
});

/**
 * Update a cafe item
 *
 * @route PATCH /api/cafe/items/:id
 * @access Private (Admin only)
 */
const updateItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find the item first to get old values for audit
  const oldItem = await CafeItem.findById(id);
  if (!oldItem) {
    return next(new AppError('Item not found', 404));
  }

  // Check for duplicate name if name is being changed
  if (updateData.name && updateData.name !== oldItem.name) {
    const existingItem = await CafeItem.findOne({
      name: updateData.name,
      category: updateData.category || oldItem.category,
      _id: { $ne: id }
    }).lean();
    if (existingItem) {
      return next(new AppError(`Item "${updateData.name}" already exists`, 409));
    }
  }

  // Update the item
  const item = await CafeItem.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // Log the update (audit)
  await logUpdate({
    performedBy: req.user._id,
    targetModel: 'CafeItem',
    targetId: item._id,
    description: `Updated cafe item: ${item.name}`,
    changes: {
      before: oldItem.toObject(),
      after: item.toObject(),
      fields: Object.keys(updateData)
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Item updated successfully',
    payload: { item }
  });
});

/**
 * Delete a cafe item (soft delete - mark as unavailable)
 *
 * @route DELETE /api/cafe/items/:id
 * @access Private (Admin only)
 *
 * Note: We soft delete by marking isAvailable = false
 * to preserve sales history references.
 */
const deleteItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const item = await CafeItem.findById(id);
  if (!item) {
    return next(new AppError('Item not found', 404));
  }

  // Soft delete - mark as unavailable
  item.isAvailable = false;
  await item.save();

  // Log the deletion (audit)
  await logDelete({
    performedBy: req.user._id,
    targetModel: 'CafeItem',
    targetId: item._id,
    description: `Deleted (deactivated) cafe item: ${item.name}`,
    metadata: {
      itemName: item.name,
      category: item.category
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Item deleted successfully',
    payload: { item }
  });
});

/**
 * Restock a cafe item
 *
 * @route POST /api/cafe/items/:id/restock
 * @access Private (Staff, Admin)
 */
const restockItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { quantity, notes } = req.body;

  const item = await CafeItem.findById(id);
  if (!item) {
    return next(new AppError('Item not found', 404));
  }

  const oldQuantity = item.quantity;

  // Use the model method to restock
  item.restockItem(quantity);
  await item.save();

  // Log the restock (audit)
  await logUpdate({
    performedBy: req.user._id,
    targetModel: 'CafeItem',
    targetId: item._id,
    description: `Restocked cafe item: ${item.name} (+${quantity})`,
    metadata: {
      itemName: item.name,
      addedQuantity: quantity,
      oldQuantity,
      newQuantity: item.quantity,
      notes: notes || ''
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: `Restocked ${quantity} ${item.unit} of ${item.name}`,
    payload: {
      item,
      restock: {
        addedQuantity: quantity,
        oldQuantity,
        newQuantity: item.quantity
      }
    }
  });
});

// ===========================================
// CAFE SALE CONTROLLERS (T109, T110, T111, T114)
// ===========================================

/**
 * Create a new cafe sale
 *
 * @route POST /api/cafe/sales
 * @access Private (Staff, Admin)
 *
 * This function handles:
 * - T109: Create sale with items
 * - T110: Auto-decrement inventory
 * - T111: Validate stock availability
 * - T114: Audit logging
 *
 * Process:
 * 1. Validate all items exist and have sufficient stock (T111)
 * 2. Create the sale record (T109)
 * 3. Decrement inventory for each item (T110)
 * 4. Log the sale for audit (T114)
 */
const createSale = catchAsync(async (req, res, next) => {
  const { items, customerId, notes, workspace } = req.body;
  const staffId = req.user._id;

  // ===========================================
  // T111: Validate stock availability before sale
  // ===========================================

  // Fetch all items in one query for efficiency
  const itemIds = items.map(item => item.itemId);
  const cafeItems = await CafeItem.find({ _id: { $in: itemIds } });

  // Create a map for quick lookup
  const itemMap = new Map(cafeItems.map(item => [item._id.toString(), item]));

  // Validation array to collect errors
  const stockErrors = [];
  const saleItems = [];
  let totalAmount = 0;

  // Validate each item in the sale
  for (const saleItem of items) {
    const item = itemMap.get(saleItem.itemId.toString());

    // Check if item exists
    if (!item) {
      stockErrors.push({
        itemId: saleItem.itemId,
        error: 'Item not found'
      });
      continue;
    }

    // Check if item is available
    if (!item.isAvailable) {
      stockErrors.push({
        itemId: saleItem.itemId,
        name: item.name,
        error: 'Item is not available for sale'
      });
      continue;
    }

    // Check if sufficient stock is available (T111)
    if (!item.canSell(saleItem.quantity)) {
      stockErrors.push({
        itemId: saleItem.itemId,
        name: item.name,
        requested: saleItem.quantity,
        available: item.quantity,
        error: `Insufficient stock. Only ${item.quantity} ${item.unit} available`
      });
      continue;
    }

    // Calculate subtotal and add to sale items
    const subtotal = saleItem.quantity * item.price;
    saleItems.push({
      itemId: item._id,
      name: item.name, // Cache name at time of sale
      quantity: saleItem.quantity,
      unitPrice: item.price, // Cache price at time of sale
      subtotal
    });
    totalAmount += subtotal;
  }

  // If there are stock errors, return them all
  if (stockErrors.length > 0) {
    return next(new AppError(
      `Sale cannot be completed due to stock issues: ${stockErrors.map(e => e.error).join('; ')}`,
      400
    ));
  }

  // ===========================================
  // T109: Create the sale record
  // ===========================================

  const sale = await CafeSale.create({
    items: saleItems,
    totalAmount,
    paymentStatus: PAYMENT_STATUS.PENDING, // Will be updated when payment is recorded
    servedBy: staffId,
    customerId: customerId || null,
    saleTime: new Date(),
    notes: notes || '',
    workspace: workspace || null
  });

  // ===========================================
  // T110: Auto-decrement inventory after sale
  // ===========================================

  // Use bulk write for efficiency
  const bulkOps = items.map(saleItem => ({
    updateOne: {
      filter: { _id: saleItem.itemId },
      update: { $inc: { quantity: -saleItem.quantity } }
    }
  }));

  // Execute inventory decrements
  await CafeItem.bulkWrite(bulkOps);

  // Check and update items that became out of stock
  for (const saleItem of items) {
    const item = itemMap.get(saleItem.itemId.toString());
    if (item.quantity - saleItem.quantity <= 0) {
      await CafeItem.findByIdAndUpdate(saleItem.itemId, { isAvailable: false });
    }
  }

  // ===========================================
  // T114: Audit logging for cafe sales
  // ===========================================

  await logCreate({
    performedBy: staffId,
    targetModel: 'CafeSale',
    targetId: sale._id,
    description: `Created cafe sale with ${saleItems.length} items, total: ${totalAmount}`,
    metadata: {
      saleId: sale._id.toString(),
      itemCount: saleItems.length,
      totalAmount,
      items: saleItems.map(i => ({ name: i.name, quantity: i.quantity })),
      customerId: customerId || null,
      staffName: req.user.name
    },
    req
  });

  // Populate sale for response
  await sale.populate([
    { path: 'servedBy', select: 'name email' },
    { path: 'customerId', select: 'name email' }
  ]);

  res.status(201).json({
    status: 'success',
    message: 'Sale created successfully',
    payload: {
      sale,
      summary: {
        itemCount: saleItems.length,
        totalAmount,
        paymentStatus: sale.paymentStatus
      }
    }
  });
});

/**
 * List cafe sales with filters
 *
 * @route GET /api/cafe/sales
 * @access Private (Staff, Admin)
 */
const listSales = catchAsync(async (req, res, next) => {
  const {
    workspace,
    servedBy,
    customerId,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sort = 'saleTime:desc'
  } = req.query;

  // Build filter object
  const filter = {};

  if (workspace) {filter.workspace = workspace;}
  if (servedBy) {filter.servedBy = servedBy;}
  if (customerId) {filter.customerId = customerId;}
  if (paymentStatus) {filter.paymentStatus = paymentStatus;}

  // Date range filter
  if (startDate || endDate) {
    filter.saleTime = {};
    if (startDate) {filter.saleTime.$gte = new Date(startDate);}
    if (endDate) {filter.saleTime.$lte = new Date(endDate);}
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const [sales, total] = await Promise.all([
    CafeSale.find(filter)
      .select('items totalAmount paymentStatus servedBy customerId saleTime workspace createdAt')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('servedBy', 'name email')
      .populate('customerId', 'name email')
      .lean(),
    CafeSale.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Sales retrieved successfully',
    payload: {
      sales,
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
 * Get a single sale by ID
 *
 * @route GET /api/cafe/sales/:id
 * @access Private (Staff, Admin)
 */
const getSale = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const sale = await CafeSale.findById(id)
    .populate('servedBy', 'name email')
    .populate('customerId', 'name email phone')
    .populate('payment')
    .lean();

  if (!sale) {
    return next(new AppError('Sale not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Sale retrieved successfully',
    payload: { sale }
  });
});

/**
 * Get low stock items (helper endpoint)
 *
 * @route GET /api/cafe/items/low-stock
 * @access Private (Staff, Admin)
 *
 * @task T143 - Low-stock query filter
 * Returns items where quantity <= lowStockThreshold
 */
const getLowStockItems = catchAsync(async (req, res, next) => {
  const { threshold } = req.query;

  // Use custom threshold or model default
  const items = await CafeItem.findLowStock(threshold ? parseInt(threshold) : undefined)
    .select('name category quantity lowStockThreshold unit isAvailable price cost workspace')
    .lean();

  res.status(200).json({
    status: 'success',
    message: 'Low stock items retrieved',
    payload: {
      items,
      count: items.length
    }
  });
});

// ===========================================
// EXPENSE CONTROLLERS (T144)
// ===========================================

/**
 * List expenses with filters
 *
 * @route GET /api/cafe/expenses
 * @access Private (Admin only)
 *
 * @task T144 - Expense list endpoint
 *
 * Query Parameters:
 * - expenseType: Filter by expense category
 * - startDate: Filter from date
 * - endDate: Filter to date
 * - page, limit: Pagination
 * - sort: Sort field and direction
 */
const listExpenses = catchAsync(async (req, res, next) => {
  const {
    expenseType,
    startDate,
    endDate,
    workspace,
    page = 1,
    limit = 20,
    sort = 'date:desc'
  } = req.query;

  // Build filter object
  const filter = {};

  // Expense type filter
  if (expenseType) {
    filter.expenseType = expenseType;
  }

  // Workspace filter
  if (workspace) {
    filter.workspace = workspace;
  }

  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {filter.date.$gte = new Date(startDate);}
    if (endDate) {filter.date.$lte = new Date(endDate);}
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query with pagination
  const [expenses, total] = await Promise.all([
    CafeExpense.find(filter)
      .select('description amount expenseType date vendor recordedBy workspace createdAt notes')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('recordedBy', 'name email')
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
 * Get a single expense by ID
 *
 * @route GET /api/cafe/expenses/:id
 * @access Private (Admin only)
 *
 * @task T144 - Get expense endpoint
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
 * @route POST /api/cafe/expenses
 * @access Private (Admin only)
 *
 * @task T144 - Create expense endpoint
 * Tracks operational expenses for financial reporting
 */
const createExpense = catchAsync(async (req, res, next) => {
  const {
    description,
    amount,
    expenseType,
    vendor,
    date,
    receiptImage,
    notes,
    workspace
  } = req.body;

  // Create the expense record
  const expense = await CafeExpense.create({
    description,
    amount,
    expenseType,
    vendor: vendor || '',
    date: date ? new Date(date) : new Date(),
    receiptImage: receiptImage || '',
    notes: notes || '',
    recordedBy: req.user._id,
    workspace: workspace || null
  });

  // Audit logging (T145)
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'CafeExpense',
    targetId: expense._id,
    description: `Created expense: ${description}`,
    metadata: {
      description,
      amount,
      expenseType,
      vendor: vendor || '',
      date: expense.date
    },
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
 * @route PATCH /api/cafe/expenses/:id
 * @access Private (Admin only)
 *
 * @task T144 - Update expense endpoint
 */
const updateExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find existing expense
  const oldExpense = await CafeExpense.findById(id);
  if (!oldExpense) {
    return next(new AppError('Expense not found', 404));
  }

  // Convert date if provided
  if (updateData.date) {
    updateData.date = new Date(updateData.date);
  }

  // Update the expense
  const expense = await CafeExpense.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('recordedBy', 'name email');

  // Audit logging (T145)
  await logUpdate({
    performedBy: req.user._id,
    targetModel: 'CafeExpense',
    targetId: expense._id,
    description: `Updated expense: ${expense.description}`,
    changes: {
      before: oldExpense.toObject(),
      after: expense.toObject(),
      fields: Object.keys(updateData)
    },
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
 * @route DELETE /api/cafe/expenses/:id
 * @access Private (Admin only)
 *
 * @task T144 - Delete expense endpoint
 * Note: Hard delete since expenses don't have dependent records
 */
const deleteExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const expense = await CafeExpense.findById(id);
  if (!expense) {
    return next(new AppError('Expense not found', 404));
  }

  // Hard delete the expense
  await CafeExpense.findByIdAndDelete(id);

  // Audit logging (T145)
  await logDelete({
    performedBy: req.user._id,
    targetModel: 'CafeExpense',
    targetId: expense._id,
    description: `Deleted expense: ${expense.description}`,
    metadata: {
      description: expense.description,
      amount: expense.amount,
      expenseType: expense.expenseType
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Expense deleted successfully',
    payload: { expense }
  });
});

// Export all controllers
module.exports = {
  // Item controllers (T108)
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  restockItem,
  getLowStockItems,
  // Sale controllers (T109, T110, T111, T114)
  createSale,
  listSales,
  getSale,
  // Expense controllers (T144)
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
};
