#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studyspace_erp';
const DEFAULT_WORKSPACE_NAME = process.env.DEFAULT_WORKSPACE_NAME || 'StudySpace Downtown';

const OPERATOR = {
  name: 'Space Operator',
  email: 'operator@studyspace.com',
  password: 'Operator@123',
  role: 'admin',
  status: 'active',
};

const WORKSPACE = {
  name: DEFAULT_WORKSPACE_NAME,
  address: '٤٢ شارع التحرير، وسط البلد، القاهرة',
  phone: '+20 2 1234 5678',
  isActive: true,
};

const ROOMS = [
  { name: 'مساحة العمل المفتوحة', type: 'public', capacity: 24, hourlyRate: 15, description: 'مساحة عمل مشتركة مع مكاتب وكراسي مريحة' },
  { name: 'غرفة الاجتماعات أ', type: 'private', capacity: 6, hourlyRate: 35, description: 'غرفة اجتماعات خاصة تتسع لـ ٦ أشخاص' },
  { name: 'غرفة الاجتماعات ب', type: 'private', capacity: 4, hourlyRate: 30, description: 'غرفة خاصة صغيرة للمناقشات الجماعية' },
  { name: 'منطقة الهدوء', type: 'silent', capacity: 12, hourlyRate: 20, description: 'منطقة هادئة للعمل المركز والدراسة' },
  { name: 'قاعة التدريب', type: 'private', capacity: 20, hourlyRate: 50, description: 'قاعة كبيرة للتدريب وورش العمل' },
];

const CAFE_ITEMS = [
  { name: 'قهوة سادة', category: 'beverage', description: 'قهوة مصرية طازجة', price: 15, cost: 4, quantity: 150, lowStockThreshold: 25, unit: 'كوب' },
  { name: 'قهوة تركية', category: 'beverage', description: 'قهوة تركية على الطريقة المصرية', price: 20, cost: 5, quantity: 100, lowStockThreshold: 20, unit: 'كوب' },
  { name: 'شاي', category: 'beverage', description: 'تشكيلة شاي ساخن', price: 10, cost: 2, quantity: 120, lowStockThreshold: 25, unit: 'كوب' },
  { name: 'عصير برتقال طازج', category: 'beverage', description: 'عصير برتقال طبيعي طازج', price: 25, cost: 8, quantity: 40, lowStockThreshold: 10, unit: 'كوب' },
  { name: 'مياه معدنية', category: 'beverage', description: 'مياه معدنية ٥٠٠ مل', price: 5, cost: 2, quantity: 200, lowStockThreshold: 40, unit: 'زجاجة' },
  { name: 'كرواسون', category: 'snack', description: 'كرواسون طازج بالزبدة', price: 18, cost: 6, quantity: 35, lowStockThreshold: 10, unit: 'قطعة' },
  { name: 'ساندويتش فطار', category: 'meal', description: 'ساندويتش فطار مصري (جبنة وبيض)', price: 35, cost: 12, quantity: 25, lowStockThreshold: 8, unit: 'قطعة' },
  { name: 'ساندويتش دجاج', category: 'meal', description: 'ساندويتش دجاج مشوي مع خضروات', price: 50, cost: 18, quantity: 20, lowStockThreshold: 5, unit: 'قطعة' },
  { name: 'بسكويت', category: 'snack', description: 'بسكويت سادة متنوع', price: 8, cost: 3, quantity: 60, lowStockThreshold: 15, unit: 'علبة' },
  { name: 'حلويات شرقية', category: 'snack', description: 'تشكيلة حلويات شرقية طازجة', price: 30, cost: 10, quantity: 5, lowStockThreshold: 10, unit: 'طبق' },
];

