const mongoose = require('mongoose');
const { Payment, CafeSale, CafeExpense } = require('./DB/Models/index.js');
require('dotenv').config();

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
};

const run = async () => {
  await connectDB();

  const today = new Date('2026-07-29');
  const start = new Date(today); start.setUTCHours(0,0,0,0);
  const end = new Date(today); end.setUTCHours(23,59,59,999);

  console.log(`Query range: ${start.toISOString()} to ${end.toISOString()}`);

  // Check raw payment count
  const allPayments = await Payment.find({}).lean().limit(5);
  console.log(`\nSample payments (first 5):`);
  allPayments.forEach((p, i) => {
    console.log(`  [${i}] session: ${p.session ? 'set' : 'null'}, paidAt: ${p.paidAt}, amount: ${p.amount}, type: ${p.paymentType}`);
  });

  const countInRange = await Payment.countDocuments({ paidAt: { $gte: start, $lte: end } });
  const countSessionInRange = await Payment.countDocuments({ session: { $ne: null }, paidAt: { $gte: start, $lte: end } });
  console.log(`\nPayments in date range: ${countInRange}`);
  console.log(`Session payments in date range: ${countSessionInRange}`);

  // Test the aggregation step by step
  const matchStage = await Payment.aggregate([
    { $match: { session: { $ne: null }, paidAt: { $gte: start, $lte: end } } }
  ]);
  console.log(`\nAfter $match stage: ${matchStage.length} docs`);
  if (matchStage.length > 0) {
    console.log(`First match doc fields:`, Object.keys(matchStage[0]));
    console.log(`amount: ${matchStage[0].amount}, session: ${matchStage[0].session}`);
  }

  if (matchStage.length > 0) {
    const fullAgg = await Payment.aggregate([
      { $match: { session: { $ne: null }, paidAt: { $gte: start, $lte: end } } },
      { $project: { amount: 1, session: 1 } },
      { $lookup: { from: 'sessions', localField: 'session', foreignField: '_id', as: 'session' } },
      { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'rooms', localField: 'session.room', foreignField: '_id', as: 'room' } },
      { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    console.log(`\nFull session aggregation: ${JSON.stringify(fullAgg)}`);
  }

  // Cafe sales
  const cafeCount = await CafeSale.countDocuments({ paymentStatus: 'paid', saleTime: { $gte: start, $lte: end } });
  console.log(`\nCafe sales in range: ${cafeCount}`);

  // Expenses
  const expCount = await CafeExpense.countDocuments({ date: { $gte: start, $lte: end } });
  console.log(`Expenses in range: ${expCount}`);

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
