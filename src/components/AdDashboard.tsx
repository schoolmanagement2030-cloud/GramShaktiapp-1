import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { TargetLevel, AdPlan, PendingAd, AdType, ActiveBanner, AdStats } from '../types';
import { X, Upload, CreditCard, CheckCircle, Plus, Phone, ArrowRight, Loader2, TrendingUp, PhoneCall, Eye, ChevronLeft, LayoutDashboard, Megaphone, ShieldCheck, User } from 'lucide-react';
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
  
  // Form State
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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) setView('dashboard');
      else setView('login');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && view === 'dashboard') {
      const q = query(collection(db, 'active_banners'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveBanner));
        setMyAds(ads);
        
        ads.forEach(async (ad) => {
          if (!ad.id) return;
          const statsDoc = await getDoc(doc(db, 'ad_stats', ad.id));
          if (statsDoc.exists()) {
            setAdStats(prev => ({ ...prev, [ad.id!]: statsDoc.data() as AdStats }));
          }
        });
      });
      return () => unsubscribe();
    }
  }, [user, view]);

  // ✅ GOOGLE LOGIN (OTP की जगह)
  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Login Error:', error);
      alert('Login Failed / लॉगिन असफल');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'paymentScreenshot') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calculatePrice = () => {
    const plan = plans.find(p => p.days === formData.plan);
    if (!plan) return 0;
    return formData.targetLevel === 'State' || formData.targetLevel === 'India' ? plan.state : plan.local;
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
        {/* Header SAME */}
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
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">

            {/* LOGIN SAME UI, बस FUNCTION बदला */}
            {view === 'login' && (
              <motion.div key="login">
                <button
                  onClick={handleSendCode}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl"
                >
                  {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'LOGIN WITH GOOGLE'}
                </button>
              </motion.div>
            )}

            {/* बाकी dashboard + post पूरा SAME रहेगा */}
            
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
