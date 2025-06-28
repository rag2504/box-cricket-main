import { useState, useEffect } from "react";
import { CreditCard, Shield, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { paymentsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Booking {
  id: string;
  bookingId: string;
  groundId?: any;
  ground?: any;
  bookingDate: string;
  timeSlot: {
    startTime: string;
    endTime: string;
    duration: number;
  };
  playerDetails: {
    teamName?: string;
    playerCount: number;
    contactPerson: {
      name: string;
      phone: string;
    };
  };
  pricing?: {
    baseAmount?: number;
    discount?: number;
    taxes?: number;
    totalAmount?: number;
    duration?: number;
  };
  amount?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onPaymentSuccess: (booking: Booking) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentModal = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
}: PaymentModalProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => {
        toast.error("Failed to load payment gateway");
      };
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, []);

  const handlePayment = async () => {
    if (!booking || !user || !razorpayLoaded) return;

    try {
      setIsProcessing(true);

      // Create order on backend
      const orderResponse = await paymentsApi.createOrder({
        bookingId: booking.id,
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || "Failed to create order");
      }

      const { order, key } = orderResponse; // <-- key is returned from backend

      if (!key) {
        throw new Error("Razorpay key missing from server response.");
      }

      const ground =
        (booking.groundId && typeof booking.groundId === "object"
          ? booking.groundId
          : booking.ground) || {};

      const options = {
        key, // <-- CRITICALLY IMPORTANT: use backend-provided key
        amount: order.amount,
        currency: order.currency,
        name: "BoxCric",
        description: `Booking for ${ground?.name || "Ground"}`,
        image: "/placeholder.svg",
        order_id: order.id,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        notes: {
          booking_id: booking.bookingId,
          ground_name: ground?.name || "",
        },
        theme: {
          color: "#22c55e",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.error("Payment cancelled");
          },
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await paymentsApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id,
            });

            if (verifyResponse.success) {
              toast.success("Payment successful! Booking confirmed.");
              onPaymentSuccess(booking);
              onClose();
            } else {
              throw new Error(
                verifyResponse.message || "Payment verification failed",
              );
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error(error.message || "Payment verification failed");
            await paymentsApi.paymentFailed?.({
              bookingId: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              error: error.message,
            });
          } finally {
            setIsProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      toast.error(error.message || "Failed to initiate payment");
      setIsProcessing(false);
    }
  };

  if (!booking) return null;

  const ground =
    (booking.groundId && typeof booking.groundId === "object"
      ? booking.groundId
      : booking.ground) || {};

  let firstImage = "/placeholder.svg";
  if (
    ground.images &&
    Array.isArray(ground.images) &&
    ground.images.length > 0
  ) {
    const imgItem = ground.images[0];
    if (typeof imgItem === "string") {
      firstImage = imgItem;
    } else if (imgItem && typeof imgItem === "object" && "url" in imgItem) {
      firstImage = imgItem.url || "/placeholder.svg";
    }
  }

  const address =
    ground?.location?.address ||
    (ground?.location ? ground.location : "") ||
    "No address available";

  // Defensive pricing fallback
  const pricing = booking?.pricing || {
    baseAmount: booking?.amount || 0,
    discount: 0,
    taxes: 0,
    totalAmount: booking?.amount || 0,
    duration: booking?.timeSlot?.duration || 1,
  };
  const baseAmount = pricing.baseAmount ?? 0;
  const discount = pricing.discount ?? 0;
  const taxes = pricing.taxes ?? 0;
  const totalAmount = pricing.totalAmount ?? 0;
  const duration = pricing.duration ?? 1;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="payment-desc" className="sm:max-w-lg">
        <div id="payment-desc" style={{display: 'none'}}>
          Complete your payment securely via Razorpay.
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-cricket-green" />
            <span>Complete Payment</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <img
                src={firstImage}
                alt={ground?.name || "Ground"}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {ground?.name || "Ground"}
                </h3>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{address}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Date:</span>
                <div className="font-medium">
                  {formatDate(booking.bookingDate)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <div className="font-medium">
                  {booking.timeSlot?.startTime
                    ? booking.timeSlot.startTime + " - " + booking.timeSlot.endTime
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <div className="font-medium">
                  {booking.timeSlot?.duration || duration || "-"} hours
                </div>
              </div>
              <div>
                <span className="text-gray-600">Players:</span>
                <div className="font-medium">
                  {booking.playerDetails?.playerCount}
                </div>
              </div>
            </div>

            {booking.playerDetails?.teamName && (
              <div>
                <span className="text-gray-600 text-sm">Team:</span>
                <div className="font-medium">
                  {booking.playerDetails.teamName}
                </div>
              </div>
            )}

            <div>
              <span className="text-gray-600 text-sm">Contact Person:</span>
              <div className="font-medium">
                {booking.playerDetails?.contactPerson?.name} -{" "}
                {booking.playerDetails?.contactPerson?.phone}
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <h4 className="font-semibold">Payment Details</h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base Amount</span>
                <span>₹{baseAmount}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span>₹{taxes}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount</span>
                <span className="text-cricket-green">
                  ₹{totalAmount}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Info */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-green-600 mt-1" />
              <div className="text-sm">
                <div className="font-medium text-green-800">Secure Payment</div>
                <div className="text-green-700">
                  Your payment is protected by 256-bit SSL encryption and
                  processed securely through Razorpay.
                </div>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !razorpayLoaded}
              className="w-full bg-cricket-green hover:bg-cricket-green/90 h-12 text-lg"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Payment...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Pay ₹{totalAmount}</span>
                </div>
              )}
            </Button>

            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>This booking will expire in 15 minutes if not paid</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;