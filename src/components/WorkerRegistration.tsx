import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Category } from '../types';
import { CATEGORIES, MAIN_CATEGORIES } from '../constants'; // CATEGORIES में आपकी सब-कैटेगरी लिस्ट है
import { MapPin, Phone, User, Home, CheckCircle, LogIn, ChevronDown, Wrench, Tractor, Truck, Store, PartyPopper, Monitor, HeartPulse, GraduationCap, HardHat, PawPrint, Droplets, Key, Coffee, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const iconMap: Record<string, any> = {
  Wrench, Tractor, Truck, Store, PartyPopper, Monitor, User, HeartPulse, GraduationCap, HardHat, PawPrint, Droplets, Key, Coffee, Briefcase
};

export default function WorkerRegistration() {
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false); // स्किल्स ड्रॉपडाउन के लिए
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    pincode: '',
    village: '',
    category: `${MAIN_CATEGORIES[0].hindi} (${MAIN_CATEGORIES[0].english})` as Category,
    skills: '',
    location: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (skillsRef.current && !skillsRef.current.contains(event.target as Node)) {
        setIsSkillsOpen(false);
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
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
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
      alert('Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMainCat = MAIN_CATEGORIES.find(
    cat => formData.category.includes(cat.hindi) || formData.category.includes(cat.english)
  );

  // 🛠️ फिल्टर स्किल्स: चुनी हुई कैटेगरी के आधार पर सब-कैटेगरी निकालना
  const filteredSkills = CATEGORIES.filter(c => c.mainCategoryId === selectedMainCat?.id);

  const SelectedIcon = selectedMainCat ? (iconMap[selectedMainCat.icon] || Wrench) : Wrench;

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 text-center">
        <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="text-emerald-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Register as a Worker</h2>
        <button onClick={signInWithGoogle} className="w-full bg-white border border-slate-200 py-3 px-6 rounded-xl flex items-center justify-center gap-3">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <CheckCircle className="text-emerald-600 mx-auto mb-6" size={48} />
            <h2 className="text-3xl font-bold mb-2">Registration Successful!</h2>
            <button onClick={() => setIsSuccess(false)} className="bg-emerald-600 text-white py-3 px-8 rounded-xl">Register Another</button>
          </motion.div>
        ) : (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4">Create Your Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Name / Shop Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Mobile Number</label>
                <input required type="tel" pattern="[0-9]{10}" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Pincode</label>
                <input required type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Village / Locality</label>
                <input required type="text" value={formData.village} onChange={(e) => setFormData({ ...formData, village: e.target.value })} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              
              {/* Main Category Dropdown */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="block text-sm font-semibold text-slate-700">Category / श्रेणी</label>
                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <SelectedIcon size={18} />
                    <span className="text-sm font-bold text-slate-700">{formData.category}</span>
                  </div>
                  <ChevronDown size={18} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border z-50 max-h-[250px] overflow-y-auto">
                    {MAIN_CATEGORIES.map((cat) => (
                      <button key={cat.id} type="button" onClick={() => { setFormData({ ...formData, category: `${cat.hindi} (${cat.english})` as Category, skills: '' }); setIsDropdownOpen(false); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-emerald-50 text-left">
                        <span className="text-sm font-bold text-slate-700">{cat.hindi}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🛠️ Skills Dropdown (बदला हुआ हिस्सा) */}
              <div className="space-y-2 relative" ref={skillsRef}>
                <label className="block text-sm font-semibold text-slate-700">Skills / Services (हुनर / सेवाएं)</label>
                <button
                  type="button"
                  onClick={() => setIsSkillsOpen(!isSkillsOpen)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left"
                >
                  <span className="text-sm text-slate-700">{formData.skills || "Select Skill / हुनर चुनें"}</span>
                  <ChevronDown size={18} className="text-slate-400" />
                </button>
                {isSkillsOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border z-50 max-h-[250px] overflow-y-auto py-2">
                    {filteredSkills.length > 0 ? (
                      filteredSkills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, skills: `${skill.hindi} (${skill.english})` });
                            setIsSkillsOpen(false);
                          }}
                          className="w-full px-4 py-2 hover:bg-emerald-50 text-left text-sm font-medium text-slate-700"
                        >
                          {skill.hindi} ({skill.english})
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-slate-400">Please select category first / पहले श्रेणी चुनें</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="font-bold text-slate-900">GPS Location / GPS स्थान</h3>
                </div>
                <button type="button" onClick={captureLocation} className={`py-3 px-6 rounded-xl font-bold ${formData.location ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}>
                  {formData.location ? 'Location Captured' : 'Capture GPS'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200">
              {isLoading ? "Processing..." : "Submit Registration / पंजीकरण जमा करें"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
