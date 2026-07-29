const { Router } = require('express');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('./category.controller.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

router.get('/', auth, listCategories);

router.post('/', auth, requireRole([USER_ROLES.ADMIN]), createCategory);

router.put('/:id', auth, requireRole([USER_ROLES.ADMIN]), updateCategory);

router.delete('/:id', auth, requireRole([USER_ROLES.ADMIN]), deleteCategory);

module.exports = router;
