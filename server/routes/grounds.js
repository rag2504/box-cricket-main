import express from "express";
import Ground from "../models/Ground.js";
import { fallbackGrounds } from "../data/fallbackGrounds.js";
import Booking from "../models/Booking.js";
import { authMiddleware, optionalAuth } from "../middleware/auth.js";
import { demoBookings } from "./bookings.js";

const router = express.Router();

// Default time slots (same as fallback)
const DEFAULT_TIME_SLOTS = [
  "06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00",
  "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00",
  "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00",
  "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"
];

// Map MongoDB ground to fallback structure
function mapMongoGroundToFallback(groundDoc, bookingsByDate = {}) {
  if (!groundDoc) return null;
  const g = groundDoc.toObject ? groundDoc.toObject() : groundDoc;
  // Always provide default time slots if missing or empty
  const timeSlots = g.availability?.timeSlots && g.availability.timeSlots.length > 0
    ? g.availability.timeSlots
    : DEFAULT_TIME_SLOTS;
  // Default availability structure
  const defaultAvailability = {
    timeSlots,
    availableSlots: [],
    bookedSlots: [],
  };
  // If bookingsByDate is provided, use today's date to fill available/booked slots
  const today = new Date().toISOString().split("T")[0];
  let bookedSlots = bookingsByDate[today] || [];
  let availableSlots = timeSlots.filter(slot => !bookedSlots.includes(slot));
  return {
    _id: g._id?.toString() || '',
    name: g.name || '',
    description: g.description || '',
    location: {
      address: g.location?.address || '',
      cityId: g.location?.cityId || '',
      cityName: g.location?.cityName || '',
      state: g.location?.state || '',
      latitude: g.location?.latitude || 0,
      longitude: g.location?.longitude || 0,
      pincode: g.location?.pincode || '',
    },
    price: {
      perHour: g.price?.perHour || 0,
      currency: g.price?.currency || 'INR',
      discount: g.price?.discount || 0,
      ranges: g.price?.ranges || [],
    },
    images: Array.isArray(g.images) ? g.images.map(img => ({
      url: img.url || '',
      alt: img.alt || '',
      isPrimary: img.isPrimary || false,
    })) : [],
    amenities: Array.isArray(g.amenities) ? g.amenities : [],
    features: {
      pitchType: g.features?.pitchType || '',
      capacity: g.features?.capacity || 0,
      lighting: g.features?.lighting || false,
      parking: g.features?.parking || false,
      changeRoom: g.features?.changeRoom || false,
      washroom: g.features?.washroom || false,
      cafeteria: g.features?.cafeteria || false,
      equipment: g.features?.equipment || false,
    },
    availability: {
      ...defaultAvailability,
      bookedSlots,
      availableSlots,
    },
    owner: {
      userId: g.owner?.userId?.toString() || '',
      name: g.owner?.name || '',
      contact: g.owner?.contact || '',
      email: g.owner?.email || '',
      verified: g.owner?.verified || false,
    },
    rating: {
      average: g.rating?.average || 0,
      count: g.rating?.count || 0,
      reviews: Array.isArray(g.rating?.reviews) ? g.rating.reviews.map(r => ({
        userId: r.userId?.toString() || '',
        rating: r.rating || 0,
        comment: r.comment || '',
        createdAt: r.createdAt || '',
      })) : [],
    },
    status: g.status || 'active',
    totalBookings: g.totalBookings || 0,
    isVerified: g.isVerified || false,
    verificationDocuments: g.verificationDocuments || {},
    policies: {
      cancellation: g.policies?.cancellation || '',
      rules: Array.isArray(g.policies?.rules) ? g.policies.rules : [],
      advanceBooking: g.policies?.advanceBooking || 30,
    },
    distance: g.distance || 0,
  };
}

