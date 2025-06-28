import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Ground from "../models/Ground.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_B3ip4XeUQV8UD1",
  key_secret:
    process.env.RAZORPAY_KEY_SECRET || "your_razorpay_secret_key_here",
});

// DEMO: Always return a fake payment order with your Razorpay test key
router.post("/create-order", (req, res) => {
  const { amount = 50000, currency = "INR" } = req.body;
  res.json({
    success: true,
    order: {
      id: "demo_order_" + Date.now(),
      amount,
      currency,
      receipt: "demo_receipt_" + Date.now(),
      status: "created"
    },
    key: "rzp_test_B3ip4XeUQV8UD1" // Your test key
  });
});

// Verify payment and confirm booking
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
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

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Find booking
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.userId,
      "payment.razorpayOrderId": razorpay_order_id,
    }).populate("groundId", "name owner");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Get payment details from Razorpay
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    if (paymentDetails.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: "Payment not captured",
      });
    }

    // Update booking payment status
    booking.payment = {
      ...booking.payment,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      method: paymentDetails.method,
      status: "completed",
      paidAt: new Date(),
    };

    booking.status = "confirmed";
    booking.confirmation = {
      confirmedAt: new Date(),
      confirmationCode: `CONF${Date.now().toString(36).toUpperCase()}`,
      groundOwnerNotified: false,
    };

    await booking.save();

    // Update ground total bookings
    await Ground.findByIdAndUpdate(booking.groundId._id, {
      $inc: { totalBookings: 1 },
    });

    // Update user total bookings
    await User.findByIdAndUpdate(req.userId, {
      $inc: { totalBookings: 1 },
      $push: { bookings: booking._id },
    });

    // Emit real-time update
    req.app
      .get("io")
      .to(`ground-${booking.groundId._id}`)
      .emit("bookingConfirmed", {
        bookingId: booking._id,
        timeSlot: booking.timeSlot,
        bookingDate: booking.bookingDate,
      });

    // Send confirmation email (you can implement this)
    // await sendBookingConfirmationEmail(booking);

    res.json({
      success: true,
      message: "Payment verified and booking confirmed!",
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        confirmationCode: booking.confirmation.confirmationCode,
        amount: booking.pricing.totalAmount,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
});

// Handle payment failure
router.post("/payment-failed", authMiddleware, async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, error } = req.body;

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.userId,
    });

    if (booking) {
      booking.payment.status = "failed";
      await booking.save();
    }

    res.json({
      success: true,
      message: "Payment failure recorded",
    });
  } catch (error) {
    console.error("Payment failure error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record payment failure",
    });
  }
});

// Initiate refund
router.post("/refund", authMiddleware, async (req, res) => {
  try {
    const { bookingId, reason } = req.body;

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.userId,
      "payment.status": "completed",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or payment not completed",
      });
    }

    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled for refund",
      });
    }

    const refundAmount = booking.calculateRefund();

    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No refund applicable for this booking",
      });
    }

    // Create refund in Razorpay
    const refundOptions = {
      amount: refundAmount * 100, // Convert to paise
      notes: {
        bookingId: booking._id.toString(),
        reason: reason || "User cancellation",
      },
    };

    const refund = await razorpay.payments.refund(
      booking.payment.razorpayPaymentId,
      refundOptions,
    );

    // Update booking
    booking.status = "cancelled";
    booking.cancellation = {
      cancelledBy: "user",
      cancelledAt: new Date(),
      reason: reason || "User cancellation",
      refundAmount,
      refundStatus: "processed",
    };

    booking.payment.refundAmount = refundAmount;
    booking.payment.refundedAt = new Date();

    await booking.save();

    res.json({
      success: true,
      message: "Refund initiated successfully",
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Refund error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
    });
  }
});

// Get payment history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const payments = await Booking.find({
      userId: req.userId,
      "payment.status": { $in: ["completed", "refunded"] },
    })
      .populate("groundId", "name location")
      .select(
        "bookingId bookingDate pricing payment status confirmation createdAt",
      )
      .sort({ "payment.paidAt": -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments({
      userId: req.userId,
      "payment.status": { $in: ["completed", "refunded"] },
    });

    // Calculate summary
    const summary = await Booking.aggregate([
      {
        $match: {
          userId: req.userId,
          "payment.status": { $in: ["completed", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$pricing.totalAmount" },
          totalRefunded: { $sum: "$payment.refundAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      payments,
      summary: summary[0] || {
        totalPaid: 0,
        totalRefunded: 0,
        totalTransactions: 0,
      },
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalPayments: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
});

// Get payment details
router.get("/:paymentId", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      userId: req.userId,
      "payment.razorpayPaymentId": req.params.paymentId,
    }).populate("groundId", "name location owner");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment: {
        id: booking.payment.razorpayPaymentId,
        orderId: booking.payment.razorpayOrderId,
        amount: booking.pricing.totalAmount,
        status: booking.payment.status,
        method: booking.payment.method,
        paidAt: booking.payment.paidAt,
        refundAmount: booking.payment.refundAmount,
        refundedAt: booking.payment.refundedAt,
        booking: {
          id: booking._id,
          bookingId: booking.bookingId,
          ground: typeof booking.groundId?.name === "string" && booking.groundId.name.length > 0
            ? booking.groundId.name.charAt(0)
            : "",
          date: booking.bookingDate,
          timeSlot: booking.timeSlot,
          status: booking.status,
        },
      },
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
    });
  }
});

export default router;
