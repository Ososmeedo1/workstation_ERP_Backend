const { Category } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate } = require('../../Services/audit.service.js');

const listCategories = catchAsync(async (req, res, next) => {
  const { type = 'cafeCategory' } = req.query;

  const categories = await Category.find({ type, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  res.status(200).json({
    status: 'success',
    payload: { categories }
  });
});

const createCategory = catchAsync(async (req, res, next) => {
  const { name, value, type = 'cafeCategory', sortOrder = 0 } = req.body;

  if (!name || !value) {
    return next(new AppError('Name and value are required', 400));
  }

  const existing = await Category.findOne({ value: value.toLowerCase() });
  if (existing) {
    return next(new AppError('A category with this value already exists', 409));
  }

  const category = await Category.create({
    name,
    value: value.toLowerCase(),
    type,
    sortOrder,
    workspace: req.user?.workspace || null
  });

  await logCreate({
    performedBy: req.user._id,
    targetModel: 'Category',
    description: `Created category: ${name} (${value})`,
    metadata: { type },
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'Category created successfully',
    payload: { category }
  });
});

const updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, value, sortOrder, isActive } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  if (name) category.name = name;
  if (value) category.value = value.toLowerCase();
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  await logCreate({
    performedBy: req.user._id,
    targetModel: 'Category',
    description: `Updated category: ${category.name}`,
    metadata: { categoryId: id },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Category updated successfully',
    payload: { category }
  });
});

const deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  await logCreate({
    performedBy: req.user._id,
    targetModel: 'Category',
    description: `Deleted category: ${category.name}`,
    metadata: { categoryId: id },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Category deleted successfully'
  });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
