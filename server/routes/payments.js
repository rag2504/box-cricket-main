import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { demoBookings } from "./bookings.js";
import { fallbackGrounds } from "../data/fallbackGrounds.js";

// Use environment variables for Razorpay keys (do NOT hardcode in production)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_jF5rv9Bm4rqWDz";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "4BIAH2BznY7UgnkGuFK33oQ7";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const router = express.Router();

/**
 * Create a Razorpay order using real Razorpay API
 */
router.post("/create-order", async (req, res) => {
  const { bookingId } = req.body;
  // Accept both id and _id for bookingId for compatibility
  const booking = demoBookings.find((b) => b.id === bookingId || b._id === bookingId);
  if (!booking) {
    console.error("Booking not found for bookingId:", bookingId);
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  // Calculate amount in paise (Razorpay needs amount in smallest unit)
  const totalAmount = booking.pricing?.totalAmount ?? booking.amount ?? 500;
  const amountPaise = Math.round(totalAmount * 100);

  if (!amountPaise || amountPaise < 100) {
    console.error("Invalid amount (must be >= 100 paise):", amountPaise);
    return res.status(400).json({ success: false, message: "Booking amount must be at least ₹1" });
  }

  try {
    console.log("Creating Razorpay order with:", {
      amount: amountPaise,
      currency: booking.currency || "INR",
      receipt: `receipt_order_${booking.id || booking._id}`,
      payment_capture: 1,
    });

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: booking.currency || "INR",
      receipt: `receipt_order_${booking.id || booking._id}`,
      payment_capture: 1,
    });

    // ⚠️ IMPORTANT: Always send the key as part of your API response!
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
      },
      key: RAZORPAY_KEY_ID, // <-- THIS IS CRUCIAL FOR FRONTEND
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Razorpay order creation error:', error);
    // Send a basic message to the frontend
    res.status(500).json({ success: false, message: error?.error?.description || error.message || "Failed to create Razorpay order." });
  }
});

/**
 * Verify Razorpay payment signature and mark booking as confirmed (in-memory)
 */
router.post("/verify-payment", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
  } = req.body;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !bookingId
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing payment verification data",
    });
  }

  // Signature verification
  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  }

  // Accept both id and _id for bookingId for compatibility
  const booking = demoBookings.find((b) => b.id === bookingId || b._id === bookingId);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }
  booking.payment = {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    status: "completed",
    paidAt: new Date().toISOString(),
  };
  booking.status = "confirmed";

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
  };

  res.json({
    success: true,
    message: "Payment verified and booking confirmed!",
    booking: { ...booking, ground: safeGround },
  });
});

export default router;