import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PhoneCall, MapPin, Mail, Clock } from "lucide-react";
import { IsaluLogo } from "./IsaluLogo";

export function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBookAppointmentClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const elem = document.getElementById("specialized-medical-centers");
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      navigate("/#specialized-medical-centers");
    }
  };

  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <IsaluLogo size="md" />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Providing 24/7 world-class medical care, emergency treatment, and online doctor appointment booking without any registration hassle.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/" className="hover:text-teal-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/#specialized-medical-centers"
                  onClick={handleBookAppointmentClick}
                  className="hover:text-teal-400 transition-colors"
                >
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="hover:text-teal-400 transition-colors">
                  Check Booking Status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-white uppercase tracking-wider">Departments</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Cardiology & Heart Care</li>
              <li>Pediatrics & Child Health</li>
              <li>Neurology & Spine</li>
              <li>Orthopedics & Joint Surgery</li>
              <li>General Medicine</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-white uppercase tracking-wider">Emergency Contact</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2 text-teal-300 font-semibold">
                <PhoneCall className="h-4 w-4" /> +234 (0) 800-ISALU-CARE
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> info@isaluhospitals.com
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>No. 46, Ijaiye Road (beside Tastee Fried Chicken and opposite Ogba Shopping Arcade / Caterpillar Bus Stop), Ogba, Ikeja, Lagos, Nigeria</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> 24 Hours Emergency & ICU Open
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Isalu Hospitals. All rights reserved. Online Doctor Booking System.
        </div>
      </div>
    </footer>
  );
}
