import { useState } from "react";
import { User, Mail, Phone, Calendar, MapPin, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import { mockBookings, type BookingData } from "@/lib/mockData";

const Profile = () => {
  const [bookings] = useState<BookingData[]>(mockBookings);

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+91 9876543210",
    joinDate: "January 2024",
    location: "Mumbai, Maharashtra",
    totalBookings: bookings.length,
    favoriteGrounds: 3,
  };

  const getStatusColor = (status: BookingData["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-grass-light via-white to-sky-blue/10">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="w-24 h-24 bg-gradient-cricket rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-white" />
                </div>
                <CardTitle className="text-xl">{user.name}</CardTitle>
                <p className="text-gray-600">Cricket Enthusiast</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{user.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Member since {user.joinDate}</span>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Total Bookings
                    </span>
                    <Badge variant="secondary">{user.totalBookings}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Favorite Grounds
                    </span>
                    <Badge variant="secondary">{user.favoriteGrounds}</Badge>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full text-cricket-green border-cricket-green hover:bg-cricket-green/10"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="bookings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bookings">My Bookings</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    My Bookings
                  </h2>
                  <Button className="bg-cricket-green hover:bg-cricket-green/90">
                    Book New Ground
                  </Button>
                </div>

                {bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {booking.groundName}
                                </h3>
                                <Badge
                                  className={getStatusColor(booking.status)}
                                >
                                  {booking.status.charAt(0).toUpperCase() +
                                    booking.status.slice(1)}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{booking.date}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{booking.timeSlot}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span>{booking.playerCount} players</span>
                                </div>
                              </div>

                              <div className="mt-3 text-sm text-gray-600">
                                Booked on{" "}
                                {new Date(
                                  booking.bookingDate,
                                ).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-bold text-cricket-green">
                                ₹{booking.totalAmount}
                              </div>
                              <div className="text-sm text-gray-600">
                                Total Amount
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2 mt-4">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            {booking.status === "confirmed" && (
                              <Button variant="outline" size="sm">
                                Reschedule
                              </Button>
                            )}
                            {booking.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No bookings yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Start exploring cricket grounds and make your first
                        booking!
                      </p>
                      <Button className="bg-cricket-green hover:bg-cricket-green/90">
                        Explore Grounds
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Favorites Tab */}
              <TabsContent value="favorites" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Favorite Grounds
                  </h2>
                </div>

                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No favorites yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Add cricket grounds to your favorites for quick access.
                    </p>
                    <Button
                      variant="outline"
                      className="text-cricket-green border-cricket-green hover:bg-cricket-green/10"
                    >
                      Browse Grounds
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Account Settings
                  </h2>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Booking confirmations</span>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ground recommendations</span>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Promotional offers</span>
                        <Button variant="outline" size="sm">
                          Disable
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Privacy Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Location sharing</span>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Profile visibility</span>
                        <Button variant="outline" size="sm">
                          Public
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Account Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full text-cricket-green border-cricket-green hover:bg-cricket-green/10"
                      >
                        Change Password
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Delete Account
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
