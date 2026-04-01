import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import {
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';

import { motion } from 'framer-motion';

// ✅ NEW: ADS SYSTEM IMPORT
import { showAd } from '../constants';

// ✅ TYPES
type AdType = 'Local' | 'Corporate';
type TargetLevel = 'India' | 'State' | 'District' | 'Tehsil';
type AdPlan = 7 | 15 | 30;

interface ActiveBanner {
  id?: string;
  uid: string;
  text: string;
  image?: string;
  adType: AdType;
  createdAt: string;
}

interface AdStats {
  views_count: number;
  click_count: number;
  call_action_count: number;
}

interface PendingAd {
  uid: string;
  text: string;
  image?: string;
  adType: AdType;
  websiteUrl?: string;
  targetLevel: TargetLevel;
  targetValue: string;
  plan: AdPlan;
  price: number;
  paymentScreenshot: string;
  status: 'pending';
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ✅ PLANS
const plans = [
  { days: 7, local: 200, state: 500 },
  { days: 15, local: 350, state: 900 },
  { days: 30, local: 600, state: 1500 },
];

export default function AdDashboard({ isOpen, onClose }: Props) {
  const [view, setView] = useState<'login' | 'dashboard' | 'post'>('login');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [myAds, setMyAds] = useState<ActiveBanner[]>([]);
  const [adStats, setAdStats] = useState<Record<string, AdStats>>({});
  const [step, setStep] = useState(1);

  // ✅ NEW: AD CLICK STATE
  const [adClickCount, setAdClickCount] = useState(0);

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

  // ✅ AUTH
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setView(u ? 'dashboard' : 'login');
    });
    return () => unsub();
  }, []);

  // ✅ FETCH ADS
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'active_banners'),
      where('uid', '==', user.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const ads = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ActiveBanner[];

      setMyAds(ads);

      const statsObj: Record<string, AdStats> = {};

      await Promise.all(
        ads.map(async (ad) => {
          if (!ad.id) return;
          const s = await getDoc(doc(db, 'ad_stats', ad.id));
          if (s.exists()) statsObj[ad.id] = s.data() as AdStats;
        })
      );

      setAdStats(statsObj);
    });

    return () => unsub();
  }, [user]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.user) {
        setUser(res.user);
        setView('dashboard');
      }
    } catch {
      alert('Login failed');
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setView('login');
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'image' | 'paymentScreenshot'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((p) => ({ ...p, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const calculatePrice = () => {
    const p = plans.find((x) => x.days === formData.plan);
    if (!p) return 0;
    return formData.targetLevel === 'State' || formData.targetLevel === 'India'
      ? p.state
      : p.local;
  };

  const handleSubmitAd = async () => {
    if (!user) return;

    setIsLoading(true);

    const adData: PendingAd = {
      uid: user.uid,
      text: formData.text,
      image: formData.image,
      adType: formData.adType,
      websiteUrl:
        formData.adType === 'Corporate'
          ? formData.websiteUrl
          : undefined,
      targetLevel: formData.targetLevel,
      targetValue: formData.targetValue || 'Global',
      plan: formData.plan,
      price: calculatePrice(),
      paymentScreenshot: formData.paymentScreenshot,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'pending_ads'), adData);

    setIsLoading(false);
    setStep(4);
  };

  // ✅ NEW: AD BUTTON CLICK
  const handleAdClick = () => {
    setAdClickCount((prev) => {
      const newCount = prev + 1;

      if (newCount % 2 === 1) {
        alert("📢 Local Ad दिख रहा है");
      } else {
        alert("🌍 Google Ad दिख रहा है");
      }

      // external function भी call (future use)
      showAd();

      return newCount;
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{ padding: 20 }}>
      <h2>Ad Dashboard</h2>

      {/* LOGIN */}
      {view === 'login' && (
        <button onClick={handleGoogleLogin}>
          {isLoading ? 'Loading...' : 'Login with Google'}
        </button>
      )}

      {/* DASHBOARD */}
      {view === 'dashboard' && (
        <>
          <button onClick={() => setView('post')}>
            ➕ New Ad
          </button>

          <button onClick={handleLogout}>
            Logout
          </button>

          {/* ✅ NEW: ADS BUTTON */}
          <button onClick={handleAdClick}>
            🎯 Show Ad
          </button>

          {myAds.map((ad) => (
            <div key={ad.id}>
              <p>{ad.text}</p>
              <p>Views: {adStats[ad.id!]?.views_count || 0}</p>
            </div>
          ))}
        </>
      )}

      {/* POST */}
      {view === 'post' && (
        <>
          {step === 1 && (
            <>
              <input
                placeholder="Ad Text"
                value={formData.text}
                onChange={(e) =>
                  setFormData({ ...formData, text: e.target.value })
                }
              />

              <input
                type="file"
                onChange={(e) => handleFileChange(e, 'image')}
              />

              <button onClick={() => setStep(2)}>
                Next ₹{calculatePrice()}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <input
                type="file"
                onChange={(e) =>
                  handleFileChange(e, 'paymentScreenshot')
                }
              />

              <button
                onClick={handleSubmitAd}
                disabled={!formData.paymentScreenshot}
              >
                Submit
              </button>
            </>
          )}

          {step === 4 && <p>✅ Submitted</p>}
        </>
      )}
    </div>
  );
}
