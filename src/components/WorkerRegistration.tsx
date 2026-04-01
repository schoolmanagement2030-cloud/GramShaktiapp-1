import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { MAIN_CATEGORIES, CATEGORY_MAP } from '../constants'; // ✅ FIXED
import { CheckCircle, LogIn, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkerRegistration() {

  const [user, setUser] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const subDropdownRef = useRef<HTMLDivElement>(null);

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

  // ✅ Close dropdown
  useEffect(() => {
    function handleClickOutside(e: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (subDropdownRef.current && !subDropdownRef.current.contains(e.target)) {
        setIsSubDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Selected category object
  const selectedCategoryObj: any = MAIN_CATEGORIES.find(
    (cat: any) => cat.english === formData.category
  );

  // ✅ GPS
  const captureLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        }));
      },
      () => alert("GPS ON karo")
    );
  };

  // ✅ Submit
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!formData.location) {
      alert("GPS capture karo");
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
      alert("Error aaya");
      console.error(err);
    }
  };

  // 🔴 LOGIN
  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow text-center">
        <LogIn className="mx-auto text-green-600 mb-4" size={40} />
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
    <div className="bg-white p-6 rounded-2xl shadow-lg border max-w-md mx-auto">
      <AnimatePresence mode="wait">

        {isSuccess ? (
          <motion.div key="success" initial={{opacity:0}} animate={{opacity:1}}>
            <CheckCircle className="text-green-600 mx-auto" size={60} />
            <h2 className="text-center text-xl mt-4 font-bold">
              Registration Successful
            </h2>
          </motion.div>
        ) : (

        <motion.form onSubmit={handleSubmit} className="space-y-4">

          <h2 className="text-xl font-bold">Register Worker</h2>

          {/* INPUTS */}
          <input className="w-full p-3 border rounded-xl"
            placeholder="Name"
            value={formData.name}
            onChange={e=>setFormData({...formData,name:e.target.value})}
          />

          <input className="w-full p-3 border rounded-xl"
            placeholder="Mobile"
            value={formData.mobile}
            onChange={e=>setFormData({...formData,mobile:e.target.value})}
          />

          <input className="w-full p-3 border rounded-xl"
            placeholder="Pincode"
            value={formData.pincode}
            onChange={e=>setFormData({...formData,pincode:e.target.value})}
          />

          <input className="w-full p-3 border rounded-xl"
            placeholder="Village"
            value={formData.village}
            onChange={e=>setFormData({...formData,village:e.target.value})}
          />

          {/* 🔥 MAIN CATEGORY */}
          <div ref={dropdownRef}>
            <button type="button"
              onClick={()=>setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-3 border rounded-xl flex justify-between"
            >
              {formData.category || "Select Category"}
              <ChevronDown />
            </button>

            {isDropdownOpen && (
              <div className="border mt-2 rounded-xl bg-white shadow max-h-60 overflow-y-auto">
                {MAIN_CATEGORIES.map((cat: any)=>(
                  <div key={cat.english}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={()=>{
                      setFormData({
                        ...formData,
                        category: cat.english,
                        subCategory: ''
                      });
                      setIsDropdownOpen(false);
                    }}
                  >
                    {cat.hindi}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🔥 SUB CATEGORY (DYNAMIC) */}
          <div ref={subDropdownRef}>
            <button type="button"
              onClick={()=>setIsSubDropdownOpen(!isSubDropdownOpen)}
              className="w-full p-3 border rounded-xl flex justify-between"
            >
              {formData.subCategory || "Select Work"}
              <ChevronDown />
            </button>

            {isSubDropdownOpen && selectedCategoryObj && (
              <div className="border mt-2 rounded-xl bg-white shadow max-h-60 overflow-y-auto">
                {CATEGORY_MAP[selectedCategoryObj.english]?.map((sub: string,i:number)=>(
                  <div key={i}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={()=>{
                      setFormData({
                        ...formData,
                        subCategory: sub
                      });
                      setIsSubDropdownOpen(false);
                    }}
                  >
                    {sub}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GPS */}
          <button type="button"
            onClick={captureLocation}
            className="bg-black text-white px-4 py-3 rounded-xl w-full"
          >
            Capture GPS
          </button>

          {/* SUBMIT */}
          <button
            type="submit"
            className="bg-green-600 text-white w-full p-4 rounded-xl"
          >
            Submit
          </button>

        </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
