import { useState, useEffect, useMemo } from "react";
import { MapPin, Zap, Star, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import LocationSelector from "@/components/LocationSelector";
import GroundCard from "@/components/GroundCard";
import FilterPanel from "@/components/FilterPanel";
import NewBookingModal from "@/components/NewBookingModal";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/cities";
import { groundsApi } from "@/lib/api";
import type { FilterOptions } from "@/components/FilterPanel";
import { calculateDistance } from "@/lib/cities";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState<City | undefined>();
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedGround, setSelectedGround] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [grounds, setGrounds] = useState<any[]>([]);
  const [isLoadingGrounds, setIsLoadingGrounds] = useState(false);

  const defaultFilters: FilterOptions = {
    priceRange: [500, 2000],
    distance: 25,
    amenities: [],
    pitchType: "all",
    lighting: false,
    parking: false,
    rating: 0,
    availability: "all",
  };

  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  // Test API connection on mount
  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log("🧪 Testing API connection...");
        const response = await fetch("http://localhost:3001/api/test");
        const data = await response.json();
        console.log("✅ API Test Result:", data);
      } catch (error) {
        console.error("❌ API Test Failed:", error);
      }
    };
    testAPI();
  }, []);

  // Auto-open location selector on first visit
  useEffect(() => {
    if (!selectedCity) {
      const timer = setTimeout(() => {
        setIsLocationSelectorOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedCity]);

  // Fetch grounds when city or filters change
  useEffect(() => {
    if (selectedCity) {
      fetchGrounds();
    }
  }, [selectedCity, searchQuery, filters]);

  // Restore selected city from localStorage on mount
  useEffect(() => {
    const savedCity = localStorage.getItem("boxcric_selected_city");
    if (savedCity) {
      setSelectedCity(JSON.parse(savedCity));
    }
  }, []);

  const fetchGrounds = async () => {
    if (!selectedCity) return;

    try {
      setIsLoadingGrounds(true);
      console.log(
        "🔍 Fetching grounds for city:",
        selectedCity.name,
        selectedCity.id,
      );

      const params: any = {
        cityId: selectedCity.id,
        page: 1,
        limit: 20,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (filters.priceRange[0] !== 500 || filters.priceRange[1] !== 2000) {
        params.minPrice = filters.priceRange[0];
        params.maxPrice = filters.priceRange[1];
      }

      if (filters.amenities.length > 0) {
        params.amenities = filters.amenities;
      }

      if (filters.pitchType !== "all") {
        params.pitchType = filters.pitchType;
      }

      if (filters.lighting) {
        params.lighting = true;
      }

      if (filters.parking) {
        params.parking = true;
      }

      if (filters.rating > 0) {
        params.minRating = filters.rating;
      }

      if (filters.distance < 25) {
        params.maxDistance = filters.distance;
        params.lat = selectedCity.latitude;
        params.lng = selectedCity.longitude;
      }

      console.log("📡 API Request params:", params);
      const response = await groundsApi.getGrounds(params);
      console.log("📥 API Response:", response);

      if (response.success) {
        console.log("✅ Found grounds:", response.grounds.length);
        setGrounds(response.grounds);
      } else {
        console.log("❌ API returned error:", response.message);
        setGrounds([]);
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch grounds:", error);
      toast.error("Failed to load grounds. Please try again.");
      setGrounds([]);
    } finally {
      setIsLoadingGrounds(false);
    }
  };

  // Display grounds (already filtered by API)
  const displayGrounds = useMemo(() => {
    return grounds;
  }, [grounds]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    localStorage.setItem("boxcric_selected_city", JSON.stringify(city));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleBookGround = (groundId: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to book a ground");
      return;
    }

    const ground = grounds.find((g) => g._id === groundId);
    if (ground) {
      setSelectedGround(ground);
      setIsBookingModalOpen(true);
    }
  };

  const handleViewDetails = (groundId: string) => {
    console.log("View details clicked for ground ID:", groundId);
    console.log("Ground data:", displayGrounds.find(g => g._id === groundId));
    navigate(`/ground/${groundId}`);
  };

  const handleBookingCreated = (booking: any) => {
    toast.success("Booking created successfully!");
    navigate(`/booking/${booking._id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-grass-light via-white to-sky-blue/10">
      <Navbar
        selectedCity={selectedCity?.name}
        onCitySelect={() => setIsLocationSelectorOpen(true)}
        onSearch={handleSearch}
        onFilterToggle={() => setIsFilterPanelOpen(true)}
      />

      {/* Hero Section */}
      <section className="relative py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-cricket opacity-20 blur-3xl rounded-full"></div>
            <h1 className="relative text-4xl md:text-6xl font-bold font-display text-gray-900 mb-6">
              Book Your Perfect{" "}
              <span className="text-transparent bg-gradient-to-r from-cricket-green to-sky-blue bg-clip-text">
                Cricket Ground
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover amazing box cricket grounds near you. From premium
            facilities to budget-friendly options, find the perfect pitch for
            your game.
          </p>

          {!selectedCity && (
            <Button
              size="lg"
              className="bg-cricket-green hover:bg-cricket-green/90 text-lg px-8 py-3"
              onClick={() => setIsLocationSelectorOpen(true)}
            >
              <MapPin className="w-5 h-5 mr-2" />
              Choose Your Location
            </Button>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto">
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-cricket-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-cricket-green" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">500+</h3>
                <p className="text-gray-600">Cricket Grounds</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-cricket-yellow/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-cricket-yellow" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">50k+</h3>
                <p className="text-gray-600">Happy Players</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-sky-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-sky-blue" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">24/7</h3>
                <p className="text-gray-600">Booking Support</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Location Prompt */}
      {!selectedCity && (
        <section className="py-8 px-4 bg-white/50">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-cricket-green/5 border border-cricket-green/20 rounded-full px-6 py-3">
              <MapPin className="w-5 h-5 text-cricket-green animate-pulse" />
              <span className="text-cricket-green font-medium">
                Select your city to discover nearby cricket grounds
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Grounds Listing */}
      {selectedCity && (
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Cricket Grounds in {selectedCity.name}
                </h2>
                <p className="text-gray-600 mt-1">
                  {displayGrounds.length} grounds available
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {Object.values(filters).some((value, index) =>
                  index === 0
                    ? (value as [number, number])[0] !== 500 ||
                      (value as [number, number])[1] !== 2000
                    : index === 1
                      ? value !== 25
                      : index === 2
                        ? (value as string[]).length > 0
                        : index === 3
                          ? value !== "all"
                          : index >= 4 && index <= 5
                            ? value === true
                            : index === 6
                              ? value > 0
                              : value !== "all",
                ) && (
                  <Badge variant="secondary" className="text-sm">
                    Filters Applied
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterPanelOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <span>Filters</span>
                </Button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({ ...filters, priceRange: [500, 1000] })
                }
                className={cn(
                  filters.priceRange[1] <= 1000 &&
                    "bg-cricket-green/10 border-cricket-green text-cricket-green",
                )}
              >
                Budget Friendly
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, lighting: true })}
                className={cn(
                  filters.lighting &&
                    "bg-cricket-green/10 border-cricket-green text-cricket-green",
                )}
              >
                Night Games
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, rating: 4.5 })}
                className={cn(
                  filters.rating >= 4.5 &&
                    "bg-cricket-green/10 border-cricket-green text-cricket-green",
                )}
              >
                Highly Rated
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, distance: 5 })}
                className={cn(
                  filters.distance <= 5 &&
                    "bg-cricket-green/10 border-cricket-green text-cricket-green",
                )}
              >
                Nearby
              </Button>
            </div>

            {/* Grounds Grid */}
            {isLoadingGrounds ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : displayGrounds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayGrounds.map((ground) => (
                  <GroundCard
                    key={ground._id}
                    ground={ground}
                    onBook={handleBookGround}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No grounds found
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedCity
                    ? `No cricket grounds found in ${selectedCity.name}. Try adjusting your filters.`
                    : "Select a city to discover amazing cricket grounds near you."}
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="text-cricket-green border-cricket-green hover:bg-cricket-green/10"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it Works */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How BoxCric Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Booking your perfect cricket ground is just a few clicks away
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cricket-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-cricket-green" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                1. Choose Location
              </h3>
              <p className="text-gray-600">
                Select your city or let us auto-detect your location to find
                nearby cricket grounds.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cricket-yellow/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-cricket-yellow" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                2. Find Perfect Ground
              </h3>
              <p className="text-gray-600">
                Browse through verified grounds, check amenities, ratings, and
                prices to find your ideal match.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-sky-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-sky-blue" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                3. Book & Play
              </h3>
              <p className="text-gray-600">
                Select your preferred time slot, make secure payment, and get
                ready for an amazing cricket experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Components */}
      <LocationSelector
        isOpen={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        onCitySelect={handleCitySelect}
        selectedCity={selectedCity}
      />

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      <NewBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        ground={selectedGround}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
};

export default Index;
