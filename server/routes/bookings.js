import express from "express";
import { fallbackGrounds } from "../data/fallbackGrounds.js";

const router = express.Router();
export const demoBookings = [];

// Utility to calculate pricing
function getPricing(ground, timeSlot) {
  let duration = 1;
  if (timeSlot && typeof timeSlot === "object" && timeSlot.duration) {
    duration = Number(timeSlot.duration) || 1;
  }
  const baseAmount = ground.price?.perHour ? ground.price.perHour * duration : 500;
  const discount = ground.price?.discount || 0;
  const discountedAmount = baseAmount - discount;
  const taxes = Math.round(discountedAmount * 0.18); // 18% GST
  const totalAmount = discountedAmount + taxes;
  return {
    baseAmount,
    discount,
    taxes,
    totalAmount,
    duration,
  };
}

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
  const pricing = getPricing(ground, timeSlot);
  const nowId = `${Date.now()}`;
  const booking = {
    _id: nowId,
    id: nowId, // For frontend compatibility
    groundId,
    bookingDate,
    timeSlot,
    playerDetails,
    requirements,
    createdAt: new Date().toISOString(),
    amount: pricing.totalAmount, // legacy field
    currency: "INR",
    pricing,
    status: "pending",
  };
  demoBookings.push(booking);

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
  };

  res.json({ success: true, booking: { ...booking, id: booking._id, ground: safeGround } });
});

// Get bookings for a ground and date
router.get("/ground/:groundId/:date", (req, res) => {
  const { groundId, date } = req.params;
  const bookings = demoBookings
    .filter((b) => b.groundId === groundId && b.bookingDate === date)
    .map((booking) => ({ ...booking, id: booking._id })); // ensure id field
  res.json({ success: true, bookings });
});

// Get booking details by ID (demo)
router.get("/:id", (req, res) => {
  const booking = demoBookings.find((b) => b._id === req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  const ground = fallbackGrounds.find((g) => g._id === booking.groundId) || {};
  let pricing = booking.pricing;
  if (!pricing) {
    pricing = getPricing(ground, booking.timeSlot);
    booking.pricing = pricing;
  }

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
  };
  res.json({ success: true, booking: { ...booking, id: booking._id, ground: safeGround, pricing } });
});

export default router;