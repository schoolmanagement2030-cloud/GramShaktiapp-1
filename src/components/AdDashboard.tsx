import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase'; // Recaptcha aur signInWithPhoneNumber यहाँ से हटा दिया
import { collection, query, where, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
// Google Auth के लिए नए imports
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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
  
  // Form State - (आपका ओरिजिनल फॉर्म डेटा)
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
        
        // Fetch stats for each ad
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

  // --- GOOGLE LOGIN SYSTEM (OTP की जगह) ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
        setView('dashboard');
      }
    } catch (error) {
      console.error('Google Login Error:', error);
      alert('Login failed. / लॉगिन विफल रहा।');
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
        {/* Header - आपका ओरिजिनल Header */}
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
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-sm mx-auto space-y-8 py-12 text-center"
              >
                <div className="space-y-4">
                  <div className="bg-emerald-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <User className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Login with Gmail</h3>
                  <p className="text-slate-500 text-sm font-medium">Use your Google account to manage your ads.</p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 py-5 rounded-2xl hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/50 transform active:scale-95 group"
                >
                  {isLoading ? <Loader2 className="animate-spin text-emerald-600" /> : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />
                      <span className="font-black text-slate-700 text-lg">Continue with Google</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fast & Secure Login</p>
              </motion.div>
            )}

            {view === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">My Campaigns</h3>
                    <p className="text-slate-500 text-sm font-medium">Track your ad performance in real-time</p>
                  </div>
                  <button onClick={() => { setView('post'); setStep(1); }} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 transform active:scale-95">
                    <Plus size={20} /> POST NEW AD
                  </button>
                </div>

                <div className="grid gap-6">
                  {myAds.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <Megaphone className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-400 font-black text-lg">No active ads found.</p>
                      <p className="text-slate-400 text-sm mt-1">Start your first campaign today!</p>
                    </div>
                  ) : (
                    myAds.map((ad) => (
                      <div key={ad.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex flex-col sm:flex-row gap-6">
                          <div className="w-full sm:w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                            {ad.image && <img src={ad.image} alt="Ad" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${ad.adType === 'Corporate' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {ad.adType}
                                </span>
                                {ad.adType === 'Corporate' && <ShieldCheck size={14} className="text-blue-500" />}
                              </div>
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(ad.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 mb-4 line-clamp-1">{ad.text}</h4>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 text-blue-500 mb-1">
                                  <Eye size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Views</span>
                                </div>
                                <p className="text-lg font-black text-slate-900">{adStats[ad.id!]?.views_count || 0}</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                                  <PhoneCall size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Calls</span>
                                </div>
                                <p className="text-lg font-black text-slate-900">{adStats[ad.id!]?.call_action_count || 0}</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 text-orange-500 mb-1">
                                  <TrendingUp size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Clicks</span>
                                </div>
                                <p className="text-lg font-black text-slate-900">{adStats[ad.id!]?.click_count || 0}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {view === 'post' && (
              <motion.div key="post" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Create Campaign</h3>
                    <p className="text-slate-500 text-sm font-medium">Fill in the details to reach your audience</p>
                  </div>
                </div>

                {step === 1 && (
                  <div className="space-y-6">
                    {/* ... (यहाँ आपका पूरा ओरिजिनल फॉर्म कोड है जो पहले था) ... */}
                    <div className="space-y-3">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Ad Type</label>
                      <div className="grid grid-cols-2 gap-4">
                        {(['Local', 'Corporate'] as AdType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setFormData({ ...formData, adType: type })}
                            className={`p-5 rounded-2xl border-2 text-sm font-black transition-all flex flex-col items-center gap-2 ${
                              formData.adType === type
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl'
                                : 'bg-white text-slate-600 border-slate-100 hover:border-emerald-200'
                            }`}
                          >
                            {type === 'Local' ? <User size={24} /> : <ShieldCheck size={24} />}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Ad Text</label>
                      <textarea
                        value={formData.text}
                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                        placeholder="What are you offering?"
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold h-32 resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Ad Image</label>
                      <div className="relative border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center bg-slate-50/50 group">
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {formData.image ? (
                          <img src={formData.image} alt="Preview" className="max-h-40 mx-auto rounded-2xl shadow-lg" />
                        ) : (
                          <div className="text-slate-400">
                            <Upload className="mx-auto mb-2" />
                            <p className="text-sm font-black">Click to upload ad creative</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Area और Plans (जैसा ओरिजिनल कोड में था) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Target Area</label>
                        <select 
                          value={formData.targetLevel} 
                          onChange={(e) => setFormData({ ...formData, targetLevel: e.target.value as TargetLevel })} 
                          className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold"
                        >
                          <option value="India">All India</option>
                          <option value="State">State Level</option>
                          <option value="District">District Level</option>
                          <option value="Tehsil">Tehsil Level</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Area Name</label>
                        <input 
                          type="text" 
                          value={formData.targetValue} 
                          onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })} 
                          placeholder="e.g. Rajasthan" 
                          className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" 
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-900 p-8 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Total Investment</p>
                        <span className="text-4xl font-black">₹{calculatePrice()}</span>
                      </div>
                      <button onClick={() => setStep(2)} className="bg-orange-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg transform active:scale-95">NEXT: PAYMENT</button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 text-center py-8">
                    <h3 className="text-2xl font-black text-slate-900">Scan to Pay</h3>
                    <div className="bg-white p-6 border-4 border-slate-50 rounded-[2.5rem] inline-block shadow-2xl">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=vikas123metro01@okaxis&pn=Gram%20Shakti&am=${calculatePrice()}`} alt="QR" className="w-56 h-56" />
                    </div>

                    <div className="relative border-2 border-dashed border-slate-200 rounded-[2rem] p-8 bg-slate-50/50">
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'paymentScreenshot')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {formData.paymentScreenshot ? (
                        <img src={formData.paymentScreenshot} alt="Screenshot" className="max-h-40 mx-auto rounded-2xl shadow-lg" />
                      ) : (
                        <div className="text-slate-400">
                          <CreditCard className="mx-auto mb-2" />
                          <p className="text-sm font-black">Click to upload payment proof</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 max-w-md mx-auto pt-4">
                      <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-black py-5 rounded-2xl">BACK</button>
                      <button onClick={handleSubmitAd} disabled={isLoading || !formData.paymentScreenshot} className="flex-[2] bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl transform active:scale-95">
                        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'SUBMIT CAMPAIGN'}
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="text-center py-20 space-y-6">
                    <CheckCircle className="text-emerald-600 mx-auto" size={64} />
                    <h2 className="text-3xl font-black text-slate-900">Campaign Submitted!</h2>
                    <button onClick={() => setView('dashboard')} className="bg-emerald-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl">GO TO DASHBOARD</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
