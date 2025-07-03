import React from 'react';

const Footer = () => (
  <footer className="bg-gradient-to-r from-green-800 to-green-500 text-white py-12 px-4 mt-12">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* About */}
      <div>
        <h3 className="text-2xl font-bold mb-2">About BoxCric</h3>
        <div className="w-16 h-1 bg-white mb-4" />
        <p className="text-sm mb-6">BoxCric is your one-stop platform to discover, compare, and book the best box cricket grounds near you. Enjoy seamless booking, verified reviews, and exclusive offers for your next cricket match!</p>
        <div className="flex space-x-3">
          <a href="#" className="bg-white/10 rounded-full p-2 hover:bg-white/20" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
          <a href="#" className="bg-white/10 rounded-full p-2 hover:bg-white/20" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
          <a href="#" className="bg-white/10 rounded-full p-2 hover:bg-white/20" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
          <a href="#" className="bg-white/10 rounded-full p-2 hover:bg-white/20" aria-label="YouTube"><i className="fab fa-youtube"></i></a>
        </div>
      </div>
      {/* Our Services */}
      <div>
        <h3 className="text-xl font-bold mb-2">Our Services</h3>
        <div className="w-12 h-1 bg-white mb-4" />
        <ul className="space-y-2 text-sm">
          <li>Ground Booking</li>
          <li>Team Management</li>
          <li>Match Scheduling</li>
          <li>Online Payments</li>
          <li>Player Stats & Leaderboards</li>
        </ul>
      </div>
      {/* Quick Links */}
      <div>
        <h3 className="text-xl font-bold mb-2">Quick Links</h3>
        <div className="w-12 h-1 bg-white mb-4" />
        <ul className="space-y-2 text-sm">
          <li><a href="/about">About Us</a></li>
          <li><a href="/help">Help & Support</a></li>
          <li><a href="/profile">My Bookings</a></li>
          <li><a href="/settings">Settings</a></li>
          <li><a href="/">Home</a></li>
        </ul>
      </div>
      {/* Contact Us */}
      <div>
        <h3 className="text-xl font-bold mb-2">Contact Us</h3>
        <div className="w-12 h-1 bg-white mb-4" />
        <ul className="space-y-3 text-sm">
          <li className="flex items-center space-x-2"><span>📞</span> <span>+91 98765 43210</span></li>
          <li className="flex items-center space-x-2"><span>✉️</span> <span>support@boxcric.com</span></li>
          <li className="flex items-center space-x-2"><span>📍</span> <span>Ahmedabad, Gujarat, India</span></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/20 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-white/80">
      <div>© {new Date().getFullYear()} BoxCric. All Rights Reserved.</div>
      <div className="flex space-x-6 mt-2 md:mt-0">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/about">About</a>
      </div>
    </div>
  </footer>
);

export default Footer; 