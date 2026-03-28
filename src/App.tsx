import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, query, getDocs, onSnapshot, limit, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { WorkerProfile, SearchFilters, ActiveBanner, AdStats } from './types';
import { getDistance } from './lib/utils';
import Map from './components/Map';
import SearchForm from './components/SearchForm';
import WorkerRegistration from './components/WorkerRegistration';
import AIAssistant from './components/AIAssistant';
import AdDashboard from './components/AdDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Search, UserPlus, Info, Zap, Megaphone, ShieldCheck, Tractor, Store, ChevronRight, Menu, X, Phone, MessageSquare, Plus, Shield } from 'lucide-react';
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

  // Ad & Admin State
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [activeAds, setActiveAds] = useState<ActiveBanner[]>([]);
  const [stickyAds, setStickyAds] = useState<ActiveBanner[]>([]);
  const [shaktiClicks, setShaktiClicks] = useState(0);
  
  // क्लिक काउंट के लिए नई स्टेट
  const [globalClickCount, setGlobalClickCount] = useState(0);

  const [detectedLocation, setDetectedLocation] = useState<{ state?: string; district?: string; tehsil?: string }>({ state: 'Rajasthan', district: 'Jaipur', tehsil: 'Sanganer' });
  const shaktiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // क्लिक हैंडलर - 2, 4, 6 क्लिक पर एड्स दिखाएगा
  const handleGlobalClick = () => {
    setGlobalClickCount(prev => {
      const nextCount = prev + 1;
      if (nextCount === 2 || nextCount === 4 || nextCount === 6) {
        setIsAdModalOpen(true);
      }
      return nextCount;
    });
  };

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'workers'));
      const querySnapshot = await getDocs(q);
      const workersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkerProfile[];
      setWorkers(workersData);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    fetchWorkers();

    const adsQuery = query(collection(db, 'active_banners'), limit(10));
    const unsubscribeAds = onSnapshot(adsQuery, (snapshot) => {
      const ads = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActiveBanner));
      const today = new Date().toDateString();
      const viewCounts = JSON.parse(localStorage.getItem('ad_views') || '{}');
      
      const filteredAds = ads.filter(ad => {
        if (new Date(ad.expiryDate) < new Date()) return false;
        const matchesLocation = 
          ad.targetLevel === 'India' ||
          (ad.targetLevel === 'State' && ad.targetValue === detectedLocation.state) ||
          (ad.targetLevel === 'District' && ad.targetValue === detectedLocation.district) ||
          (ad.targetLevel === 'Tehsil' && ad.targetValue === detectedLocation.tehsil);
        return matchesLocation;
      });

      const sticky = filteredAds.filter(ad => 
        ad.adType === 'Corporate' && (ad.targetLevel === 'India' || ad.targetLevel === 'State')
      );
      const scrolling = filteredAds.filter(ad => !sticky.includes(ad));

      setStickyAds(sticky);
      setActiveAds(scrolling);
      
      filteredAds.forEach(async (ad) => {
        if (ad.adType === 'Corporate' && ad.id) {
          const adKey = `${ad.id}_${today}`;
          if ((viewCounts[adKey] || 0) < 5) {
            await trackAdEvent(ad.id, 'views');
            viewCounts[adKey] = (viewCounts[adKey] || 0) + 1;
          }
        }
      });
      localStorage.setItem('ad_views', JSON.stringify(viewCounts));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAds();
    };
  }, [detectedLocation.state, detectedLocation.district, detectedLocation.tehsil]);

  const handleShaktiClick = () => {
    setShaktiClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminPanelOpen(true);
        return 0;
      }
      return next;
    });
    if (shaktiTimeoutRef.current) clearTimeout(shaktiTimeoutRef.current);
    shaktiTimeoutRef.current = setTimeout(() => setShaktiClicks(0), 2000);
  };

  const trackAdEvent = async (adId: string, type: 'views' | 'clicks' | 'calls') => {
    try {
      const statsRef = doc(db, 'ad_stats', adId);
      const statsDoc = await getDoc(statsRef);
      const today = new Date().toISOString().split('T')[0];
      const fieldMap = { views: 'views_count', clicks: 'click_count', calls: 'call_action_count' };
      const dailyFieldMap = { views: 'views', clicks: 'clicks', calls: 'calls' };

      if (!statsDoc.exists()) {
        const initialStats: AdStats = {
          adId,
          views_count: type === 'views' ? 1 : 0,
          click_count: type === 'clicks' ? 1 : 0,
          call_action_count: type === 'calls' ? 1 : 0,
          daily_stats: { [today]: { views: type === 'views' ? 1 : 0, clicks: type === 'clicks' ? 1 : 0, calls: type === 'calls' ? 1 : 0 } },
          lastUpdated: new Date().toISOString(),
        };
        await setDoc(statsRef, initialStats);
      } else {
        await updateDoc(statsRef, {
          [fieldMap[type]]: increment(1),
          [`daily_stats.${today}.${dailyFieldMap[type]}`]: increment(1),
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Firestore Error:', error);
    }
  };

  const handleAdClick = async (ad: ActiveBanner) => {
    if (ad.id) {
      await trackAdEvent(ad.id, 'clicks');
      if (ad.adType === 'Corporate' && ad.websiteUrl) {
        window.open(ad.websiteUrl, '_blank');
      } else if (ad.uid) {
        window.location.href = `tel:${ad.uid}`;
        await trackAdEvent(ad.id, 'calls');
      }
    }
  };

  const handleSearch = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        const filtered = workers.filter(worker => {
          const distance = getDistance(latitude, longitude, worker.location.lat, worker.location.lng);
          const matchesCategory = !filters.category || worker.category === filters.category;
          const matchesKeyword = !filters.keyword || 
            worker.skills.toLowerCase().includes(filters.keyword.toLowerCase()) ||
            worker.name.toLowerCase().includes(filters.keyword.toLowerCase());
          return distance <= 10 && matchesCategory && matchesKeyword;
        });
        setFilteredWorkers(filtered);
        setIsLoading(false);
      },
      () => {
        alert('Please enable GPS to find nearby services.');
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" onClick={handleGlobalClick}>
      {/* Header Updated */}
      <header className="bg-emerald-700 text-white sticky top-0 z-[100] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-2xl shadow-inner">
                <Tractor className="text-emerald-700" size={32} />
              </div>
              <h1 className="text-2xl font-black tracking-tighter flex items-center">
                GRAM <span onClick={(e) => { e.stopPropagation(); handleShaktiClick(); }} className="text-orange-400 ml-1 cursor-default select-none">SHAKTI</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Registration Button - Now Primary and visible on all screens */}
              <button
                onClick={(e) => { e.stopPropagation(); setActiveTab('register'); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-lg transform active:scale-95 ${
                  activeTab === 'register' ? 'bg-orange-500 text-white shadow-orange-900/20' : 'bg-emerald-800/50 text-white hover:bg-emerald-600'
                }`}
              >
                <UserPlus size={18} />
                Register / पंजीकरण
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); setActiveTab('search'); }}
                className={`hidden md:flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'search' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-emerald-700/50'
                }`}
              >
                <Search size={18} />
                Find / खोजें
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence>
          {stickyAds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="bg-blue-600 rounded-[2rem] p-1 shadow-xl overflow-hidden">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 flex items-center justify-between text-white text-[10px] font-black uppercase tracking-widest">
                  <span className="flex items-center gap-2"><ShieldCheck size={14} /> Featured Brands / प्रमुख ब्रांड</span>
                  <span>Verified ✅</span>
                </div>
                <div className="flex overflow-x-auto gap-4 p-4 no-scrollbar">
                  {stickyAds.map(ad => (
                    <div key={ad.id} onClick={(e) => { e.stopPropagation(); handleAdClick(ad); }} className="flex-shrink-0 w-80 bg-white rounded-2xl p-4 flex gap-4 cursor-pointer hover:shadow-lg border border-blue-100 transition-all">
                      <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0">
                        {ad.image && <img src={ad.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 text-sm truncate">{ad.text}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ad.adType} Campaign</p>
                        <button className="mt-2 text-[10px] font-black text-blue-600 flex items-center gap-1">VIEW DETAILS <ChevronRight size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'search' ? (
            <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div onClick={(e) => e.stopPropagation()}>
                  <SearchForm filters={filters} setFilters={setFilters} onSearch={handleSearch} isLoading={isLoading} />
                </div>
                <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden h-[500px] relative">
                  <Map center={mapCenter} workers={filteredWorkers} userLocation={userLocation} />
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3"><Store className="text-orange-500" /> Local Offers</h3>
                  <div className="space-y-4">
                    {activeAds.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Info className="mx-auto text-slate-300 mb-2" /><p className="text-slate-400 text-sm font-bold">No local ads in your area.</p>
                      </div>
                    ) : (
                      activeAds.map(ad => (
                        <div key={ad.id} onClick={(e) => { e.stopPropagation(); handleAdClick(ad); }} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 cursor-pointer hover:bg-white transition-all">
                          <div className="flex gap-4">
                            <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border border-slate-100">
                              {ad.image && <img src={ad.image} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0"><h4 className="font-bold text-slate-900 text-sm">{ad.text}</h4></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <h3 className="text-xl font-black mb-4">Grow Your Business!</h3>
                  <p className="text-emerald-100 text-sm mb-6">Reach thousands of local customers in your village.</p>
                  <button onClick={(e) => { e.stopPropagation(); setIsAdModalOpen(true); }} className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl hover:bg-orange-400 hover:text-white transition-all">GET STARTED NOW</button>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'register' ? (
            <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto">
              <div onClick={(e) => e.stopPropagation()}><WorkerRegistration /></div>
            </motion.div>
          ) : (
            <motion.div key="privacy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto">
              <PrivacyPolicy onBack={() => setActiveTab('search')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-slate-900 text-slate-500 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6"><Tractor size={24} className="text-emerald-500" /><span className="text-white font-black text-xl tracking-tighter">GRAM SHAKTI</span></div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-[10px]">© 2026 Gram Shakti. All rights reserved.</div>
        </div>
      </footer>

      {/* Modals with propagation stop to prevent click count increase */}
      <div onClick={(e) => e.stopPropagation()}>
        <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
        <AdDashboard isOpen={isAdModalOpen} onClose={() => { setIsAdModalOpen(false); setGlobalClickCount(0); }} />
      </div>
    </div>
  );
}
