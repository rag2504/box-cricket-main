// --- ES Module Imports ---
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// --- Fix for __dirname in ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CONFIG ---
const MONGO_URI = 'mongodb+srv://rag123456:rag123456@cluster0.qipvo.mongodb.net/boxcricket?retryWrites=true&w=majority'; // Atlas URI, using boxcricket DB
const JWT_SECRET = 'adminpanel_secret';

// --- MongoDB Model ---
const groundSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    cityId: { type: String, required: true },
    cityName: { type: String, required: true },
    state: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    pincode: { type: String, required: true },
  },
  price: {
    perHour: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    discount: { type: Number, default: 0 },
  },
  images: [
    {
      url: { type: String, required: false },
      alt: { type: String, default: "" },
      isPrimary: { type: Boolean, default: false },
    },
  ],
  amenities: [String],
  features: {
    pitchType: {
      type: String,
      enum: ["Artificial Turf", "Synthetic", "Matting", "Concrete"],
      required: true,
    },
    capacity: { type: Number, required: true },
    lighting: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    changeRoom: { type: Boolean, default: false },
    washroom: { type: Boolean, default: false },
    cafeteria: { type: Boolean, default: false },
    equipment: { type: Boolean, default: false },
  },
  availability: {
    timeSlots: [String],
    blockedDates: [Date],
    weeklySchedule: {
      monday: { isOpen: Boolean, slots: [String] },
      tuesday: { isOpen: Boolean, slots: [String] },
      wednesday: { isOpen: Boolean, slots: [String] },
      thursday: { isOpen: Boolean, slots: [String] },
      friday: { isOpen: Boolean, slots: [String] },
      saturday: { isOpen: Boolean, slots: [String] },
      sunday: { isOpen: Boolean, slots: [String] },
    },
  },
  owner: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending", "suspended"],
    default: "active",
  },
  isVerified: { type: Boolean, default: true },
  totalBookings: { type: Number, default: 0 },
  verificationDocuments: {
    groundLicense: String,
    ownershipProof: String,
    identityProof: String,
  },
  policies: {
    cancellation: String,
    rules: [String],
    advanceBooking: { type: Number, default: 30 }, // days
  },
}, { timestamps: true });

const Ground = mongoose.model('Ground', groundSchema, 'grounds');

// --- Location (City) Model ---
const locationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // cityId
  name: { type: String, required: true },
  state: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  popular: { type: Boolean, default: false },
});
const Location = mongoose.model('Location', locationSchema);

// --- EXPRESS APP ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Admin Auth Middleware ---
function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error('Not admin');
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// --- Admin Login (hardcoded) ---
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@boxcric.com' && password === 'admin123') {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

// --- Grounds CRUD ---
app.get('/api/admin/grounds', adminAuth, async (req, res) => {
  const grounds = await Ground.find();
  res.json(grounds);
});

app.post('/api/admin/grounds', adminAuth, async (req, res) => {
  try {
    // Validate cityId
    const city = await Location.findOne({ id: req.body.location.cityId });
    if (!city) return res.status(400).json({ message: 'Invalid cityId' });
    // Always set the full location object from the Locations collection
    req.body.location = {
      cityId: city.id,
      cityName: city.name,
      state: city.state,
      latitude: city.latitude,
      longitude: city.longitude,
      address: req.body.location.address,
      pincode: req.body.location.pincode
    };
    
    // Set default values for required fields
    const groundData = {
      ...req.body,
      status: "active",
      isVerified: true,
      // Provide a default userId for owner if not provided
      owner: {
        ...req.body.owner,
        userId: req.body.owner?.userId || new mongoose.Types.ObjectId(),
      },
      availability: req.body.availability || {
        timeSlots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"],
        blockedDates: [],
        weeklySchedule: {
          monday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] },
          tuesday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] },
          wednesday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] },
          thursday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] },
          friday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] },
          saturday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] },
          sunday: { isOpen: true, slots: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"] }
        }
      },
      rating: req.body.rating || {
        average: 0,
        count: 0,
        reviews: []
      },
      policies: req.body.policies || {
        cancellation: "Free cancellation up to 24 hours before booking",
        rules: ["No smoking", "No outside food", "Proper sports attire required"],
        advanceBooking: 30
      }
    };
    
    const ground = await Ground.create(groundData);
    res.json(ground);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/admin/grounds/:id', adminAuth, async (req, res) => {
  try {
    // Validate cityId
    const city = await Location.findOne({ id: req.body.location.cityId });
    if (!city) return res.status(400).json({ message: 'Invalid cityId' });
    req.body.location.cityName = city.name;
    req.body.location.state = city.state;
    req.body.location.latitude = city.latitude;
    req.body.location.longitude = city.longitude;
    const ground = await Ground.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ground);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/admin/grounds/:id', adminAuth, async (req, res) => {
  await Ground.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- Location CRUD Endpoints ---