// Get all grounds with filters (MongoDB + fallback for demo)
router.get("/", async (req, res) => {
  try {
    const {
      cityId,
      search,
      minPrice,
      maxPrice,
      amenities,
      pitchType,
      lighting,
      parking,
      minRating,
      lat,
      lng,
      maxDistance,
      page = 1,
      limit = 12,
    } = req.query;

    let grounds = [];
    let total = 0;
    let usedFallback = false;

    // Always try to fetch from MongoDB for all cities
    try {
      const filter = { status: "active", isVerified: true };
      if (cityId) filter["location.cityId"] = cityId;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { amenities: { $in: [new RegExp(search, "i")] } },
        ];
      }
      if (minPrice || maxPrice) {
        filter["price.perHour"] = {};
        if (minPrice) filter["price.perHour"].$gte = Number(minPrice);
        if (maxPrice) filter["price.perHour"].$lte = Number(maxPrice);
      }
      if (amenities) {
        const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
        filter.amenities = { $all: amenitiesArray };
      }
      if (pitchType && pitchType !== "all") {
        filter["features.pitchType"] = pitchType;
      }
      if (lighting === "true") {
        filter["features.lighting"] = true;
      }
      if (parking === "true") {
        filter["features.parking"] = true;
      }
      if (minRating) {
        filter["rating.average"] = { $gte: Number(minRating) };
      }
      const skip = (Number(page) - 1) * Number(limit);
      grounds = await Ground.find(filter)
        .populate("owner.userId", "name email phone")
        .sort({ "rating.average": -1, totalBookings: -1 })
        .skip(skip)
        .limit(Number(limit));
      total = await Ground.countDocuments(filter);
      // Calculate distances if coordinates provided
      if (lat && lng) {
        grounds = grounds
          .map((ground) => {
            const distance = ground.location && ground.location.latitude && ground.location.longitude
              ? calculateDistance(Number(lat), Number(lng), ground.location.latitude, ground.location.longitude)
              : null;
            return { ...ground.toObject(), distance };
          })
          .filter((ground) =>
            maxDistance && ground.distance !== null ? ground.distance <= Number(maxDistance) : true,
          )
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
      // Get today's bookings for availability
      const today = new Date().toISOString().split("T")[0];
      const groundIds = grounds.map((g) => g._id);
      const todayBookings = demoBookings.filter(
        (b) => groundIds.includes(b.groundId) && b.bookingDate === today
      );
      // Add availability info
      grounds = grounds.map((ground) => {
        const groundBookings = todayBookings.filter(
          (b) => b.groundId === ground._id.toString(),
        );
        const bookedSlots = groundBookings.map((b) => b.timeSlot);
        return {
          ...ground.toObject(),
          availability: {
            ...ground.availability,
            bookedSlots,
            availableSlots: ground.availability?.timeSlots?.filter(
              (slot) => !bookedSlots.includes(slot),
            ) || [],
          },
        };
      });
    } catch (dbError) {
      console.log("Database unavailable, using fallback data");
    }

    // If no grounds found in MongoDB and city is mumbai or delhi, use fallback
    if (grounds.length === 0 && (cityId === "mumbai" || cityId === "delhi")) {
      usedFallback = true;
      let filteredGrounds = [...fallbackGrounds];
      if (cityId) {
        filteredGrounds = filteredGrounds.filter(
          (ground) => ground.location.cityId === cityId,
        );
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredGrounds = filteredGrounds.filter(
          (ground) =>
            ground.name.toLowerCase().includes(searchLower) ||
            ground.description.toLowerCase().includes(searchLower) ||
            ground.amenities.some((amenity) =>
              amenity.toLowerCase().includes(searchLower),
            ),
        );
      }
      if (minPrice || maxPrice) {
        filteredGrounds = filteredGrounds.filter((ground) => {
          const price = ground.price.perHour;
          if (minPrice && price < Number(minPrice)) return false;
          if (maxPrice && price > Number(maxPrice)) return false;
          return true;
        });
      }
      if (amenities) {
        const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
        filteredGrounds = filteredGrounds.filter((ground) =>
          amenitiesArray.every((amenity) => ground.amenities.includes(amenity)),
        );
      }
      if (pitchType && pitchType !== "all") {
        filteredGrounds = filteredGrounds.filter(
          (ground) => ground.features.pitchType === pitchType,
        );
      }
      if (lighting === "true") {
        filteredGrounds = filteredGrounds.filter(
          (ground) => ground.features.lighting === true,
        );
      }
      if (parking === "true") {
        filteredGrounds = filteredGrounds.filter(
          (ground) => ground.features.parking === true,
        );
      }
      if (minRating) {
        filteredGrounds = filteredGrounds.filter(
          (ground) => ground.rating.average >= Number(minRating),
        );
      }
      if (lat && lng && maxDistance) {
        filteredGrounds = filteredGrounds.filter((ground) => {
          const distance = calculateDistance(
            Number(lat),
            Number(lng),
            ground.location.latitude,
            ground.location.longitude,
          );
          return distance <= Number(maxDistance);
        });
      }
      total = filteredGrounds.length;
      const skip = (Number(page) - 1) * Number(limit);
      grounds = filteredGrounds.slice(skip, skip + Number(limit));
    }

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
      usedFallback,
    });
  } catch (error) {
    console.error("Get grounds error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch grounds",
    });
  }
});

