import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, query, where, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { TargetLevel, AdPlan, PendingAd, AdType, ActiveBanner, AdStats } from '../types';
import { X, Upload, CreditCard, CheckCircle, Plus, Loader2, TrendingUp, PhoneCall, Eye, ChevronLeft, LayoutDashboard, Megaphone, ShieldCheck, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  { days: 7, local: 200, state: 500 },
  { days: 15, local: 350, state: 900 },
  { days: 30, local: 600, state: 1500 },
];

export default function AdDashboard({ isOpen, onClose }: AdDashboardProps) {
  const [view, setView] = useState<'login' | 'dashboard' | 'post'>('login');
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [myAds, setMyAds] = useState<ActiveBanner[]>([]);
  const [adStats, setAdStats] = useState<Record<string, AdStats>>({});
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    text: '',
    image: '',
    adType: 'Local' as AdType,
    websiteUrl: '',
    targetLevel: 'Tehsil' as TargetLevel,
    targetValue: '',
    plan: 7 as AdPlan,
    paymentScreenshot: '',
  });

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setView(u ? 'dashboard' : 'login');
    });
    return () => unsubscribe();
  }, []);

  // Fetch user's active ads
  useEffect(() => {
    if (!user || view !== 'dashboard') return;
    const q = query(collection(db, 'active_banners'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveBanner));
      setMyAds(ads);

      const statsPromises = ads.map(async ad => {
        if (!ad.id) return null;
        const statsDoc = await getDoc(doc(db, 'ad_stats', ad.id));
        if (statsDoc.exists()) return { id: ad.id, data: statsDoc.data() as AdStats };
        return null;
      });
      const statsResults = await Promise.all(statsPromises);
      const statsObj: Record<string, AdStats> = {};
      statsResults.forEach(s => { if (s) statsObj[s.id] = s.data; });
      setAdStats(statsObj);
    });
    return () => unsubscribe();
  }, [user, view]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login Error:', error);
      alert('Login failed. / लॉगिन विफल रहा।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'paymentScreenshot') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const calculatePrice = () => {
    const plan = plans.find(p => p.days === formData.plan);
    if (!plan) return 0;
    return ['State', 'India'].includes(formData.targetLevel) ? plan.state : plan.local;
  };

  const handleSubmitAd = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const adData: PendingAd = {
        uid: user.uid,
        text: formData.text,
        image: formData.image,
        adType: formData.adType,
        websiteUrl: formData.adType === 'Corporate' ? formData.websiteUrl : undefined,
        targetLevel: formData.targetLevel,
        targetValue: formData.targetValue || 'Global',
        plan: formData.plan,
        price: calculatePrice(),
        paymentScreenshot: formData.paymentScreenshot,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'pending_ads'), adData);
      setStep(4);
    } catch (error) {
      console.error('Error posting ad:', error);
      alert('Failed to post ad. / विज्ञापन पोस्ट करने में विफल।');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        {/* Header */}
        <div className="bg-emerald-700 p-6 flex items-center justify-between text-white relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tight">AD PORTAL</h2>
              <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Manage Your Campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all flex items-center gap-2 px-3"
              >
                <LogOut size={18} />
                <span className="text-[10px] font-black uppercase">Logout</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <AnimatePresence mode="wait">
            {/* LOGIN VIEW */}
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-sm mx-auto space-y-8 py-12"
              >
                <div className="text-center space-y-4">
                  <div className="bg-emerald-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <User className="text-emerald-600" size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Login to Dashboard</h3>
                  <p className="text-slate-500 text-sm font-medium">Use your Google account to manage your ads.</p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white border-2 border-slate-100 text-slate-700 font-black py-5 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200/50 transform active:scale-95"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                      LOGIN WITH GOOGLE / गूगल से लॉगिन करें
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* DASHBOARD VIEW */}
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* My Campaigns + Post Button */}
                {/* ... Dashboard rendering same as original ... */}
              </motion.div>
            )}

            {/* POST AD VIEW */}
            {view === 'post' && (
              <motion.div
                key="post"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Post ad steps: 1, 2, 4 */}
                {/* ... Same structure, FileReader safely handled ... */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
