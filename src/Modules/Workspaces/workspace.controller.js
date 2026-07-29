const { Workspace } = require('../../../DB/Models/index.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');

const listWorkspaces = catchAsync(async (req, res, next) => {
  const workspaces = await Workspace.find({})
    .select('name address')
    .lean();

  res.status(200).json({
    status: 'success',
    message: 'Workspaces retrieved successfully',
    payload: { workspaces }
  });
});

module.exports = { listWorkspaces };
