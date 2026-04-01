import React, { useState, useRef, useEffect, useMemo } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { MAIN_CATEGORIES } from '../constants';
import { 
  CheckCircle, LogIn, ChevronDown, Wrench 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, any> = {
  Wrench
};

export default function WorkerRegistration() {

  const safeMainCategories = MAIN_CATEGORIES || [];

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    category: safeMainCategories.length > 0
      ? `${safeMainCategories[0].hindi} (${safeMainCategories[0].english})`
      : '',
    subCategory: '',
    location: null as { lat: number; lng: number } | null,
  });

  // ✅ Auth Fix
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // ✅ Close dropdown safely
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

  // ✅ Safe selected category
  const selectedMainCat = useMemo(() => {
    return safeMainCategories.find(
      c => `${c.hindi} (${c.english})` === formData.category
    );
  }, [formData.category, safeMainCategories]);

  // ✅ Sub category safe fix
  useEffect(() => {
    if (selectedMainCat && selectedMainCat.subCategories?.length > 0) {
      setFormData(prev => ({
        ...prev,
        subCategory: `${selectedMainCat.subCategories[0].hindi} (${selectedMainCat.subCategories[0].english})`
      }));
    }
  }, [selectedMainCat]);

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
        alert("GPS ON karo");
        setIsLoading(false);
      }
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!formData.location) {
      alert("GPS capture karo");
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'workers'), {
        ...formData,
        uid: user?.uid || "guest", // ✅ FIX
        createdAt: new Date()
      });
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Error aaya");
    }
    setIsLoading(false);
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
    <div className="bg-white p-8 rounded-2xl shadow-lg border">
      <AnimatePresence mode="wait">

        {isSuccess ? (
          <motion.div key="success" initial={{opacity:0}} animate={{opacity:1}}>
            <CheckCircle className="text-green-600 mx-auto" size={60} />
            <h2 className="text-center text-2xl mt-4 font-bold">
              Registration Successful
            </h2>
          </motion.div>
        ) : (

        <motion.form onSubmit={handleSubmit} className="space-y-6">

          <h2 className="text-2xl font-bold">Register Worker</h2>

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

          {/* MAIN CATEGORY */}
          <div ref={dropdownRef}>
            <button type="button"
              onClick={()=>setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-3 border rounded-xl flex justify-between"
            >
              {formData.category || "Select Category"}
              <ChevronDown />
            </button>

            {isDropdownOpen && (
              <div className="border mt-2 rounded-xl bg-white shadow">
                {safeMainCategories.map(cat=>(
                  <div key={cat.id}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={()=>{
                      setFormData({
                        ...formData,
                        category:`${cat.hindi} (${cat.english})`
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

          {/* SUB CATEGORY */}
          <div ref={subDropdownRef}>
            <button type="button"
              onClick={()=>setIsSubDropdownOpen(!isSubDropdownOpen)}
              className="w-full p-3 border rounded-xl flex justify-between"
            >
              {formData.subCategory || "Select Sub"}
              <ChevronDown />
            </button>

            {isSubDropdownOpen && selectedMainCat?.subCategories && (
              <div className="border mt-2 rounded-xl bg-white shadow">
                {selectedMainCat.subCategories.map((sub:any,i:number)=>(
                  <div key={i}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={()=>{
                      setFormData({
                        ...formData,
                        subCategory:`${sub.hindi} (${sub.english})`
                      });
                      setIsSubDropdownOpen(false);
                    }}
                  >
                    {sub.hindi}
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
