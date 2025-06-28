import { useState, useEffect } from "react";
import { Calendar, Clock, Users, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { bookingsApi, groundsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Ground {
  _id: string;
  name: string;
  location: {
    address: string;
  };
  price: {
    perHour: number;
  };
  features: {
    capacity: number;
  };
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ground: Ground | null;
  selectedDate?: Date;
  selectedTimeSlot?: string;
  onBookingCreated: (booking: any) => void;
}

interface TimeSlot {
  slot: string;
  isAvailable: boolean;
}

const BookingModal = ({
  isOpen,
  onClose,
  ground,
  selectedDate,
  selectedTimeSlot,
  onBookingCreated,
}: BookingModalProps) => {
  const { user, isAuthenticated } = useAuth();
  const [bookingData, setBookingData] = useState({
    date: selectedDate || new Date(),
    timeSlot: selectedTimeSlot || "",
    teamName: "",
    playerCount: "",
    contactPerson: {
      name: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
    },
    requirements: "",
  });

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  useEffect(() => {
    if (user) {
      setBookingData((prev) => ({
        ...prev,
        contactPerson: {
          name: user.name,
          phone: user.phone,
          email: user.email,
        },
      }));
    }
  }, [user]);

  useEffect(() => {
    if (ground && bookingData.date) {
      fetchAvailability();
    }
  }, [ground, bookingData.date]);

  const fetchAvailability = async () => {
    if (!ground) return;

    try {
      setIsLoadingSlots(true);
      const dateStr = format(bookingData.date, "yyyy-MM-dd");
      const response = await groundsApi.getAvailability(ground._id, dateStr);

      if (response.success) {
        const slots = response.availability.allSlots.map((slot: string) => ({
          slot,
          isAvailable: response.availability.availableSlots.includes(slot),
        }));
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      toast.error("Failed to load available time slots");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const calculatePricing = () => {
    if (!ground || !bookingData.timeSlot) return null;

    const [startTime, endTime] = bookingData.timeSlot.split("-");
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const baseAmount = ground.price.perHour * duration;
    const taxes = Math.round(baseAmount * 0.18); // 18% GST
    const totalAmount = baseAmount + taxes;

    return {
      baseAmount,
      duration,
      taxes,
      totalAmount,
    };
  };

  const handleCreateBooking = async () => {
    if (!ground || !isAuthenticated) return;

    // Validation
    if (!bookingData.timeSlot) {
      toast.error("Please select a time slot");
      return;
    }

    if (!bookingData.playerCount || parseInt(bookingData.playerCount) < 1) {
      toast.error("Please enter valid number of players");
      return;
    }

    if (parseInt(bookingData.playerCount) > ground.features.capacity) {
      toast.error(
        `Maximum ${ground.features.capacity} players allowed for this ground`,
      );
      return;
    }

    if (!bookingData.contactPerson.name || !bookingData.contactPerson.phone) {
      toast.error("Please provide contact person details");
      return;
    }

    try {
      setIsCreatingBooking(true);

      const bookingPayload = {
        groundId: ground._id,
        bookingDate: format(bookingData.date, "yyyy-MM-dd"),
        timeSlot: bookingData.timeSlot,
        playerDetails: {
          teamName: bookingData.teamName || undefined,
          playerCount: parseInt(bookingData.playerCount),
          contactPerson: bookingData.contactPerson,
        },
        requirements: bookingData.requirements || undefined,
      };

      const response = await bookingsApi.createBooking(bookingPayload);

      if (response.success) {
        toast.success("Booking created successfully!");
        onBookingCreated(response.booking);
        onClose();
      }
    } catch (error: any) {
      console.error("Failed to create booking:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const pricing = calculatePricing();

  if (!ground) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Cricket Ground</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ground Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold">{ground.name}</h3>
            <p className="text-sm text-gray-600">{ground.location.address}</p>
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span>₹{ground.price.perHour}/hour</span>
              <span>Max {ground.features.capacity} players</span>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !bookingData.date && "text-muted-foreground",
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {bookingData.date ? (
                    format(bookingData.date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={bookingData.date}
                  onSelect={(date) =>
                    date &&
                    setBookingData((prev) => ({ ...prev, date, timeSlot: "" }))
                  }
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-2">
            <Label>Select Time Slot</Label>
            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-cricket-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.slot}
                    variant={
                      bookingData.timeSlot === slot.slot ? "default" : "outline"
                    }
                    disabled={!slot.isAvailable}
                    onClick={() =>
                      setBookingData((prev) => ({
                        ...prev,
                        timeSlot: slot.slot,
                      }))
                    }
                    className={cn(
                      "text-sm",
                      bookingData.timeSlot === slot.slot &&
                        "bg-cricket-green hover:bg-cricket-green/90",
                      !slot.isAvailable && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {slot.slot}
                    {!slot.isAvailable && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        Booked
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Team Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name (Optional)</Label>
              <Input
                id="teamName"
                placeholder="Enter your team name"
                value={bookingData.teamName}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    teamName: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerCount">
                Number of Players <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="playerCount"
                  type="number"
                  min="1"
                  max={ground.features.capacity}
                  placeholder="Enter number of players"
                  value={bookingData.playerCount}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      playerCount: e.target.value,
                    }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="space-y-4">
            <h4 className="font-medium">Contact Person Details</h4>

            <div className="space-y-2">
              <Label htmlFor="contactName">
                Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="contactName"
                  placeholder="Contact person name"
                  value={bookingData.contactPerson.name}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      contactPerson: {
                        ...prev.contactPerson,
                        name: e.target.value,
                      },
                    }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="Contact phone number"
                  value={bookingData.contactPerson.phone}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      contactPerson: {
                        ...prev.contactPerson,
                        phone: e.target.value,
                      },
                    }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email (Optional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="Contact email"
                  value={bookingData.contactPerson.email}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      contactPerson: {
                        ...prev.contactPerson,
                        email: e.target.value,
                      },
                    }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements">
              Special Requirements (Optional)
            </Label>
            <Textarea
              id="requirements"
              placeholder="Any special requirements or notes..."
              value={bookingData.requirements}
              onChange={(e) =>
                setBookingData((prev) => ({
                  ...prev,
                  requirements: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          {/* Pricing Summary */}
          {pricing && (
            <div className="bg-green-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-green-800">Pricing Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Base Amount ({pricing.duration} hours)</span>
                  <span>₹{pricing.baseAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span>₹{pricing.taxes}</span>
                </div>
                <div className="flex justify-between font-semibold text-green-800 border-t pt-1">
                  <span>Total Amount</span>
                  <span>₹{pricing.totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreateBooking}
              disabled={
                isCreatingBooking ||
                !bookingData.timeSlot ||
                !bookingData.playerCount ||
                !bookingData.contactPerson.name ||
                !bookingData.contactPerson.phone
              }
              className="flex-1 bg-cricket-green hover:bg-cricket-green/90"
            >
              {isCreatingBooking ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
