import React, { useState, useRef, useEffect, useMemo } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Category } from '../types';
import { MAIN_CATEGORIES } from '../constants';
import { 
  MapPin, Phone, User as UserIcon, Home, CheckCircle, LogIn, 
  ChevronDown, Wrench, Tractor, Truck, Store, PartyPopper, 
  Monitor, HeartPulse, GraduationCap, HardHat, PawPrint, 
  Droplets, Key, Coffee, Briefcase 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, any> = {
  Wrench, Tractor, Truck, Store, PartyPopper, Monitor, 
  User: UserIcon, HeartPulse, GraduationCap, HardHat, 
  PawPrint, Droplets, Key, Coffee, Briefcase
};

export default function WorkerRegistration() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    pincode: '',
    village: '',
    category: MAIN_CATEGORIES[0] 
      ? `${MAIN_CATEGORIES[0].hindi} (${MAIN_CATEGORIES[0].english})` 
      : '',
    subCategory: '',
    location: null as { lat: number; lng: number } | null,
  });

  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const subDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ FIXED AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (subDropdownRef.current && !subDropdownRef.current.contains(event.target as Node)) {
        setIsSubDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const captureLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        }));
        setIsLoading(false);
      },
      () => {
        alert("GPS enable karo");
        setIsLoading(false);
      }
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.location) {
      alert("GPS capture karo");
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'workers'), {
        ...formData,
        uid: user.uid,
        createdAt: new Date()
      });
      setIsSuccess(true);
    } catch (err) {
      alert("Error aaya");
    }
    setIsLoading(false);
  };

  const selectedMainCat = useMemo(() => {
    return MAIN_CATEGORIES.find(
      c => `${c.hindi} (${c.english})` === formData.category
    );
  }, [formData.category]);

  const SelectedIcon = selectedMainCat 
    ? iconMap[selectedMainCat.icon] || Wrench 
    : Wrench;

  // 🔴 SAFE COLOR (no crash)
  const colorClass = "bg-emerald-100 text-emerald-700";

  // 🔴 LOGIN SCREEN
  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md text-center">
        <LogIn className="mx-auto mb-4 text-green-600" size={40} />
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <button
          onClick={signInWithGoogle}
          className="bg-green-600 text-white px-6 py-3 rounded-xl"
        >
          Google Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CheckCircle className="text-green-600 mx-auto" size={50} />
            <h2 className="text-center text-xl mt-4">Success</h2>
          </motion.div>
        ) : (
          <motion.form onSubmit={handleSubmit}>
            
            <input
              placeholder="Name"
              className="w-full p-3 border mb-3"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />

            <input
              placeholder="Mobile"
              className="w-full p-3 border mb-3"
              value={formData.mobile}
              onChange={e => setFormData({...formData, mobile: e.target.value})}
            />

            {/* CATEGORY */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-3 border mb-3 flex justify-between"
            >
              {formData.category || "Select Category"}
              <ChevronDown />
            </button>

            {isDropdownOpen && (
              <div className="border mb-3">
                {MAIN_CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        category: `${cat.hindi} (${cat.english})`
                      });
                      setIsDropdownOpen(false);
                    }}
                  >
                    {cat.hindi}
                  </div>
                ))}
              </div>
            )}

            {/* GPS */}
            <button
              type="button"
              onClick={captureLocation}
              className="bg-black text-white px-4 py-2 mb-3"
            >
              Capture GPS
            </button>

            <button
              type="submit"
              className="bg-green-600 text-white w-full p-3 rounded-xl"
            >
              Submit
            </button>

          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
