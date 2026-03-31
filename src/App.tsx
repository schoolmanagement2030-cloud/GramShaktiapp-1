import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithRedirect, GoogleAuthProvider, signOut } from 'firebase/auth';
import { WorkerProfile, SearchFilters } from './types';
import { getDistance } from './lib/utils';

import Map from './components/Map';
import SearchForm from './components/SearchForm';
import WorkerRegistration from './components/WorkerRegistration';
import AdDashboard from './components/AdDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';

import { Tractor } from 'lucide-react';

export default function App() {

const [user, setUser] = useState<User | null>(null);
const [activeTab, setActiveTab] = useState<'search' | 'register' | 'privacy'>('search');

const [workers, setWorkers] = useState<WorkerProfile[]>([]);
const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfile[]>([]);

const [categories, setCategories] = useState<any[]>([]);
const [works, setWorks] = useState<any[]>([]);
const [filteredWorks, setFilteredWorks] = useState<any[]>([]);

const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);

const [filters, setFilters] = useState<SearchFilters>({ category: '', keyword: '' });
const [isLoading, setIsLoading] = useState(false);

const [isAdModalOpen, setIsAdModalOpen] = useState(false);
const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

const [globalClickCount, setGlobalClickCount] = useState(0);

// 🔐 ADMIN CLICK STATE
const [adminClickCount, setAdminClickCount] = useState(0);
const adminTimeoutRef = useRef<NodeJS.Timeout | null>(null);


// ✅ GOOGLE LOGIN
const handleGoogleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Login Error:", error);
  }
};

const handleLogout = async () => {
  await signOut(auth);
};


// 🔥 ADS CLICK TRACK
const handleGlobalClick = () => {
  setGlobalClickCount(prev => {
    const next = prev + 1;
    if ([2,4,6].includes(next)) setIsAdModalOpen(true);
    return next;
  });
};


// 🔥 FETCH DATA
const fetchWorkers = async () => {
  setIsLoading(true);
  const snap = await getDocs(collection(db, 'workers'));
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkerProfile[];
  setWorkers(data);
  setIsLoading(false);
};

const fetchCategories = async () => {
  const snap = await getDocs(collection(db, 'categories'));
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setCategories(data);
};

const fetchWorks = async () => {
  const snap = await getDocs(collection(db, 'works'));
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setWorks(data);
};


// ✅ CATEGORY FILTER
useEffect(() => {
  if (!filters.category) {
    setFilteredWorks([]);
    return;
  }

  const filtered = works.filter(
    (w) => w.categoryId === filters.category
  );

  setFilteredWorks(filtered);

}, [filters.category, works]);


// 🔥 INIT
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => setUser(u));

  fetchWorkers();
  fetchCategories();
  fetchWorks();

  return () => unsub();
}, []);


// 🔍 SEARCH
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
<header className="bg-emerald-700 text-white p-4 flex justify-between">

  {/* 🔐 5 CLICK ADMIN */}
  <h1 
    className="text-xl font-bold flex items-center cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();

      if (adminTimeoutRef.current) {
        clearTimeout(adminTimeoutRef.current);
      }

      setAdminClickCount(prev => {
        const next = prev + 1;

        if (next === 5) {
          setIsAdminPanelOpen(true);
          return 0;
        }

        return next;
      });

      adminTimeoutRef.current = setTimeout(() => {
        setAdminClickCount(0);
      }, 2000);
    }}
  >
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

    {/* ✅ Ads */}
    <button
      onClick={(e) => { e.stopPropagation(); setIsAdModalOpen(true); }}
      className="bg-purple-500 px-4 py-2 rounded"
    >
      Ads
    </button>

    {user ? (
      <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
        Logout
      </button>
    ) : (
      <button onClick={handleGoogleLogin} className="bg-white text-emerald-700 px-4 py-2 rounded">
        Login Google
      </button>
    )}

  </div>
</header>


{/* MAIN */}
<main className="p-6">

{activeTab === 'search' && (
  <>
    <SearchForm 
      filters={filters}
      setFilters={setFilters}
      onSearch={handleSearch}
      isLoading={isLoading}
      categories={categories}
      works={filteredWorks}
    />
    <Map center={mapCenter} workers={filteredWorkers} userLocation={userLocation} />
  </>
)}

{activeTab === 'register' && (
  <WorkerRegistration 
    categories={categories}
    works={filteredWorks}
  />
)}

{activeTab === 'privacy' && (
  <PrivacyPolicy onBack={() => setActiveTab('search')} />
)}

</main>


{/* FOOTER */}
<footer className="bg-emerald-700 text-white p-4 text-center">
  <p>© 2026 Gram Shakti</p>
</footer>


{/* MODALS */}
<AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
<AdDashboard isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} />

</div>
);
}