app.get('/api/admin/locations', adminAuth, async (req, res) => {
  const locations = await Location.find();
  res.json(locations);
});

app.post('/api/admin/locations', adminAuth, async (req, res) => {
  try {
    const location = await Location.create(req.body);
    res.json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/admin/locations/:id', adminAuth, async (req, res) => {
  try {
    const location = await Location.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/admin/locations/:id', adminAuth, async (req, res) => {
  await Location.findOneAndDelete({ id: req.params.id });
  res.json({ success: true });
});

// --- Full Indian Cities List (copy from user panel) ---
const indianCities = [
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, popular: true },
  { id: "delhi", name: "Delhi", state: "Delhi", latitude: 28.7041, longitude: 77.1025, popular: true },
  { id: "bangalore", name: "Bangalore", state: "Karnataka", latitude: 12.9716, longitude: 77.5946, popular: true },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867, popular: true },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, popular: true },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639, popular: true },
  { id: "pune", name: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, popular: true },
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", latitude: 23.0225, longitude: 72.5714, popular: true },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", latitude: 26.9124, longitude: 75.7873, popular: false },
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", latitude: 26.8467, longitude: 80.9462, popular: false },
  { id: "kanpur", name: "Kanpur", state: "Uttar Pradesh", latitude: 26.4499, longitude: 80.3319, popular: false },
  { id: "nagpur", name: "Nagpur", state: "Maharashtra", latitude: 21.1458, longitude: 79.0882, popular: false },
  { id: "indore", name: "Indore", state: "Madhya Pradesh", latitude: 22.7196, longitude: 75.8577, popular: false },
  { id: "thane", name: "Thane", state: "Maharashtra", latitude: 19.2183, longitude: 72.9781, popular: false },
  { id: "bhopal", name: "Bhopal", state: "Madhya Pradesh", latitude: 23.2599, longitude: 77.4126, popular: false },
  { id: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", latitude: 17.6868, longitude: 83.2185, popular: false },
  { id: "patna", name: "Patna", state: "Bihar", latitude: 25.5941, longitude: 85.1376, popular: false },
  { id: "vadodara", name: "Vadodara", state: "Gujarat", latitude: 22.3072, longitude: 73.1812, popular: false },
  { id: "ghaziabad", name: "Ghaziabad", state: "Uttar Pradesh", latitude: 28.6692, longitude: 77.4538, popular: false },
  { id: "ludhiana", name: "Ludhiana", state: "Punjab", latitude: 30.9010, longitude: 75.8573, popular: false },
];

// --- Auto-populate locations if empty ---
async function autoPopulateCities() {
  const count = await Location.countDocuments();
  if (count === 0) {
    await Location.insertMany(indianCities);
    console.log('✅ Indian cities auto-populated in locations collection');
  }
}

// --- Start Server ---
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    await autoPopulateCities();
    app.listen(4000, () => {
      console.log('✅ Admin panel running at http://localhost:4000');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