const CUSTOMERS = [
  { name: 'أحمد علي', email: 'ahmed@example.com', password: 'Customer@123', role: 'member', phone: '+20 100 123 4567' },
  { name: 'مريم حسن', email: 'mariam@example.com', password: 'Customer@123', role: 'member', phone: '+20 122 234 5678' },
  { name: 'خالد محمود', email: 'khaled@example.com', password: 'Customer@123', role: 'member', phone: '+20 111 345 6789' },
  { name: 'سارة عبد الله', email: 'sara@example.com', password: 'Customer@123', role: 'member', phone: '+20 155 456 7890' },
  { name: 'محمد كريم', email: 'mohamed@example.com', password: 'Customer@123', role: 'member', phone: '+20 112 567 8901' },
  { name: 'نورا سامي', email: 'nora@example.com', password: 'Customer@123', role: 'member', phone: '+20 106 678 9012' },
  { name: 'عمر عبد الرحمن', email: 'omar@example.com', password: 'Customer@123', role: 'member', phone: '+20 100 789 0123' },
  { name: 'ليلى جمال', email: 'layla@example.com', password: 'Customer@123', role: 'member', phone: '+20 122 890 1234' },
  { name: 'يوسف إبراهيم', email: 'youssef@example.com', password: 'Customer@123', role: 'member', phone: '+20 111 901 2345' },
  { name: 'هند مصطفى', email: 'hind@example.com', password: 'Customer@123', role: 'member', phone: '+20 155 012 3456' },
];

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const hoursAgo = (h) => {
  const d = new Date();
  d.setHours(d.getHours() - h);
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
};