// Helper function for distance calculation
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get single ground by ID (MongoDB + fallback for demo)
router.get("/:id", async (req, res) => {
  try {
    let ground = null;
    let bookingsByDate = {};

    console.log("Ground details request for ID:", req.params.id);

    // Validate the ID parameter
    if (!req.params.id || req.params.id === "undefined") {
      console.log("Invalid ground ID received:", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid ground ID",
      });
    }

    // Check if it's a valid MongoDB ObjectId (24 character hex string)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    console.log("Is valid ObjectId:", isValidObjectId);

    // First try to fetch from MongoDB only if it's a valid ObjectId
    if (isValidObjectId) {
      try {
        console.log("Attempting to fetch from MongoDB...");
        ground = await Ground.findById(req.params.id).populate(
          "owner.userId",
          "name email phone",
        );

        if (ground) {
          console.log("Ground found in MongoDB:", ground.name);
          // Get today's bookings for this ground
          const today = new Date().toISOString().split("T")[0];
          const bookings = demoBookings.filter(
            (b) => b.groundId === req.params.id && b.bookingDate === today
          );
          // Group bookings by date
          bookings.forEach((booking) => {
            const date = booking.bookingDate;
            if (!bookingsByDate[date]) {
              bookingsByDate[date] = [];
            }
            bookingsByDate[date].push(booking.timeSlot);
          });
          ground = mapMongoGroundToFallback(ground, bookingsByDate);
        } else {
          console.log("Ground not found in MongoDB");
        }
      } catch (dbError) {
        console.log("Database unavailable, checking fallback data:", dbError.message);
      }
    }

    // If not found in database, check fallback data for Mumbai/Delhi
    if (!ground) {
      console.log("Checking fallback data for ID:", req.params.id);
      ground = fallbackGrounds.find((g) => g._id === req.params.id);

      if (!ground) {
        console.log("Ground not found in fallback data either");
        return res.status(404).json({
          success: false,
          message: "Ground not found",
        });
      }

      console.log("Ground found in fallback data:", ground.name);

      // For fallback data, create mock booking data for next 7 days
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        bookingsByDate[date] = ground.availability.bookedSlots || [];
      }
    }

    console.log("Returning ground data for:", ground.name);
    res.json({
      success: true,
      ground: {
        ...ground,
        bookingsByDate,
      },
    });
  } catch (error) {
    console.error("Get ground error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ground details",
    });
  }
});

// Get ground availability for specific date (DEMO)
router.get("/:id/availability/:date", (req, res) => {
  const { id, date } = req.params;
  
  // Validate the ID parameter
  if (!id || id === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Invalid ground ID",
    });
  }

  // Check if it's a valid MongoDB ObjectId (24 character hex string)
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  
  // First try to find in MongoDB only if it's a valid ObjectId
  if (isValidObjectId) {
    Ground.findById(id).then(ground => {
      if (ground) {
        // Get all bookings for this ground and date
        const bookings = demoBookings.filter(
          (b) => b.groundId === id && b.bookingDate === date
        );
        const bookedSlots = bookings.map((b) => b.timeSlot);
        const allSlots = ground.availability?.timeSlots && ground.availability.timeSlots.length > 0
          ? ground.availability.timeSlots
          : DEFAULT_TIME_SLOTS;
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
      } else {
        // Check fallback data
        const fallbackGround = fallbackGrounds.find((g) => g._id === id);
        if (!fallbackGround) {
          return res.status(404).json({ success: false, message: "Ground not found" });
        }
        
        const bookings = demoBookings.filter(
          (b) => b.groundId === id && b.bookingDate === date
        );
        const bookedSlots = bookings.map((b) => b.timeSlot);
        const allSlots = fallbackGround.availability?.timeSlots || [];
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
      }
    }).catch(error => {
      console.error("Get availability error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch availability",
      });
    });
  } else {
    // If not a valid ObjectId, check fallback data directly
    const fallbackGround = fallbackGrounds.find((g) => g._id === id);
    if (!fallbackGround) {
      return res.status(404).json({ success: false, message: "Ground not found" });
    }
    
    const bookings = demoBookings.filter(
      (b) => b.groundId === id && b.bookingDate === date
    );
    const bookedSlots = bookings.map((b) => b.timeSlot);
    const allSlots = fallbackGround.availability?.timeSlots || [];
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
  }
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
