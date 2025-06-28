import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Filter, Menu, X, User, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

interface NavbarProps {
  selectedCity?: string;
  onCitySelect?: () => void;
  onSearch?: (query: string) => void;
  onFilterToggle?: () => void;
}

const Navbar = ({
  selectedCity,
  onCitySelect,
  onSearch,
  onFilterToggle,
}: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">(
    "login",
  );

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleAuthClick = (tab: "login" | "register") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Help & Support", path: "/help" },
  ];

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-cricket rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-cricket-green rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold font-display text-cricket-green">
                  BoxCric
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Book. Play. Win.</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="text-gray-700 hover:text-cricket-green transition-colors duration-200 font-medium"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Search Bar and Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Location Selector */}
              <Button
                variant="outline"
                size="sm"
                onClick={onCitySelect}
                className="flex items-center space-x-2"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{selectedCity || "Select City"}</span>
              </Button>

              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search grounds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </form>

              {/* Filter */}
              {onFilterToggle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFilterToggle}
                  className="flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden lg:inline">Filter</span>
                </Button>
              )}

              {/* Auth Section */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2 h-10"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-cricket-green text-white text-xs">
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline font-medium">
                        {user.name.split(" ")[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/profile/bookings")}
                    >
                      My Bookings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAuthClick("login")}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="bg-cricket-green hover:bg-cricket-green/90"
                    onClick={() => handleAuthClick("register")}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-4">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="text"
                    placeholder="Search grounds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </form>

                {/* Mobile Location and Filter */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCitySelect}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {selectedCity || "Select City"}
                    </span>
                  </Button>
                  {onFilterToggle && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onFilterToggle}
                      className="flex items-center space-x-2"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filter</span>
                    </Button>
                  )}
                </div>

                {/* Mobile Navigation */}
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="block px-3 py-2 text-gray-700 hover:text-cricket-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                {/* Mobile Auth */}
                {isAuthenticated && user ? (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-3 px-3 py-2">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-cricket-green text-white">
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-gray-700 hover:text-cricket-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/profile/bookings"
                      className="block px-3 py-2 text-gray-700 hover:text-cricket-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-3 py-2 text-gray-700 hover:text-cricket-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-cricket-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        handleAuthClick("login");
                        setIsMenuOpen(false);
                      }}
                    >
                      Login
                    </Button>
                    <Button
                      className="flex-1 bg-cricket-green hover:bg-cricket-green/90"
                      onClick={() => {
                        handleAuthClick("register");
                        setIsMenuOpen(false);
                      }}
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
};

export default Navbar;