async function connectDB() {
  console.log('Connecting to MongoDB...');
  console.log(`   URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully\n');
}

async function disconnectDB() {
  await mongoose.connection.close();
  console.log('Disconnected from MongoDB');
}

async function seedOperator() {
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['member', 'staff', 'admin'] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    phone: String,
  }, { timestamps: true }));

  const existing = await User.findOne({ email: OPERATOR.email });
  if (existing) {
    console.log('Operator already exists, skipping');
    return existing;
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(OPERATOR.password, salt);
  const op = await User.create({ ...OPERATOR, password: hashed });
  console.log(`Operator created: ${OPERATOR.email} / ${OPERATOR.password}`);
  return op;
}

async function seedCustomers() {
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['member', 'staff', 'admin'] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    phone: String,
  }, { timestamps: true }));

  const created = [];
  for (const c of CUSTOMERS) {
    const existing = await User.findOne({ email: c.email });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(c.password, salt);
      const user = await User.create({ ...c, password: hashed });
      created.push(user);
      console.log(`  Created customer: ${c.name} (${c.email})`);
    } else {
      created.push(existing);
    }
  }
  return created;
}

async function seedWorkspace() {
  const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', new mongoose.Schema({
    name: { type: String, unique: true },
    address: String,
    phone: String,
    isActive: { type: Boolean, default: true },
  }, { timestamps: true }));

  let ws = await Workspace.findOne({ name: WORKSPACE.name });
  if (!ws) {
    ws = await Workspace.create(WORKSPACE);
    console.log(`Workspace created: ${ws.name}`);
  } else {
    console.log('Workspace exists, skipping');
  }
  return ws;
}

async function seedRooms(workspaceId) {
  const Room = mongoose.models.Room || mongoose.model('Room', new mongoose.Schema({
    name: String,
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    type: { type: String, enum: ['public', 'private', 'silent'] },
    capacity: Number,
    currentOccupancy: { type: Number, default: 0 },
    hourlyRate: Number,
    description: String,
    isActive: { type: Boolean, default: true },
  }, { timestamps: true }));

  const existing = await Room.countDocuments({ workspace: workspaceId });
  if (existing > 0) {
    console.log(`${existing} rooms exist, skipping`);
    return;
  }

  await Room.insertMany(ROOMS.map(r => ({ ...r, workspace: workspaceId })));
  console.log(`${ROOMS.length} rooms created`);
}

async function seedCategories(workspaceId) {
  const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
    name: String, value: String, type: String, workspace: { type: mongoose.Schema.Types.ObjectId }, sortOrder: Number, isActive: Boolean
  }, { timestamps: true }));

  const existing = await Category.countDocuments({ type: 'cafeCategory' });
  if (existing > 0) {
    console.log(`${existing} categories exist, skipping`);
    return;
  }

  const defaults = [
    { name: 'Beverages', value: 'beverage', sortOrder: 1 },
    { name: 'Snacks', value: 'snack', sortOrder: 2 },
    { name: 'Meals', value: 'meal', sortOrder: 3 },
    { name: 'Other', value: 'other', sortOrder: 4 },
  ];

  await Category.insertMany(defaults.map(c => ({ ...c, type: 'cafeCategory', workspace: workspaceId })));
  console.log(`${defaults.length} cafe categories created`);
}

async function seedCafeItems() {
  const CafeItem = mongoose.models.CafeItem || mongoose.model('CafeItem', new mongoose.Schema({
    name: { type: String, unique: true },
    category: { type: String },
    description: String,
    price: Number,
    cost: Number,
    quantity: Number,
    lowStockThreshold: Number,
    unit: String,
    isAvailable: { type: Boolean, default: true },
  }, { timestamps: true }));

  const existing = await CafeItem.countDocuments();
  if (existing > 0) {
    console.log(`${existing} cafe items exist, skipping`);
    return;
  }

  await CafeItem.insertMany(CAFE_ITEMS);
  console.log(`${CAFE_ITEMS.length} cafe items created`);
}

async function seedSessionsAndPayments(workspaceId, operatorId, customers) {
  const Session = mongoose.models.Session || mongoose.model('Session', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    checkIn: Date,
    checkOut: Date,
    status: { type: String, enum: ['active', 'completed'] },
    durationMinutes: Number,
    hourlyRate: Number,
    totalAmount: Number,
    paymentStatus: { type: String, enum: ['pending', 'paid'] },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }, { timestamps: true }));

  const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({
    receiptNumber: String,
    paymentType: { type: String, enum: ['session', 'cafe'] },
    amount: Number,
    paymentMethod: { type: String, default: 'cash' },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,
  }, { timestamps: true }));

  const Room = mongoose.model('Room');
  const rooms = await Room.find({ workspace: workspaceId });

  const existingSessions = await Session.countDocuments({ workspace: workspaceId });
  if (existingSessions > 10) {
    console.log(`${existingSessions} sessions exist, skipping session seeding`);
    return;
  }

  const sessionData = [
    { userIdx: 0, roomIdx: 0, days: 0, hours: 3, minutes: 45 },
    { userIdx: 1, roomIdx: 3, days: 0, hours: 5, minutes: 30 },
    { userIdx: 2, roomIdx: 2, days: 1, hours: 2, minutes: 15 },
    { userIdx: 3, roomIdx: 1, days: 1, hours: 4, minutes: 0 },
    { userIdx: 4, roomIdx: 0, days: 2, hours: 6, minutes: 20 },
    { userIdx: 5, roomIdx: 3, days: 2, hours: 3, minutes: 10 },
    { userIdx: 6, roomIdx: 1, days: 3, hours: 1, minutes: 50 },
    { userIdx: 7, roomIdx: 2, days: 3, hours: 4, minutes: 30 },
    { userIdx: 8, roomIdx: 0, days: 4, hours: 7, minutes: 0 },
    { userIdx: 9, roomIdx: 1, days: 4, hours: 2, minutes: 25 },
    { userIdx: 0, roomIdx: 2, days: 5, hours: 1, minutes: 0 },
    { userIdx: 2, roomIdx: 0, days: 5, hours: 3, minutes: 45 },
    { userIdx: 4, roomIdx: 3, days: 6, hours: 8, minutes: 0 },
    { userIdx: 6, roomIdx: 1, days: 6, hours: 2, minutes: 15 },
    { userIdx: 1, roomIdx: 0, days: 7, hours: 4, minutes: 30 },
    { userIdx: 3, roomIdx: 2, days: 7, hours: 1, minutes: 20 },
    { userIdx: 5, roomIdx: 1, days: 8, hours: 3, minutes: 0 },
    { userIdx: 7, roomIdx: 0, days: 8, hours: 5, minutes: 15 },
    { userIdx: 8, roomIdx: 3, days: 9, hours: 2, minutes: 30 },
    { userIdx: 9, roomIdx: 2, days: 9, hours: 1, minutes: 45 },
  ];

  for (const s of sessionData) {
    const customer = customers[s.userIdx];
    const room = rooms[s.roomIdx];
    if (!customer || !room) continue;

    const checkIn = daysAgo(s.days);
    checkIn.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60));
    const durationMs = (s.hours * 60 + s.minutes) * 60 * 1000;
    const checkOut = new Date(checkIn.getTime() + durationMs);
    const durationMinutes = Math.round((checkOut - checkIn) / 60000);
    const totalAmount = parseFloat(((durationMinutes / 60) * room.hourlyRate).toFixed(2));

    const { nanoid } = await import('nanoid');
    const session = await Session.create({
      user: customer._id,
      room: room._id,
      workspace: workspaceId,
      checkIn,
      checkOut,
      status: 'completed',
      durationMinutes,
      hourlyRate: room.hourlyRate,
      totalAmount,
      paymentStatus: 'paid',
      checkedInBy: operatorId,
      checkedOutBy: operatorId,
    });

    await Payment.create({
      receiptNumber: `RCP-${nanoid(10).toUpperCase()}`,
      paymentType: 'session',
      amount: totalAmount,
      paymentMethod: 'cash',
      session: session._id,
      workspace: workspaceId,
      paidBy: customer._id,
      receivedBy: operatorId,
      paidAt: checkOut,
    });
  }

  console.log(`Created ${sessionData.length} historical sessions with payments`);
}

async function seedActiveSessions(workspaceId, operatorId, customers) {
  const Session = mongoose.model('Session');
  const Room = mongoose.model('Room');
  const rooms = await Room.find({ workspace: workspaceId });

  const existingActive = await Session.countDocuments({ workspace: workspaceId, status: 'active' });
  if (existingActive > 0) {
    console.log(`${existingActive} active sessions exist, skipping`);
    return;
  }

  const activeSeeds = [
    { userIdx: 0, roomIdx: 0 },
    { userIdx: 2, roomIdx: 2 },
    { userIdx: 4, roomIdx: 1 },
  ];

  for (const s of activeSeeds) {
    const customer = customers[s.userIdx];
    const room = rooms[s.roomIdx];
    if (!customer || !room) continue;

    const checkIn = hoursAgo(Math.floor(Math.random() * 3) + 1);

    await Session.create({
      user: customer._id,
      room: room._id,
      workspace: workspaceId,
      checkIn,
      checkOut: null,
      status: 'active',
      durationMinutes: 0,
      hourlyRate: room.hourlyRate,
      totalAmount: 0,
      paymentStatus: 'pending',
      checkedInBy: operatorId,
      checkedOutBy: null,
    });

    await Room.updateOne({ _id: room._id }, { $inc: { currentOccupancy: 1 } });
  }

  console.log(`Created ${activeSeeds.length} active sessions`);
}

async function seedCafeSales(workspaceId, operatorId, customers) {
  const CafeSale = mongoose.models.CafeSale || mongoose.model('CafeSale', new mongoose.Schema({
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CafeItem' },
      name: String,
      quantity: Number,
      unitPrice: Number,
      subtotal: Number,
    }],
    totalAmount: Number,
    paymentStatus: { type: String, default: 'paid' },
    servedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    saleTime: Date,
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  }, { timestamps: true }));

  const Payment = mongoose.model('Payment');
  const CafeItem = mongoose.model('CafeItem');

  const existing = await CafeSale.countDocuments({ workspace: workspaceId });
  if (existing > 5) {
    console.log(`${existing} cafe sales exist, skipping`);
    return;
  }

  const items = await CafeItem.find();
  if (items.length === 0) return;

  const saleConfigs = [
    { items: [[0, 2], [5, 1]], customerIdx: 1, daysA: 0 },
    { items: [[1, 1], [8, 2]], customerIdx: 3, daysA: 0 },
    { items: [[3, 1], [6, 1]], customerIdx: 5, daysA: 1 },
    { items: [[0, 3], [7, 1]], customerIdx: 7, daysA: 1 },
    { items: [[2, 2], [9, 1]], customerIdx: 9, daysA: 2 },
    { items: [[4, 1], [5, 2]], customerIdx: 0, daysA: 2 },
    { items: [[1, 2], [3, 1]], customerIdx: 2, daysA: 3 },
  ];

  const { nanoid } = await import('nanoid');

  for (const config of saleConfigs) {
    const saleItems = config.items.map(([itemIdx, qty]) => {
      const item = items[itemIdx];
      if (!item) return null;
      return {
        itemId: item._id,
        name: item.name,
        quantity: qty,
        unitPrice: item.price,
        subtotal: qty * item.price,
      };
    }).filter(Boolean);

    if (saleItems.length === 0) continue;

    const total = saleItems.reduce((sum, i) => sum + i.subtotal, 0);
    const saleTime = daysAgo(config.daysA);
    saleTime.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

    const customer = customers[config.customerIdx];
    if (!customer) continue;

    const sale = await CafeSale.create({
      items: saleItems,
      totalAmount: total,
      paymentStatus: 'paid',
      servedBy: operatorId,
      customerId: customer._id,
      saleTime,
      workspace: workspaceId,
    });

    await Payment.create({
      receiptNumber: `RCP-${nanoid(10).toUpperCase()}`,
      paymentType: 'cafe',
      amount: total,
      paymentMethod: 'cash',
      cafeSale: sale._id,
      workspace: workspaceId,
      paidBy: customer._id,
      receivedBy: operatorId,
      paidAt: saleTime,
    });
  }

  console.log(`Created ${saleConfigs.length} cafe sales with payments`);
}

async function seedExpenses(workspaceId, operatorId) {
  const CafeExpense = mongoose.models.CafeExpense || mongoose.model('CafeExpense', new mongoose.Schema({
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    description: String,
    amount: Number,
    expenseType: { type: String, enum: ['inventory', 'utilities', 'maintenance', 'supplies', 'salary', 'rent', 'other'] },
    date: Date,
    vendor: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }, { timestamps: true }));

  const existing = await CafeExpense.countDocuments({ workspace: workspaceId });
  if (existing > 0) {
    console.log(`${existing} expenses exist, skipping`);
    return;
  }

  const expenses = [
    { description: 'فاتورة كهرباء الشهر', amount: 2500, type: 'utilities', days: 0, vendor: 'شركة الكهرباء' },
    { description: 'فاتورة مياه', amount: 400, type: 'utilities', days: 0, vendor: 'شركة المياه' },
    { description: 'اشتراك إنترنت', amount: 1200, type: 'utilities', days: 1, vendor: 'WE' },
    { description: 'شراء حبوب قهوة', amount: 800, type: 'inventory', days: 1, vendor: 'توريدات القهوة' },
    { description: 'منظفات ومستلزمات نظافة', amount: 350, type: 'supplies', days: 2, vendor: 'سوبر ماركت' },
    { description: 'صيانة مكيف الهواء', amount: 600, type: 'maintenance', days: 3, vendor: 'فني تكييف' },
    { description: 'مرتب موظف استقبال', amount: 4000, type: 'salary', days: 4, vendor: '' },
    { description: 'إيجار المساحة', amount: 12000, type: 'rent', days: 5, vendor: 'مالك العقار' },
    { description: 'شراء حليب وعصائر', amount: 450, type: 'inventory', days: 6, vendor: 'سوبر ماركت' },
    { description: 'قرطاسية ومستلزمات مكتبية', amount: 280, type: 'supplies', days: 7, vendor: 'مكتبة' },
  ];

  for (const exp of expenses) {
    await CafeExpense.create({
      workspace: workspaceId,
      description: exp.description,
      amount: exp.amount,
      expenseType: exp.type,
      date: daysAgo(exp.days),
      vendor: exp.vendor,
      recordedBy: operatorId,
    });
  }

  console.log(`${expenses.length} expenses created`);
}

async function seed() {
  console.log('===========================================');
  console.log('  StudySpace ERP - Demo Database Seed');
  console.log('===========================================\n');

  try {
    await connectDB();

    const operator = await seedOperator();
    const workspace = await seedWorkspace();
    await seedRooms(workspace._id);
    const customers = await seedCustomers();
    await seedCategories(workspace._id);
    await seedCafeItems();

    await seedSessionsAndPayments(workspace._id, operator._id, customers);
    await seedActiveSessions(workspace._id, operator._id, customers);
    await seedCafeSales(workspace._id, operator._id, customers);
    await seedExpenses(workspace._id, operator._id);

    console.log('\n✅ Seeding completed successfully!\n');
    console.log('Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Email:    ${OPERATOR.email}`);
    console.log(`  Password: ${OPERATOR.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('What was created:');
    console.log('  • 1 operator account');
    console.log('  • 1 workspace');
    console.log('  • 5 rooms (mixed public/private/silent)');
    console.log('  • 10 customer accounts');
    console.log('  • 10 cafe menu items');
    console.log(`  • 20 historical completed sessions with payments`);
    console.log('  • 3 active sessions (today)');
    console.log('  • 7 cafe sales');
    console.log('  • 10 expense records\n');
    console.log('Startup commands:');
    console.log('  Backend:  cd backend && npm run dev');
    console.log('  Frontend: cd frontend && npm run dev');
    console.log('  Login at: http://localhost:5173\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seed();
