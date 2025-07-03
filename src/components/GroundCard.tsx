import { useState } from "react";
import { Star, MapPin, Clock, Users, Wifi, Car, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
interface GroundCardProps {
  ground: any; // API ground data structure
  onBook?: (groundId: string) => void;
  onViewDetails?: (groundId: string) => void;
}

const GroundCard = ({ ground, onBook, onViewDetails }: GroundCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleImageNavigation = (direction: "prev" | "next") => {
    if (direction === "next") {
      setCurrentImageIndex((prev) =>
        prev === ground.images.length - 1 ? 0 : prev + 1,
      );
    } else {
      setCurrentImageIndex((prev) =>
        prev === 0 ? ground.images.length - 1 : prev - 1,
      );
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      Floodlights: <span className="text-yellow-500">💡</span>,
      Parking: <Car className="w-3 h-3" />,
      Washroom: <span>🚿</span>,
      "Changing Room": <span>👕</span>,
      "AC Changing Room": <span>❄️👕</span>,
      "Drinking Water": <span>💧</span>,
      "First Aid": <span>🏥</span>,
      "Equipment Rental": <span>🏏</span>,
      Cafeteria: <span>☕</span>,
      Scoreboard: <span>📊</span>,
      Referee: <span>👨‍⚖️</span>,
      "Equipment Storage": <span>📦</span>,
    };
    return iconMap[amenity] || <span>✨</span>;
  };

  const availableSlots = ground.availability?.availableSlots?.length || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        {/* Image Carousel */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={
              ground.images?.[currentImageIndex]?.url ||
              ground.images?.[currentImageIndex] ||
              "/placeholder.svg"
            }
            alt={ground.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Image Navigation */}
          {ground.images && ground.images.length > 1 && (
            <>
              <button
                onClick={() => handleImageNavigation("prev")}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                ‹
              </button>
              <button
                onClick={() => handleImageNavigation("next")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                ›
              </button>

              {/* Image Indicators */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {ground.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      index === currentImageIndex ? "bg-white" : "bg-white/50",
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col space-y-1">
            {ground.owner.verified && (
              <Badge className="bg-cricket-green text-white">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {availableSlots <= 2 && availableSlots > 0 && (
              <Badge variant="destructive">Few slots left</Badge>
            )}
            {availableSlots === 0 && (
              <Badge variant="secondary">Fully booked</Badge>
            )}
          </div>

          {/* Price */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="text-xs font-bold text-cricket-green text-right">
              {Array.isArray(ground.price?.ranges) && ground.price.ranges.length > 0 ? (
                <>
                  <div className="text-sm">Starting from</div>
                  <div className="text-lg">₹{Math.min(...ground.price.ranges.map(r => r.perHour))}/hr</div>
                </>
              ) : (
                <>No price slots set</>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Header */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-cricket-green transition-colors duration-200">
              {ground.name}
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{ground.location.address}</span>
              {ground.distance && (
                <span className="text-cricket-green font-medium">
                  • {ground.distance.toFixed(1)} km away
                </span>
              )}
            </div>
          </div>

          {/* Rating and Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{ground.rating.average}</span>
                <span className="text-sm text-gray-500">
                  ({ground.rating.count})
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{ground.features.capacity}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{availableSlots} slots</span>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {ground.amenities.slice(0, 4).map((amenity, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs flex items-center space-x-1"
                >
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                </Badge>
              ))}
              {ground.amenities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{ground.amenities.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mb-4 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Pitch: {ground.features.pitchType}</span>
              <div className="flex items-center space-x-2">
                {ground.features.lighting && (
                  <Badge variant="outline" className="text-xs">
                    Night Play
                  </Badge>
                )}
                {ground.features.parking && (
                  <Badge variant="outline" className="text-xs">
                    Parking
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onViewDetails?.(ground._id)}
            >
              View Details
            </Button>
            <Button
              className="flex-1 bg-cricket-green hover:bg-cricket-green/90"
              onClick={() => onBook?.(ground._id)}
              disabled={availableSlots === 0}
            >
              {availableSlots === 0 ? "Fully Booked" : "Book Now"}
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default GroundCard;
