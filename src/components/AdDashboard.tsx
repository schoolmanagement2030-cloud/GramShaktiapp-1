import React, { useState, useEffect } from 'react';
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

  // 🔁 Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) setView('dashboard');
      else setView('login');
    });
    return () => unsubscribe();
  }, []);

  // 📊 Fetch Ads
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

  // ✅ GOOGLE LOGIN
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

  // 📁 File Upload
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

  // 💰 Price
  const calculatePrice = () => {
    const plan = plans.find(p => p.days === formData.plan);
    if (!plan) return 0;
    return formData.targetLevel === 'State' || formData.targetLevel === 'India'
      ? plan.state
      : plan.local;
  };

  // 🚀 Submit
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
      alert('Ad post failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="bg-emerald-700 p-6 flex justify-between text-white">
          <h2 className="font-black text-xl">AD PORTAL</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">

            {/* LOGIN */}
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

            {/* DASHBOARD + POST SAME (तुम्हारा बाकी code unchanged रहेगा) */}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
