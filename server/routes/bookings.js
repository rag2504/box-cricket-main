import express from "express";
import { fallbackGrounds } from "../data/fallbackGrounds.js";

const router = express.Router();

// In-memory bookings array (demo only)
export const demoBookings = [];

// Create a booking
router.post("/", (req, res) => {
  const { groundId, bookingDate, timeSlot, playerDetails, requirements } = req.body;
  const ground = fallbackGrounds.find((g) => g._id === groundId);
  if (!ground) {
    return res.status(400).json({ success: false, message: "Ground not found" });
  }
  // Check if slot is already booked
  const alreadyBooked = demoBookings.some(
    (b) => b.groundId === groundId && b.bookingDate === bookingDate && b.timeSlot === timeSlot
  );
  if (alreadyBooked) {
    return res.status(400).json({ success: false, message: "Slot already booked" });
  }
  const booking = {
    _id: `${Date.now()}`,
    groundId,
    bookingDate,
    timeSlot,
    playerDetails,
    requirements,
    createdAt: new Date().toISOString(),
    amount: ground.price?.perHour ? ground.price.perHour * 100 : 50000, // fallback 500.00 INR
    currency: "INR"
  };
  demoBookings.push(booking);
  res.json({ success: true, booking });
});

// Get bookings for a ground and date
router.get("/ground/:groundId/:date", (req, res) => {
  const { groundId, date } = req.params;
  const bookings = demoBookings.filter(
    (b) => b.groundId === groundId && b.bookingDate === date
  );
  res.json({ success: true, bookings });
});

// Get booking details by ID (demo)
router.get("/:id", (req, res) => {
  const booking = demoBookings.find((b) => b._id === req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  // Attach safe ground details for frontend
  const ground = fallbackGrounds.find((g) => g._id === booking.groundId) || {};
  const safeGround = {
    _id: ground._id || booking.groundId,
    name: ground.name || "Unknown Ground",
    description: ground.description || "",
    location: ground.location || {},
    price: ground.price || {},
    images: ground.images || [],
    amenities: ground.amenities || [],
    features: ground.features || {},
    availability: ground.availability || {},
    status: ground.status || "active",
    isVerified: ground.isVerified !== undefined ? ground.isVerified : true,
    totalBookings: ground.totalBookings || 0,
    rating: ground.rating || { average: 0, count: 0, reviews: [] },
    owner: ground.owner || {},
    verificationDocuments: ground.verificationDocuments || {},
    policies: ground.policies || {},
    // add any other fields your frontend expects here
  };
  res.json({ success: true, booking: { ...booking, ground: safeGround } });
});

export default router;
