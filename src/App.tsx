import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  query, 
  getDocs, 
  onSnapshot, 
  limit, 
  doc, 
  updateDoc, 
  increment, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { WorkerProfile, SearchFilters, ActiveBanner } from './types';
import { getDistance } from './lib/utils';
import Map from './components/Map';
import SearchForm from './components/SearchForm';
import WorkerRegistration from './components/WorkerRegistration';
import AdDashboard from './components/AdDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Tractor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- States ---
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
  const [globalClickCount, setGlobalClickCount] = useState(0);

  // --- Google Login / Logout ---
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

  // --- Ad Logic (Global Click) ---
  const handleGlobalClick = () => {
    setGlobalClickCount(prev => {
      const next = prev + 1;
      // हर 2, 4, 6 क्लिक पर एड दिखाएगा
      if (next === 2 || next === 4 || next === 6) {
        setIsAdModalOpen(true);
      }
      return next;
    });
  };

  // --- Data Fetching ---
  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'workers'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkerProfile[];
      setWorkers(data);
    } catch (error) {
      console.error("Error fetching workers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    fetchWorkers();
    return () => unsubAuth();
  }, []);

  // --- Search Handler ---
  const handleSearch = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      const filtered = workers.filter(w => {
        const d = getDistance(latitude, longitude, w.location.lat, w.location.lng);
        return d <= 10; // 10km radius
      });

      setFilteredWorkers(filtered);
      setUserLocation([latitude, longitude]);
      setMapCenter([latitude, longitude]);
    }, (error) => {
      console.error("Location error:", error);
      alert("कृपया लोकेशन परमिशन दें।");
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" onClick={handleGlobalClick}>
      
      {/* HEADER */}
      <header className="bg-emerald-700 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <h1 
          className="text-xl font-bold flex items-center cursor-pointer" 
          onClick={() => setActiveTab('search')}
        >
          <Tractor className="mr-2" />
          GRAM SHAKTI
        </h1>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setActiveTab('register'); }}
            className="bg-orange-500 hover:bg-orange-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-sm font-medium transition-colors"
          >
            Register
          </button>

          {user ? (
            <button
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="bg-red-500 hover:bg-red-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-sm font-medium transition-colors"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleGoogleLogin(); }}
              className="bg-white text-emerald-700 hover:bg-gray-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-sm font-medium transition-colors"
            >
              Login Google
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SearchForm 
                filters={filters} 
                setFilters={setFilters} 
                onSearch={handleSearch} 
                isLoading={isLoading} 
              />
              <div className="mt-6 rounded-xl overflow-hidden shadow-lg border-2 border-emerald-100 h-[450px]">
                <Map center={mapCenter} workers={filteredWorkers} userLocation={userLocation} />
              </div>
            </motion.div>
          )}

          {activeTab === 'register' && (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <WorkerRegistration />
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PrivacyPolicy onBack={() => setActiveTab('search')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="bg-emerald-800 text-emerald-50 p-4 text-center text-sm">
        <p>© 2026 Gram Shakti - Empowering Rural Workforce</p>
        <button 
          onClick={() => setActiveTab('privacy')}
          className="mt-1 underline opacity-80 hover:opacity-100"
        >
          Privacy Policy
        </button>
      </footer>

      {/* MODALS */}
      {isAdminPanelOpen && (
        <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
      )}
      
      {isAdModalOpen && (
        <AdDashboard isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} />
      )}

    </div>
  );
}
