import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Ground from "../models/Ground.js";

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
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.userId;
    if (!bookingId || bookingId === "undefined") {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    // Find the booking in MongoDB
    const booking = await Booking.findOne({ 
      _id: bookingId, 
      userId 
    }).populate("groundId", "name location price features");

    if (!booking) {
      console.error("Booking not found for bookingId:", bookingId);
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // Calculate amount in paise (Razorpay needs amount in smallest unit)
    const totalAmount = booking.pricing?.totalAmount || 500;
    const amountPaise = Math.round(totalAmount * 100);

    if (!amountPaise || amountPaise < 100) {
      console.error("Invalid amount (must be >= 100 paise):", amountPaise);
      return res.status(400).json({ 
        success: false, 
        message: "Booking amount must be at least ₹1" 
      });
    }

    console.log("Creating Razorpay order with:", {
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_order_${booking._id}`,
      payment_capture: 1,
    });

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_order_${booking._id}`,
      payment_capture: 1,
    });

    // Update booking with payment order details
    booking.payment = {
      ...booking.payment,
      razorpayOrderId: order.id,
      status: "pending"
    };
    await booking.save();

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
    res.status(500).json({ 
      success: false, 
      message: error?.error?.description || error.message || "Failed to create Razorpay order." 
    });
  }
});

/**
 * Verify Razorpay payment signature and mark booking as confirmed
 */
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    const userId = req.userId;
    if (!bookingId || bookingId === "undefined") {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
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

    // Find the booking in MongoDB
    const booking = await Booking.findOne({ 
      _id: bookingId, 
      userId 
    }).populate("groundId", "name location price features");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Update booking with payment details
    booking.payment = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "completed",
      paidAt: new Date(),
    };
    booking.status = "confirmed";
    booking.confirmation = {
      confirmedAt: new Date(),
      confirmationCode: `CONF${Date.now().toString(36).toUpperCase()}`,
      groundOwnerNotified: false
    };

    await booking.save();

    res.json({
      success: true,
      message: "Payment verified and booking confirmed!",
      booking: booking.toObject(),
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  }
});

/**
 * Handle payment failure
 */
router.post("/payment-failed", authMiddleware, async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, error } = req.body;
    const userId = req.userId;
    if (!bookingId || bookingId === "undefined") {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findOne({ 
      _id: bookingId, 
      userId 
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.payment = {
      ...booking.payment,
      razorpayOrderId: razorpay_order_id,
      status: "failed"
    };
    booking.status = "cancelled";
    booking.cancellation = {
      cancelledBy: "system",
      cancelledAt: new Date(),
      reason: "Payment failed"
    };

    await booking.save();

    res.json({
      success: true,
      message: "Payment failure recorded",
      booking: booking.toObject(),
    });
  } catch (error) {
    console.error("Payment failure handling error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record payment failure",
    });
  }
});

export default router;