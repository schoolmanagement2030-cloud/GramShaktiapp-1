import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from 'firebase/auth';
import { PendingAd, ActiveBanner, AdRequest, AdStats } from '../types';
import { X, Check, Trash2, MessageSquare, ImageIcon, Calendar, ExternalLink, Globe, BarChart3, ShieldCheck, Lock, Mail, User, LogOut, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [pendingAds, setPendingAds] = useState<PendingAd[]>([]);
  const [activeAds, setActiveAds] = useState<ActiveBanner[]>([]);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [adStats, setAdStats] = useState<Record<string, AdStats>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'requests' | 'revenue' | 'analytics'>('pending');
  
  // Auth State
  const [isAdminSetup, setIsAdminSetup] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const setupDoc = await getDoc(doc(db, 'admin_config', 'setup'));
        setIsAdminSetup(setupDoc.exists());
        if (!setupDoc.exists()) setAuthMode('register');
      } catch (error) {
        console.error('Error checking admin setup:', error);
      }
    };
    checkSetup();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const setupDoc = await getDoc(doc(db, 'admin_config', 'setup'));
          if (setupDoc.exists() && setupDoc.data().adminUid === user.uid) {
            setIsLoggedIn(true);
          } else if (user.email === 'vikas123metro01@gmail.com') {
            setIsLoggedIn(true);
          } else {
            setIsLoggedIn(false);
          }
        } catch (error) {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    setAuthError(`Database Error: ${error.message}`);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'admin_config', 'setup'), {
          adminCreated: true,
          adminUid: userCredential.user.uid,
          username,
          createdAt: new Date().toISOString()
        });
        setIsAdminSetup(true);
        setAuthMode('login');
        alert('Admin account created! Please login.');
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset link sent to your email!');
        setAuthMode('login');
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalRevenue = () => {
    return activeAds.reduce((sum, ad) => sum + (ad.price || 0), 0);
  };

  const getUniversalAnalytics = () => {
    const stats = {
      totalViews: 0,
      totalClicks: 0,
      totalCalls: 0,
      byState: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    activeAds.forEach(ad => {
      const adStat = adStats[ad.id!];
      if (adStat) {
        stats.totalViews += adStat.views_count || 0;
        stats.totalClicks += adStat.click_count || 0;
        stats.totalCalls += adStat.call_action_count || 0;
        
        if (ad.targetLevel === 'State') {
          stats.byState[ad.targetValue] = (stats.byState[ad.targetValue] || 0) + (adStat.views_count || 0);
        }
        stats.byCategory[ad.adType] = (stats.byCategory[ad.adType] || 0) + (adStat.views_count || 0);
      }
    });

    return stats;
  };

  const fetchData = async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      const [pendingSnap, activeSnap, requestsSnap, statsSnap] = await Promise.all([
        getDocs(collection(db, 'pending_ads')),
        getDocs(collection(db, 'active_banners')),
        getDocs(collection(db, 'ad_requests')),
        getDocs(collection(db, 'ad_stats'))
      ]);
      
      setPendingAds(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as PendingAd)));
      setActiveAds(activeSnap.docs.map(d => ({ id: d.id, ...d.data() } as ActiveBanner)));
      setAdRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AdRequest)));
      
      const statsMap: Record<string, AdStats> = {};
      statsSnap.docs.forEach(d => {
        statsMap[d.id] = d.data() as AdStats;
      });
      setAdStats(statsMap);
    } catch (error: any) {
      handleFirestoreError(error, 'get', 'multiple_collections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isLoggedIn) fetchData();
  }, [isOpen, isLoggedIn]);

  const activateAd = async (ad: PendingAd) => {
    if (!ad.id) return;
    setIsLoading(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + ad.plan);

      const activeAd: ActiveBanner = {
        ...ad,
        status: 'active',
        expiryDate: expiryDate.toISOString(),
      };

      await setDoc(doc(db, 'active_banners', ad.id), activeAd);
      await deleteDoc(doc(db, 'pending_ads', ad.id));
      
      // Initialize stats if not exists
      await setDoc(doc(db, 'ad_stats', ad.id), {
        adId: ad.id,
        views_count: 0,
        click_count: 0,
        call_action_count: 0,
        daily_stats: {},
        lastUpdated: new Date().toISOString()
      });
      
      setPendingAds(prev => prev.filter(a => a.id !== ad.id));
      alert('Ad Activated! / विज्ञापन सक्रिय हो गया!');
      fetchData();
    } catch (error: any) {
      handleFirestoreError(error, 'write', 'active_banners');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Are you sure? / क्या आप वाकई हटाना चाहते हैं?')) return;
    try {
      await deleteDoc(doc(db, 'pending_ads', id));
      setPendingAds(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      handleFirestoreError(error, 'delete', 'pending_ads');
    }
  };

  if (!isOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-emerald-950/95 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="bg-emerald-600 p-8 text-white text-center relative">
            <button onClick={onClose} className="absolute right-6 top-6 hover:bg-white/20 p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase">Admin Shakti</h2>
            <p className="text-emerald-100 text-sm font-medium mt-1">Secure Management Portal</p>
          </div>

          <form onSubmit={handleAuth} className="p-8 space-y-5">
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Admin Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
                <input
                  type="email"
                  required
                  placeholder="admin@gramshakti.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {authError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl">{authError}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
            >
              {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                <>
                  {authMode === 'login' ? 'LOGIN TO DASHBOARD' : authMode === 'register' ? 'CREATE ADMIN ACCOUNT' : 'SEND RESET LINK'}
                </>
              )}
            </button>

            <div className="flex justify-between items-center px-2">
              {authMode === 'login' ? (
                <button type="button" onClick={() => setAuthMode('forgot')} className="text-xs font-bold text-emerald-600 hover:underline">
                  Forgot Password?
                </button>
              ) : (
                <button type="button" onClick={() => setAuthMode('login')} className="text-xs font-bold text-emerald-600 hover:underline">
                  Back to Login
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-emerald-950/90 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-4 border-white/20"
      >
        {/* Admin Header */}
        <div className="bg-emerald-700 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ShieldCheck size={24} />
              </div>
              <h2 className="font-black text-2xl tracking-tighter uppercase">ADMIN SHAKTI</h2>
            </div>
            
            <nav className="flex bg-emerald-800/50 p-1.5 rounded-2xl backdrop-blur-md">
              {[
                { id: 'pending', label: 'Pending', hindi: 'लंबित', count: pendingAds.length },
                { id: 'active', label: 'Active', hindi: 'सक्रिय', count: activeAds.length },
                { id: 'requests', label: 'Requests', hindi: 'अनुरोध', count: adRequests.length },
                { id: 'revenue', label: 'Revenue', hindi: 'राजस्व' },
                { id: 'analytics', label: 'Analytics', hindi: 'विश्लेषण' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex flex-col items-center leading-tight ${
                    activeTab === tab.id ? 'bg-white text-emerald-700 shadow-lg' : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] opacity-60 font-bold">{tab.hindi}</span>
                  {tab.count !== undefined && (
                    <span className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-md shadow-sm ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500 text-white rounded-xl transition-all text-sm font-bold"
            >
              <LogOut size={18} /> Logout
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Admin Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {activeTab === 'pending' && (
                <div className="space-y-6">
                  {pendingAds.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <ImageIcon className="mx-auto text-slate-200 mb-4" size={64} />
                      <p className="text-slate-400 font-bold text-xl">No pending ads to review.</p>
                    </div>
                  ) : (
                    pendingAds.map((ad) => (
                      <motion.div
                        key={ad.id}
                        layout
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-8"
                      >
                        <div className="w-full md:w-56 h-56 bg-slate-50 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-slate-100 group relative">
                          {ad.image ? (
                            <img src={ad.image} alt="Ad" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <ImageIcon className="text-slate-200" size={64} />
                          )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100">
                                    {ad.targetLevel}: {ad.targetValue}
                                  </span>
                                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${
                                    ad.adType === 'Corporate' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                  }`}>
                                    {ad.adType}
                                  </span>
                                  {ad.adType === 'Corporate' && (ad.targetLevel === 'India' || ad.targetLevel === 'State') && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                      <ShieldCheck size={12} /> Verified Brand
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 leading-tight">{ad.text}</h3>
                                {ad.websiteUrl && (
                                  <a 
                                    href={ad.websiteUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1.5"
                                  >
                                    <Globe size={16} /> {ad.websiteUrl}
                                  </a>
                                )}
                              </div>
                              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center min-w-[120px]">
                                <span className="text-3xl font-black text-slate-800 block">₹{ad.price}</span>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ad.plan} Days Plan</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-6 items-end justify-between mt-6 pt-6 border-t border-slate-50">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Screenshot</p>
                              <button 
                                onClick={() => window.open(ad.paymentScreenshot, '_blank')}
                                className="flex items-center gap-2 text-sm text-emerald-600 font-black hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all"
                              >
                                <ExternalLink size={18} />
                                VIEW PROOF
                              </button>
                            </div>
                            
                            <div className="flex gap-3">
                              <button
                                onClick={() => deleteAd(ad.id!)}
                                className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all border border-red-100"
                              >
                                <Trash2 size={24} />
                              </button>
                              <button
                                onClick={() => activateAd(ad)}
                                className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
                              >
                                <Check size={24} />
                                ACTIVATE AD
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'active' && (
                <div className="space-y-4">
                  {activeAds.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-xl">No active campaigns.</p>
                    </div>
                  ) : (
                    activeAds.map((ad) => (
                      <div key={ad.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                          {ad.image && <img src={ad.image} alt="Ad" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md uppercase">
                              {ad.targetLevel}: {ad.targetValue}
                            </span>
                            <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md uppercase">
                              Expires: {new Date(ad.expiryDate).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 truncate">{ad.text}</h3>
                        </div>
                        {ad.id && adStats[ad.id] && (
                          <div className="flex gap-6 px-6 border-l border-slate-100">
                            {[
                              { label: 'Views', val: adStats[ad.id].views_count, color: 'text-blue-600' },
                              { label: 'Clicks', val: adStats[ad.id].click_count, color: 'text-orange-600' },
                              { label: 'Calls', val: adStats[ad.id].call_action_count, color: 'text-emerald-600' }
                            ].map(s => (
                              <div key={s.label} className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{s.label}</p>
                                <p className={`text-xl font-black ${s.color}`}>{s.val || 0}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'revenue' && (
                <div className="space-y-8">
                  <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-emerald-200/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
                    <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs mb-4">Total Ad Revenue / कुल राजस्व</h3>
                    <p className="text-8xl font-black text-emerald-600 tracking-tighter">₹{calculateTotalRevenue()}</p>
                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 font-bold">
                      <BarChart3 size={20} />
                      From {activeAds.length} active campaigns
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                      <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-emerald-600" />
                        Revenue by Plan
                      </h4>
                      <div className="space-y-4">
                        {[7, 15, 30].map(days => {
                          const count = activeAds.filter(a => a.plan === days).length;
                          const revenue = activeAds.filter(a => a.plan === days).reduce((s, a) => s + (a.price || 0), 0);
                          return (
                            <div key={days} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                              <span className="font-bold text-slate-600">{days} Days Plan ({count})</span>
                              <span className="font-black text-xl text-slate-900">₹{revenue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                      <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-emerald-600" />
                        Revenue by Type
                      </h4>
                      <div className="space-y-4">
                        {['Local', 'Corporate'].map(type => {
                          const count = activeAds.filter(a => a.adType === type).length;
                          const revenue = activeAds.filter(a => a.adType === type).reduce((s, a) => s + (a.price || 0), 0);
                          return (
                            <div key={type} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                              <span className="font-bold text-slate-600">{type} Ads ({count})</span>
                              <span className="font-black text-xl text-slate-900">₹{revenue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  {(() => {
                    const stats = getUniversalAnalytics();
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[
                            { label: 'Total Reach', val: stats.totalViews, sub: 'Views', color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Engagement', val: stats.totalClicks, sub: 'Clicks', color: 'text-orange-600', bg: 'bg-orange-50' },
                            { label: 'Conversions', val: stats.totalCalls, sub: 'Calls', color: 'text-emerald-600', bg: 'bg-emerald-50' }
                          ].map(s => (
                            <div key={s.label} className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-center`}>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                              <p className={`text-5xl font-black ${s.color}`}>{s.val}</p>
                              <p className="text-xs font-bold text-slate-400 mt-2">{s.sub}</p>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                            <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-sm">Reach by State</h4>
                            <div className="space-y-6">
                              {Object.entries(stats.byState).length === 0 ? (
                                <p className="text-slate-400 text-center py-10">No state data available.</p>
                              ) : (
                                Object.entries(stats.byState).map(([state, views]) => (
                                  <div key={state} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-black text-slate-700">{state}</span>
                                      <span className="font-bold text-blue-600">{views} Views</span>
                                    </div>
                                    <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(views / stats.totalViews) * 100}%` }}
                                        className="bg-blue-500 h-full rounded-full" 
                                      />
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                            <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-sm">Reach by Category</h4>
                            <div className="space-y-6">
                              {Object.entries(stats.byCategory).map(([cat, views]) => (
                                <div key={cat} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-black text-slate-700">{cat}</span>
                                    <span className="font-bold text-emerald-600">{views} Views</span>
                                  </div>
                                  <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(views / stats.totalViews) * 100}%` }}
                                      className="bg-emerald-500 h-full rounded-full" 
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {adRequests.length === 0 ? (
                    <div className="col-span-full text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-xl">No ad requests yet.</p>
                    </div>
                  ) : (
                    adRequests.map((req) => (
                      <div key={req.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-black text-xl text-slate-900">{req.name}</h3>
                            <p className="text-emerald-600 font-black text-lg">{req.mobile}</p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-slate-600 leading-relaxed italic">"{req.message}"</p>
                        </div>
                        <button className="w-full py-3 bg-emerald-50 text-emerald-700 font-black rounded-xl hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                          <MessageSquare size={18} /> CONTACT USER
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
