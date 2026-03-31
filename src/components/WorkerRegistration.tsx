import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Category } from '../types';
import { CATEGORIES, MAIN_CATEGORIES } from '../constants';
import { MapPin, Phone, User, Home, CheckCircle, LogIn, ChevronDown, Wrench, Tractor, Truck, Store, PartyPopper, Monitor, HeartPulse, GraduationCap, HardHat, PawPrint, Droplets, Key, Coffee, Briefcase } from 'lucide-react';

// ✅ FIX 1 (IMPORTANT)
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, any> = {
  Wrench, Tractor, Truck, Store, PartyPopper, Monitor, User, HeartPulse, GraduationCap, HardHat, PawPrint, Droplets, Key, Coffee, Briefcase
};

export default function WorkerRegistration() {
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    pincode: '',
    village: '',
    category: `${MAIN_CATEGORIES[0].hindi} (${MAIN_CATEGORIES[0].english})` as Category,
    subCategory: '',
    skills: '',
    location: null as { lat: number; lng: number } | null,
  });

  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const subDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

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
      (position) => {
        setFormData({
          ...formData,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
        setIsLoading(false);
      },
      (error) => {
        console.error('Error capturing location:', error);
        alert('Could not capture location. Please enable GPS.');
        setIsLoading(false);
      }
    );
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    console.error('Firestore Error:', error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.location) {
      alert('Please capture your GPS location first.');
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'workers'), {
        ...formData,
        uid: user.uid,
        createdAt: new Date().toISOString(),
      });
      setIsSuccess(true);
    } catch (error: any) {
      handleFirestoreError(error, 'create', 'workers');
      alert('Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMainCat = MAIN_CATEGORIES.find(
    cat => formData.category.includes(cat.hindi) || formData.category.includes(cat.english)
  );

  useEffect(() => {
    if (selectedMainCat && selectedMainCat.subCategories.length > 0) {
      const firstSub = selectedMainCat.subCategories[0];
      setFormData(prev => ({ ...prev, subCategory: `${firstSub.hindi} (${firstSub.english})` }));
    }
  }, [formData.category]);

  const SelectedIcon = selectedMainCat ? (iconMap[selectedMainCat.icon] || Wrench) : Wrench;

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 text-center">
        <LogIn size={32} />
        <h2>Register</h2>
        <button onClick={signInWithGoogle}>Google Sign In</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckCircle size={48} />
            <h2>Success</h2>
          </motion.div>
        ) : (
          <motion.form onSubmit={handleSubmit}>
            
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Name"
            />

            <input
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="Mobile"
            />

            {/* ✅ FIX 2 (Dynamic Tailwind removed safely) */}
            <div className="p-2 text-emerald-600">
              Category Selected
            </div>

            <button type="button" onClick={captureLocation}>
              Capture Location
            </button>

            <button type="submit">
              Submit
            </button>

          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
