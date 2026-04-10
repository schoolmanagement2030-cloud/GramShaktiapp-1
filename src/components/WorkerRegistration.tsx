import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { MAIN_CATEGORIES, CATEGORY_MAP } from '../constants'; 
import { CheckCircle, LogIn, ChevronDown, Loader2 } from 'lucide-react'; // Loader2 जोड़ा गया
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkerRegistration() {

  const [user, setUser] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false); // गांवों के लोडिंग के लिए
  const [villagesList, setVillagesList] = useState<string[]>([]); // गांवों की लिस्ट स्टोर करने के लिए

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false); // गांव के ड्रॉपडाउन के लिए

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

  // ✅ Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // ✅ Close dropdown logic
  useEffect(() => {
    function handleClickOutside(e: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (subDropdownRef.current && !subDropdownRef.current.contains(e.target)) setIsSubDropdownOpen(false);
      if (villageRef.current && !villageRef.current.contains(e.target)) setIsVillageDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔥 पिन कोड से गांव फेच करने का लॉजिक (FIX)
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
      console.error("Pincode API Error", err);
    } finally {
      setIsLoadingVillages(false);
    }
  };

  const selectedCategoryObj: any = MAIN_CATEGORIES.find(
    (cat: any) => cat.english === formData.category
  );

  const captureLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }));
        alert("Location Captured!");
      },
      () => alert("GPS ON karo aur allow karo")
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.pincode || !formData.village) {
      alert("Sari details bhariye");
      return;
    }

    if (!formData.location) {
      alert("GPS capture karna jaruri hai");
      return;
    }

    try {
      await addDoc(collection(db, 'workers'), {
        ...formData,
        uid: user?.uid || "guest",
        createdAt: new Date()
      });
      setIsSuccess(true);
    } catch (err) {
      alert("Data save nahi hua. Internet check kare.");
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow text-center">
        <LogIn className="mx-auto text-green-600 mb-4" size={40} />
        <button onClick={signInWithGoogle} className="bg-green-600 text-white px-6 py-3 rounded-xl">
          Google Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div key="success" initial={{opacity:0}} animate={{opacity:1}}>
            <CheckCircle className="text-green-600 mx-auto" size={60} />
            <h2 className="text-center text-xl mt-4 font-bold">Registration Successful</h2>
          </motion.div>
        ) : (
        <motion.form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold">Register Worker</h2>

          <input className="w-full p-3 border rounded-xl" placeholder="Name" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} />
          <input className="w-full p-3 border rounded-xl" placeholder="Mobile" value={formData.mobile} onChange={e=>setFormData({...formData,mobile:e.target.value})} />
          
          {/* PINCODE */}
          <div className="relative">
            <input className="w-full p-3 border rounded-xl" placeholder="Pincode" maxLength={6} value={formData.pincode} onChange={e=>setFormData({...formData,pincode:e.target.value})} />
            {isLoadingVillages && <Loader2 className="absolute right-3 top-3 animate-spin text-gray-400" />}
          </div>

          {/* VILLAGE DROPDOWN (NEW) */}
          <div ref={villageRef} className="relative">
            <button type="button" onClick={()=>setIsVillageDropdownOpen(!isVillageDropdownOpen)} className="w-full p-3 border rounded-xl flex justify-between bg-white text-left">
              {formData.village || (isLoadingVillages ? "Loading..." : "Select Village")}
              <ChevronDown />
            </button>
            {isVillageDropdownOpen && villagesList.length > 0 && (
              <div className="absolute z-10 w-full border mt-1 rounded-xl bg-white shadow-xl max-h-48 overflow-y-auto">
                {villagesList.map((v, i) => (
                  <div key={i} className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-0" onClick={() => { setFormData({...formData, village: v}); setIsVillageDropdownOpen(false); }}>
                    {v}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MAIN CATEGORY */}
          <div ref={dropdownRef}>
            <button type="button" onClick={()=>setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 border rounded-xl flex justify-between">
              {formData.category || "Select Category"}
              <ChevronDown />
            </button>
            {isDropdownOpen && (
              <div className="border mt-2 rounded-xl bg-white shadow max-h-60 overflow-y-auto">
                {MAIN_CATEGORIES.map((cat: any)=>(
                  <div key={cat.english} className="p-3 hover:bg-gray-100 cursor-pointer" onClick={()=>{ setFormData({...formData, category: cat.english, subCategory: ''}); setIsDropdownOpen(false); }}>
                    {cat.hindi}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUB CATEGORY */}
          <div ref={subDropdownRef}>
            <button type="button" onClick={()=>setIsSubDropdownOpen(!isSubDropdownOpen)} className="w-full p-3 border rounded-xl flex justify-between">
              {formData.subCategory || "Select Work"}
              <ChevronDown />
            </button>
            {isSubDropdownOpen && selectedCategoryObj && (
              <div className="border mt-2 rounded-xl bg-white shadow max-h-60 overflow-y-auto">
                {CATEGORY_MAP[selectedCategoryObj.english]?.map((sub: string,i:number)=>(
                  <div key={i} className="p-3 hover:bg-gray-100 cursor-pointer" onClick={()=>{ setFormData({...formData, subCategory: sub}); setIsSubDropdownOpen(false); }}>
                    {sub}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={captureLocation} className={`px-4 py-3 rounded-xl w-full ${formData.location ? 'bg-green-100 text-green-700' : 'bg-black text-white'}`}>
            {formData.location ? "GPS Location Captured ✓" : "Capture GPS"}
          </button>

          <button type="submit" className="bg-green-600 text-white w-full p-4 rounded-xl font-bold">
            Submit Registration
          </button>

        </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
