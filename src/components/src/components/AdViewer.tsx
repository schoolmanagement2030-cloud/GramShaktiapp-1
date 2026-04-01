import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function AdViewer() {
  const [ads, setAds] = useState<any[]>([]);
  const [sequence, setSequence] = useState<string[]>([]);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const snap = await getDocs(collection(db, "active_banners"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAds(list);

        const config = await getDoc(doc(db, "settings", "ads_config"));
        if (config.exists()) {
          setSequence(config.data().adSequence || ["local","google"]);
        } else {
          setSequence(["local","google"]);
        }
      } catch (e) {
        console.log("Ad Load Error", e);
      }
    };

    loadData();
  }, []);

  const handleAdClick = () => {
    if (sequence.length === 0) return;

    const next = clickCount + 1;
    setClickCount(next);

    const type = sequence[(next - 1) % sequence.length];

    if (type === "local") {
      showLocalAd();
    } else {
      showGoogleAd();
    }
  };

  const showLocalAd = () => {
    if (ads.length === 0) {
      alert("No Ads Available");
      return;
    }

    const ad = ads[Math.floor(Math.random() * ads.length)];

    alert(ad.text);

    if (ad.websiteUrl) {
      window.open(ad.websiteUrl, "_blank");
    }
  };

  const showGoogleAd = () => {
    alert("Google Ad");

    if ((window as any).showAd) {
      (window as any).showAd();
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <button onClick={handleAdClick}>
        Ads देखो और कमाओ 💰
      </button>
    </div>
  );
}
