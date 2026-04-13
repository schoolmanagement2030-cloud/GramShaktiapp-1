import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { MAIN_CATEGORIES, CATEGORY_MAP } from '../constants';
import { ChevronDown, Loader2, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkerRegistration() {

  const [user, setUser] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);
  const [villagesList, setVillagesList] = useState<string[]>([]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const subDropdownRef = useRef<HTMLDivElement>(null);
  const villageRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    pincode: '',
    village: '',
    category: '',
    subCategory: '',
    location: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (subDropdownRef.current && !subDropdownRef.current.contains(e.target)) setIsSubDropdownOpen(false);
      if (villageRef.current && !villageRef.current.contains(e.target)) setIsVillageDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (formData.pincode.length === 6) {
      fetchVillages(formData.pincode);
    } else {
      setVillagesList([]);
      setFormData(prev => ({ ...prev, village: '' }));
    }
  }, [formData.pincode]);

  const fetchVillages = async (pin: string) => {
    setIsLoadingVillages(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data[0].Status === "Success") {
        const villages = data[0].PostOffice.map((po: any) => po.Name);
        setVillagesList(villages);
      } else {
        alert("Sahi Pincode dale");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingVillages(false);
    }
  };

  const selectedCategoryObj =
    MAIN_CATEGORIES?.find((cat: any) => cat.english === formData.category) || null;

  const captureLocation = () => {
    // मोबाइल पर GPS अलर्ट
    alert("GPS Permission maangi ja rahi hai...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }));
        alert("GPS Location Capture ho gayi!");
      },
      (error) => {
        console.error(error);
        alert("GPS Error: " + error.message + ". Kripya Setting se Location ON karein.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ✅ मुख्य सबमिट फंक्शन (Alerts के साथ)
  const handleSubmit = async (e: any) => {
    if (e) e.preventDefault();
    
    // 1. बटन दबते ही अलर्ट आएगा
    alert("Submit Button dab gaya hai!");

    if (!formData.name || !formData.mobile || !formData.pincode || !formData.village || !formData.category || !formData.subCategory) {
      alert("Adhoori jankari! Kripya category aur kaam chunein.");
      return;
    }

    if (!formData.location) {
      alert("GPS capture karna bhool gaye hain!");
      return;
    }

    alert("Firebase mein data bheja ja raha hai...");

    try {
      const docRef = await addDoc(collection(db, 'workers'), {
        ...formData,
        uid: user?.uid || "guest",
        createdAt: serverTimestamp()
      });

      alert("Mubarak ho! Data save ho gaya ID: " + docRef.id);
      setIsSuccess(true);

    } catch (err: any) {
      console.error("Firebase Error:", err);
      alert("Firebase ki Galti: " + err.message);
    }
  };

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow text-center">
        <LogIn className="mx-auto text-green-600 mb-4" size={40} />
        <button onClick={signInWithGoogle} className="bg-green-600 text-white px-6 py-3 rounded-xl">
          Google Login Karein
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 text-center">
            <h1 className="text-green-600 font-bold text-2xl">Registration Successful!</h1>
          </motion.div>
        ) : (
          <motion.form onSubmit={handleSubmit} className="space-y-4">
            <input className="w-full p-3 border rounded-xl" placeholder="Aapka Naam" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <input className="w-full p-3 border rounded-xl" placeholder="Mobile Number" type="tel" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
            <input className="w-full p-3 border rounded-xl" placeholder="Pincode" type="number" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />

            {/* VILLAGE */}
            <div ref={villageRef} className="relative">
              <button type="button" onClick={() => setIsVillageDropdownOpen(!isVillageDropdownOpen)} className="w-full p-3 border rounded-xl flex justify-between bg-white text-left">
                {formData.village || "Select Village"}
                <ChevronDown size={20} />
              </button>
              {isVillageDropdownOpen && (
                <div className="absolute z-10 w-full border mt-1 rounded-xl max-h-40 overflow-y-auto bg-white shadow-lg">
                  {villagesList.map((v, i) => (
                    <div key={i} className="p-3 hover:bg-green-50 cursor-pointer border-b" onClick={() => { setFormData({ ...formData, village: v }); setIsVillageDropdownOpen(false); }}>{v}</div>
                  ))}
                </div>
              )}
            </div>

            {/* CATEGORY */}
            <div ref={dropdownRef} className="relative">
              <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 border rounded-xl flex justify-between bg-white text-left">
                {formData.category ? MAIN_CATEGORIES.find(c => c.english === formData.category)?.hindi : "Work Category"}
                <ChevronDown size={20} />
              </button>
              {isDropdownOpen && (
                <div className="absolute z-10 w-full border mt-2 rounded-xl bg-white shadow-lg max-h-60 overflow-y-auto">
                  {MAIN_CATEGORIES.map((cat: any) => (
                    <div key={cat.english} className="p-3 hover:bg-gray-100 cursor-pointer border-b" onClick={() => { setFormData({ ...formData, category: cat.english, subCategory: '' }); setIsDropdownOpen(false); }}>{cat.hindi}</div>
                  ))}
                </div>
              )}
            </div>

            {/* SUB CATEGORY */}
            <div ref={subDropdownRef} className="relative">
              <button type="button" onClick={() => setIsSubDropdownOpen(!isSubDropdownOpen)} className="w-full p-3 border rounded-xl flex justify-between bg-white text-left">
                {formData.subCategory || "Kaam chunein"}
                <ChevronDown size={20} />
              </button>
              {isSubDropdownOpen && selectedCategoryObj && (
                <div className="absolute z-10 w-full border mt-2 rounded-xl bg-white shadow-lg max-h-60 overflow-y-auto">
                  {CATEGORY_MAP[selectedCategoryObj?.english || ""]?.map((sub: string, i: number) => (
                    <div key={i} className="p-3 hover:bg-gray-100 cursor-pointer border-b" onClick={() => { setFormData({ ...formData, subCategory: sub }); setIsSubDropdownOpen(false); }}>{sub}</div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS */}
            <button type="button" onClick={captureLocation} className={`w-full p-3 rounded-xl ${formData.location ? 'bg-green-100 text-green-700' : 'bg-black text-white'}`}>
              {formData.location ? "GPS Captured ✓" : "Capture Location"}
            </button>

            {/* SUBMIT BUTTON */}
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="bg-green-600 text-white w-full p-4 rounded-xl font-bold shadow-md active:scale-95"
            >
              Submit Registration
            </button>

          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
