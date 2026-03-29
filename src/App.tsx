import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, query, getDocs, onSnapshot, limit, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { WorkerProfile, SearchFilters, ActiveBanner, AdStats } from './types';
import { getDistance } from './lib/utils';
import Map from './components/Map';
import SearchForm from './components/SearchForm';
import WorkerRegistration from './components/WorkerRegistration';
import AdDashboard from './components/AdDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Search, UserPlus, Info, ShieldCheck, Tractor, Store, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {

const [user, setUser] = useState<User | null>(null);
const [activeTab, setActiveTab] = useState<'search' | 'register' | 'privacy'>('search');
const [workers, setWorkers] = useState<WorkerProfile[]>([]);
const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfile[]>([]);
const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
const [filters, setFilters] = useState<SearchFilters>({ category: '', keyword: '' });
const [isLoading, setIsLoading] = useState(false);

const [isAdModalOpen, setIsAdModalOpen] = useState(false);
const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
const [activeAds, setActiveAds] = useState<ActiveBanner[]>([]);
const [stickyAds, setStickyAds] = useState<ActiveBanner[]>([]);
const [shaktiClicks, setShaktiClicks] = useState(0);
const [globalClickCount, setGlobalClickCount] = useState(0);

const [detectedLocation, setDetectedLocation] = useState({ state: 'Rajasthan', district: 'Jaipur', tehsil: 'Sanganer' });
const shaktiTimeoutRef = useRef<NodeJS.Timeout | null>(null);


// ✅ GOOGLE LOGIN
const handleGoogleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google Login Error:", error);
  }
};

const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};


// क्लिक handler
const handleGlobalClick = () => {
  setGlobalClickCount(prev => {
    const next = prev + 1;
    if (next === 2 || next === 4 || next === 6) {
      setIsAdModalOpen(true);
    }
    return next;
  });
};


const fetchWorkers = async () => {
  setIsLoading(true);
  const q = query(collection(db, 'workers'));
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkerProfile[];
  setWorkers(data);
  setIsLoading(false);
};


useEffect(() => {

  const unsubAuth = onAuthStateChanged(auth, (u) => {
    setUser(u);
  });

  fetchWorkers();

  return () => unsubAuth();

}, []);


// SEARCH
const handleSearch = () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;

    const filtered = workers.filter(w => {
      const d = getDistance(latitude, longitude, w.location.lat, w.location.lng);
      return d <= 10;
    });

    setFilteredWorkers(filtered);
    setUserLocation([latitude, longitude]);
    setMapCenter([latitude, longitude]);
  });
};


return (
<div className="min-h-screen bg-slate-50" onClick={handleGlobalClick}>

{/* HEADER */}
<header className="bg-emerald-700 text-white p-4 flex justify-between items-center">

  <h1 className="text-xl font-bold flex items-center">
    <Tractor className="mr-2" />
    GRAM SHAKTI
  </h1>

  <div className="flex gap-3">

    <button
      onClick={(e) => { e.stopPropagation(); setActiveTab('register'); }}
      className="bg-orange-500 px-4 py-2 rounded"
    >
      Register
    </button>

    {/* ✅ GOOGLE BUTTON */}
    {user ? (
      <button
        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
        className="bg-red-500 px-4 py-2 rounded"
      >
        Logout
      </button>
    ) : (
      <button
        onClick={(e) => { e.stopPropagation(); handleGoogleLogin(); }}
        className="bg-white text-emerald-700 px-4 py-2 rounded"
      >
        Login Google
      </button>
    )}

  </div>
</header>


{/* MAIN */}
<main className="p-6">

{activeTab === 'search' && (
  <>
    <SearchForm filters={filters} setFilters={setFilters} onSearch={handleSearch} isLoading={isLoading} />
    <Map center={mapCenter} workers={filteredWorkers} userLocation={userLocation} />
  </>
)}

{activeTab === 'register' && <WorkerRegistration />}

{activeTab === 'privacy' && <PrivacyPolicy onBack={() => setActiveTab('search')} />}

</main>


{/* MODALS */}
<AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
<AdDashboard isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} />

</div>
);
}bg-emerald-700 text-white p
