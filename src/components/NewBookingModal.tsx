import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, MapPin, DollarSign, Star } from "lucide-react";
import { format } from "date-fns";
import { groundsApi, bookingsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Ground {
  _id: string;
  name: string;
  location: { address: string };
  price: { perHour: number };
  features: { capacity: number };
}

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ground: Ground | null;
  onBookingCreated: (booking: any) => void;
}

interface TimeSlot {
  slot: string;
  label: string;
  isAvailable: boolean;
}

const ALL_24H_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const start = `${i.toString().padStart(2, "0")}:00`;
  const end = `${((i + 1) % 24).toString().padStart(2, "0")}:00`;
  const label =
    format(new Date(2000, 0, 1, i, 0), "hh:mm a") +
    " - " +
    format(new Date(2000, 0, 1, (i + 1) % 24, 0), "hh:mm a");
  return { slot: `${start}-${end}`, label };
});

const NewBookingModal: React.FC<NewBookingModalProps> = ({ 
  isOpen, 
  onClose, 
  ground, 
  onBookingCreated 
}) => {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [playerCount, setPlayerCount] = useState("");
  const [teamName, setTeamName] = useState("");
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");

  // Generate next 7 days for quick date selection
  const getQuickDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(date, tomorrow);
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE");
  };

  useEffect(() => {
    if (user) {
      setContactName(user.name || "");
      setContactPhone(user.phone || "");
      setContactEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (ground && selectedDate) {
      fetchAvailability();
    }
  }, [ground, selectedDate]);

  const fetchAvailability = async () => {
    if (!ground || !selectedDate) return;
    setIsLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await groundsApi.getAvailability(ground._id, dateStr);
      let bookedSlots: string[] = [];
      if (response.data && response.data.success && response.data.availability) {
        bookedSlots = response.data.availability.bookedSlots || [];
      }
      
      const now = new Date();
      const isSelectedToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      
      setAvailableSlots(
        ALL_24H_SLOTS.map((slot) => {
          const slotHour = parseInt(slot.slot.split(":")[0], 10);
          const isPast = isSelectedToday && slotHour <= now.getHours();
          const isBooked = bookedSlots.includes(slot.slot);
          return {
            ...slot,
            isAvailable: !isPast && !isBooked,
          };
        })
      );
    } catch (e) {
      setAvailableSlots(
        ALL_24H_SLOTS.map((slot) => ({ ...slot, isAvailable: true }))
      );
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!ground || !selectedDate || !selectedSlot || !playerCount || !contactName || !contactPhone) return;
    
    try {
      // Format the date properly
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      
      // Create the booking data
      const bookingData = {
        groundId: ground._id,
        bookingDate: formattedDate,
        timeSlot: selectedSlot,
        playerDetails: {
          teamName: teamName || undefined,
          playerCount: parseInt(playerCount),
          contactPerson: {
            name: contactName,
            phone: contactPhone,
            email: contactEmail || undefined,
          },
        },
        requirements: "",
      };

      console.log("Sending booking data:", bookingData);

      // Make the API call to create the booking
      const response = await bookingsApi.createBooking(bookingData);
      
      console.log("Booking response:", response);
      
      if (response && response.success) {
        toast.success("Booking created successfully!");
        onBookingCreated(response.booking);
        onClose();
      } else {
        throw new Error(response?.message || "Failed to create booking");
      }
    } catch (error: any) {
      console.error("Booking creation failed:", error);
      console.error("Error details:", error.response || error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create booking. Please try again.";
      toast.error(errorMessage);
    }
  };

  if (!ground) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full rounded-3xl p-0 overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50">
        <div className="relative bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 px-8 py-6 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              Book {ground.name}
            </DialogTitle>
            <div className="text-green-100 mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {ground.location.address}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ₹{ground.price.perHour}/hour
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Max {ground.features.capacity}
              </span>
            </div>
          </DialogHeader>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-4 -translate-x-4"></div>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Select Date</h3>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {getQuickDates().map((date, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot("");
                  }}
                  className={`p-3 rounded-xl text-center transition-all duration-200 ${
                    selectedDate && isSameDay(date, selectedDate)
                      ? "bg-green-600 text-white shadow-lg scale-105"
                      : "bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 text-gray-700"
                  }`}
                >
                  <div className="text-xs font-medium">{getDateLabel(date)}</div>
                  <div className="text-lg font-bold">{format(date, "d")}</div>
                  <div className="text-xs opacity-75">{format(date, "MMM")}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Available Times</h3>
            </div>
            
            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading available slots...</span>
              </div>
            ) : availableSlots.filter((s) => s.isAvailable).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No available slots for this day</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableSlots
                  .filter(s => s.isAvailable)
                  .map(slot => (
                    <button
                      key={slot.slot}
                      onClick={() => setSelectedSlot(slot.slot)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selectedSlot === slot.slot
                          ? "bg-green-600 text-white shadow-lg scale-105"
                          : "bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 text-gray-700"
                      }`}
                    >
                      {slot.label.split(' - ')[0]}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Team Name (Optional)
              </Label>
              <Input
                placeholder="Enter your team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-xl h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Number of Players *
              </Label>
              <Input
                type="number"
                min={1}
                max={ground.features.capacity}
                placeholder="Enter number of players"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-xl h-12"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Contact Person Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Full Name *
                </Label>
                <Input
                  placeholder="Contact person name"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-xl h-12 bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Phone Number *
                </Label>
                <Input
                  type="tel"
                  placeholder="Contact phone number"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-xl h-12 bg-white"
                />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Email Address (Optional)
                </Label>
                <Input
                  type="email"
                  placeholder="Contact email address"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-xl h-12 bg-white"
                />
              </div>
            </div>
          </div>

          {selectedDate && selectedSlot && playerCount && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-600" />
                Booking Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{availableSlots.find(s => s.slot === selectedSlot)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span className="font-medium">{playerCount} players</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-medium">₹{ground.price.perHour}/hour</span>
                </div>
                <div className="border-t border-blue-200 pt-3 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">₹{ground.price.perHour}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 h-12 rounded-xl border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={!selectedDate || !selectedSlot || !playerCount || !contactName || !contactPhone}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {!selectedDate || !selectedSlot || !playerCount || !contactName || !contactPhone 
                ? "Complete Details to Book" 
                : "Confirm Booking"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewBookingModal;