const { Router } = require('express');
const { listWorkspaces } = require('./workspace.controller.js');
const { auth } = require('../../Middlewares/auth.middleware.js');

const router = Router();

router.get(
  '/',
  auth,
  listWorkspaces
);

module.exports = router;
