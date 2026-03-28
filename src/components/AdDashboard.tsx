import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { collection, query, where, addDoc, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
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
  // Authentication States
  const [user, setUser] = useState(auth.currentUser);
  const [view, setView] = useState<'login' | 'dashboard' | 'post'>(auth.currentUser ? 'dashboard' : 'login');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Data States
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

  // 1. Monitor Auth State Changes (Fixes the Login Jump Issue)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      if (currentUser) {
        setView('dashboard');
      } else {
        setView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Active Ads & Stats
  useEffect(() => {
    if (!user || view !== 'dashboard') return;

    // Listen to active banners for the specific user
    const q = query(collection(db, 'active_banners'), where('uid', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveBanner));
      setMyAds(ads);

      // Fetch Stats for each active ad
      for (const ad of ads) {
        if (ad.id) {
          const statsDoc = await getDoc(doc(db, 'ad_stats', ad.id));
          if (statsDoc.exists()) {
            setAdStats(prev => ({ ...prev, [ad.id!]: statsDoc.data() as AdStats }));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, view]);

  // Handler Functions
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle setView('dashboard')
    } catch (error) {
      console.error('Login Error:', error);
      alert('Login failed. Please try again. / लॉगिन विफल रहा।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'paymentScreenshot') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large! (Max 5MB)");
        return;
      }
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
    return (formData.targetLevel === 'State' || formData.targetLevel === 'India') ? plan.state : plan.local;
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
      setStep(4); // Success Step
    } catch (error) {
      console.error('Error posting ad:', error);
      alert('Failed to post ad. / विज्ञापन पोस्ट करने में विफल।');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        {/* Header Section */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">AD PORTAL</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Manage Your Campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group flex items-center gap-2">
                <span className="text-xs font-black hidden sm:inline">LOGOUT</span>
                <LogOut size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-100 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {isAuthChecking ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="text-slate-500 font-bold">Checking access... / पहुंच की जांच...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* --- LOGIN VIEW --- */}
              {view === 'login' && (
                <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-sm mx-auto space-y-8 py-12">
                  <div className="text-center space-y-4">
                    <div className="bg-emerald-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <User className="text-emerald-600" size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">Login to Dashboard</h3>
                    <p className="text-slate-500 text-sm font-medium">Use Google to manage your ads.</p>
                  </div>
                  <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white border-2 border-slate-100 text-slate-700 font-black py-5 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200/50">
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                      <><img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" /> LOGIN WITH GOOGLE</>
                    )}
                  </button>
                </motion.div>
              )}

              {/* --- DASHBOARD VIEW --- */}
              {view === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">My Campaigns</h3>
                      <p className="text-slate-500 text-sm font-medium">Real-time performance</p>
                    </div>
                    <button onClick={() => { setView('post'); setStep(1); }} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-200">
                      <Plus size={20} /> POST NEW AD
                    </button>
                  </div>

                  <div className="grid gap-6">
                    {myAds.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <Megaphone className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-400 font-black text-lg">No active ads found.</p>
                      </div>
                    ) : (
                      myAds.map((ad) => (
                        <div key={ad.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all">
                          <div className="flex flex-col sm:flex-row gap-6">
                            <img src={ad.image} alt="Ad" className="w-24 h-24 rounded-2xl object-cover border border-slate-100" />
                            <div className="flex-1">
                              <div className="flex justify-between mb-2">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${ad.adType === 'Corporate' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {ad.adType}
                                </span>
                              </div>
                              <h4 className="text-lg font-black text-slate-800 mb-4">{ad.text}</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <StatBox icon={<Eye size={14}/>} color="blue" label="Views" value={adStats[ad.id!]?.views_count || 0} />
                                <StatBox icon={<PhoneCall size={14}/>} color="emerald" label="Calls" value={adStats[ad.id!]?.call_action_count || 0} />
                                <StatBox icon={<TrendingUp size={14}/>} color="orange" label="Clicks" value={adStats[ad.id!]?.click_count || 0} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* --- POST AD VIEW --- */}
              {view === 'post' && (
                <motion.div key="post" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setView('dashboard')} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                      <ChevronLeft size={24} />
                    </button>
                    <h3 className="text-2xl font-black text-slate-900">Create Campaign</h3>
                  </div>

                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <TypeButton active={formData.adType === 'Local'} onClick={() => setFormData({...formData, adType: 'Local'})} icon={<User size={24}/>} label="Local" />
                        <TypeButton active={formData.adType === 'Corporate'} onClick={() => setFormData({...formData, adType: 'Corporate'})} icon={<ShieldCheck size={24}/>} label="Corporate" />
                      </div>

                      {formData.adType === 'Corporate' && (
                        <input type="url" placeholder="Website URL" value={formData.websiteUrl} onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" />
                      )}

                      <textarea placeholder="Ad Text (e.g. Best Repair Shop)" value={formData.text} onChange={(e) => setFormData({...formData, text: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl h-32 outline-none font-bold" />

                      <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center bg-slate-50/50 relative">
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {formData.image ? <img src={formData.image} className="max-h-40 mx-auto rounded-xl" /> : <div className="text-slate-400 font-black"><Upload className="mx-auto mb-2"/> Upload Ad Creative</div>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <select value={formData.targetLevel} onChange={(e) => setFormData({...formData, targetLevel: e.target.value as TargetLevel})} className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none">
                          <option value="India">All India</option><option value="State">State</option><option value="District">District</option><option value="Tehsil">Tehsil</option>
                        </select>
                        <input type="text" placeholder="Area Name" value={formData.targetValue} onChange={(e) => setFormData({...formData, targetValue: e.target.value})} className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {[7, 15, 30].map(d => (
                          <button key={d} onClick={() => setFormData({...formData, plan: d as AdPlan})} className={`p-5 rounded-2xl border-2 font-black transition-all ${formData.plan === d ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-100'}`}>{d} Days</button>
                        ))}
                      </div>

                      <div className="bg-emerald-900 p-8 rounded-[2rem] text-white flex justify-between items-center">
                        <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Total Investment</p><span className="text-4xl font-black">₹{calculatePrice()}</span></div>
                        <button onClick={() => setStep(2)} className="bg-orange-500 px-8 py-4 rounded-2xl font-black shadow-lg">NEXT: PAYMENT</button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8 text-center py-8">
                      <h3 className="text-2xl font-black">Scan to Pay ₹{calculatePrice()}</h3>
                      <div className="bg-white p-6 border-4 border-slate-50 rounded-[2.5rem] inline-block shadow-2xl">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=vikas123metro01@okaxis&pn=GramShakti&am=${calculatePrice()}`} alt="QR" className="w-56 h-56" />
                      </div>
                      <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 bg-slate-50/50 relative">
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'paymentScreenshot')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {formData.paymentScreenshot ? <img src={formData.paymentScreenshot} className="max-h-40 mx-auto rounded-xl" /> : <div className="text-slate-400 font-black"><CreditCard className="mx-auto mb-2"/> Upload Screenshot</div>}
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 py-5 rounded-2xl font-black">BACK</button>
                        <button onClick={handleSubmitAd} disabled={isLoading || !formData.paymentScreenshot} className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl">
                          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'SUBMIT CAMPAIGN'}
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="text-center py-20 space-y-6">
                      <CheckCircle className="text-emerald-600 mx-auto" size={80} />
                      <h2 className="text-3xl font-black">Submitted Successfully!</h2>
                      <p className="text-slate-500">Review takes up to 24 hours.</p>
                      <button onClick={() => setView('dashboard')} className="bg-emerald-600 text-white py-5 px-12 rounded-2xl font-black">GO TO DASHBOARD</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Small Sub-components for cleaner code
function StatBox({ icon, color, label, value }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
      <div className={`flex items-center gap-2 text-${color}-500 mb-1`}>
        {icon} <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function TypeButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`p-5 rounded-2xl border-2 text-sm font-black transition-all flex flex-col items-center gap-2 ${active ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border-slate-100'}`}>
      {icon} {label}
    </button>
  );
}
