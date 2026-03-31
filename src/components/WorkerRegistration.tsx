import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Category } from '../types';
import { CATEGORIES, MAIN_CATEGORIES } from '../constants';
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
  const [isSkillsOpen, setIsSkillsOpen] = useState(false); 
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
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
        setIsLoading(false);
      },
      (error) => {
        console.error('Error capturing location:', error);
        alert('Could not capture location. Please enable GPS. / स्थान का पता नहीं चल सका। कृपया GPS चालू करें।');
        setIsLoading(false);
      }
    );
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.location) {
      alert('Please capture your GPS location first. / कृपया पहले अपना GPS स्थान कैप्चर करें।');
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
      alert('Failed to register. Please try again. / पंजीकरण विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ सुधार: इसमें ढूंढने का लॉजिक बेहतर किया गया है
  const selectedMainCat = MAIN_CATEGORIES.find(
    cat => formData.category.includes(cat.hindi) || formData.category.includes(cat.english)
  );

  // ✅ सुधार: स्किल्स फ़िल्टर करने के लिए MAIN_CATEGORIES की ID का इस्तेमाल
  const filteredSkills = selectedMainCat 
    ? CATEGORIES.filter(skill => skill.mainCategoryId === selectedMainCat.id)
    : [];

  const SelectedIcon = selectedMainCat ? (iconMap[selectedMainCat.icon] || Wrench) : Wrench;

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 text-center">
        <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="text-emerald-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Register as a Worker</h2>
        <button
          onClick={signInWithGoogle}
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm"
        >
          Sign in with Google / Google से साइन इन करें
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
            <button onClick={() => setIsSuccess(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl">Register Another</button>
          </motion.div>
        ) : (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4">Create Your Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><User size={16} /> Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Phone size={16} /> Mobile</label>
                <input required type="tel" pattern="[0-9]{10}" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Home size={16} /> Pincode</label>
                <input required type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><MapPin size={16} /> Village</label>
                <input required type="text" value={formData.village} onChange={(e) => setFormData({ ...formData, village: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              
              {/* Category Dropdown */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="block text-sm font-semibold text-slate-700">Category / श्रेणी</label>
                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <SelectedIcon size={18} className="text-emerald-600" />
                    <span className="text-sm font-bold text-slate-700">{formData.category}</span>
                  </div>
                  <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border z-50 max-h-[300px] overflow-y-auto py-2">
                    {MAIN_CATEGORIES.map((cat) => (
                      <button key={cat.id} type="button" onClick={() => { setFormData({ ...formData, category: `${cat.hindi} (${cat.english})` as Category, skills: '' }); setIsDropdownOpen(false); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-emerald-50 text-left">
                        <span className="text-sm font-bold text-slate-700">{cat.hindi}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills Dropdown (Fixed Logic) */}
              <div className="space-y-2 relative" ref={skillsRef}>
                <label className="block text-sm font-semibold text-slate-700">Skills / हुनर</label>
                <button type="button" onClick={() => setIsSkillsOpen(!isSkillsOpen)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left">
                  <span className={`text-sm ${formData.skills ? 'font-bold text-slate-700' : 'text-slate-400'}`}>
                    {formData.skills || 'Select Skill / हुनर चुनें'}
                  </span>
                  <ChevronDown size={18} className={`transition-transform ${isSkillsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSkillsOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border z-50 max-h-[300px] overflow-y-auto py-2">
                    {filteredSkills.length > 0 ? (
                      filteredSkills.map((skill) => (
                        <button key={skill.id} type="button" onClick={() => { setFormData({ ...formData, skills: `${skill.hindi} (${skill.english})` }); setIsSkillsOpen(false); }} className="w-full px-4 py-2.5 hover:bg-emerald-50 text-left border-b last:border-0 border-slate-50">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{skill.hindi}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{skill.english}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-slate-500 italic">पहले श्रेणी चुनें</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300">
              <button type="button" onClick={captureLocation} className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all ${formData.location ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}>
                <MapPin size={18} />
                {formData.location ? 'Location Captured' : 'Capture GPS'}
              </button>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 active:scale-[0.98]">
              {isLoading ? "Processing..." : "Submit Registration"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
