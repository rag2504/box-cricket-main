import express from "express";
import { fallbackGrounds } from "../data/fallbackGrounds.js";
import Booking from "../models/Booking.js";
import { authMiddleware, optionalAuth } from "../middleware/auth.js";
import { demoBookings } from "./bookings.js";

const router = express.Router();

// Get all grounds with filters (using fallbackGrounds only)
router.get("/", async (req, res) => {
  try {
    const { cityId, search, page = 1, limit = 12 } = req.query;
    let filteredGrounds = [...fallbackGrounds];

    // Filter by cityId
    if (cityId) {
      filteredGrounds = filteredGrounds.filter(
        (ground) => ground.location.cityId === cityId
      );
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredGrounds = filteredGrounds.filter(
        (ground) =>
          ground.name.toLowerCase().includes(searchLower) ||
          ground.description.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredGrounds.length;
    const skip = (Number(page) - 1) * Number(limit);
    const grounds = filteredGrounds.slice(skip, skip + Number(limit));

    res.json({
      success: true,
      grounds,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalGrounds: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch grounds" });
  }
});

// Get single ground by ID (using fallbackGrounds only)
router.get("/:id", async (req, res) => {
  try {
    const ground = fallbackGrounds.find((g) => g._id === req.params.id);
    if (!ground) {
      return res.status(404).json({ success: false, message: "Ground not found" });
    }
    res.json({ success: true, ground });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch ground details" });
  }
});

// Get ground availability for specific date (DEMO)
router.get("/:id/availability/:date", (req, res) => {
  const { id, date } = req.params;
  const ground = fallbackGrounds.find((g) => g._id === id);
  if (!ground) {
    return res.status(404).json({ success: false, message: "Ground not found" });
  }
  // Get all bookings for this ground and date
  const bookings = demoBookings.filter(
    (b) => b.groundId === id && b.bookingDate === date
  );
  const bookedSlots = bookings.map((b) => b.timeSlot);
  const allSlots = ground.availability?.timeSlots || [];
  const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));
  res.json({
    success: true,
    availability: {
      isOpen: true,
      availableSlots,
      bookedSlots,
      allSlots,
    },
  });
});

// Add review for a ground
router.post("/:id/reviews", authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const groundId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if user has booked this ground
    const userBooking = await Booking.findOne({
      userId: req.userId,
      groundId,
      status: "completed",
    });

    if (!userBooking) {
      return res.status(400).json({
        success: false,
        message: "You can only review grounds you have used",
      });
    }

    const ground = fallbackGrounds.find((g) => g._id === groundId);
    if (!ground) {
      return res.status(404).json({
        success: false,
        message: "Ground not found",
      });
    }

    // Check if user has already reviewed
    const existingReview = ground.rating.reviews.find(
      (review) => review.userId.toString() === req.userId.toString(),
    );

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.createdAt = new Date();
    } else {
      // Add new review
      ground.rating.reviews.push({
        userId: req.userId,
        rating,
        comment,
      });
    }

    // Update average rating
    ground.updateRating();
    res.json({
      success: true,
      message: "Review added successfully",
      rating: {
        average: ground.rating.average,
        count: ground.rating.count,
      },
    });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add review",
    });
  }
});

// Get ground reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const ground = fallbackGrounds.find((g) => g._id === req.params.id);
    if (!ground) {
      return res.status(404).json({
        success: false,
        message: "Ground not found",
      });
    }

    // Get paginated reviews with user details
    const reviews = ground.rating.reviews.slice(skip, skip + Number(limit));

    const totalReviews = ground.rating.reviews.length;

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalReviews / Number(limit)),
        totalReviews,
        hasNext: Number(page) < Math.ceil(totalReviews / Number(limit)),
        hasPrev: Number(page) > 1,
      },
      averageRating: ground.rating.average,
      totalRating: ground.rating.count,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
});

// Search grounds (autocomplete)
router.get("/search/autocomplete", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const suggestions = fallbackGrounds
      .filter((ground) =>
        ground.name.toLowerCase().includes(q.toLowerCase()) ||
        ground.location.address.toLowerCase().includes(q.toLowerCase()) ||
        ground.amenities.some((amenity) =>
          amenity.toLowerCase().includes(q.toLowerCase())
        )
      )
      .map((ground) => ({
        id: ground._id,
        name: ground.name,
        address: ground.location.address,
        city: ground.location.cityName,
      }))
      .slice(0, 10);

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Autocomplete search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
});

export default router;
