import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Wrench, Tractor, Truck, Store, PartyPopper, Monitor, User, HeartPulse, GraduationCap, HardHat, PawPrint, Droplets, Key, Coffee, Briefcase } from 'lucide-react';
import { Category, SearchFilters } from '../types';
import { MAIN_CATEGORIES } from '../constants';

// यहाँ हमने सब-कैटेगरी का डेटा आपके पिछले मैसेज के हिसाब से जोड़ दिया है
const SUB_CATEGORIES_MAP: Record<number, string[]> = {
  1: ["बिजली मिस्त्री (Electrician)", "नल मिस्त्री (Plumber)", "राजमिस्त्री (Mason)", "बढ़ई (Carpenter)", "लोहार (Welder)", "पेंटर (Painter)", "बाइक मैकेनिक", "कार मैकेनिक", "ट्रैक्टर मैकेनिक", "पंप मैकेनिक", "इलेक्ट्रॉनिक्स रिपेयर", "साइकिल मिस्त्री", "जनरेटर मैकेनिक"],
  2: ["खेत मजदूर (Farm Labour)", "जेसीबी ऑपरेटर", "ट्रैक्टर ड्राइवर", "हार्वेस्टर/थ्रेशर", "कंबाइन मशीन", "माली/नर्सरी", "डेयरी/दूध कलेक्शन", "पशु डॉक्टर/सहायक", "खाद-बीज भंडार", "पशु आहार स्टोर", "बोरवेल मशीन"],
  3: ["टैक्सी/कार ड्राइवर", "बस/ट्रक ड्राइवर", "ऑटो/ई-रिक्शा", "पिकअप/छोटा हाथी", "एम्बुलेंस सेवा", "टूर और ट्रेवल्स", "क्रेन सर्विस"],
  4: ["किराना स्टोर", "मेडिकल स्टोर", "मोबाइल दुकान", "खाद-बीज दुकान", "कपड़े की दुकान", "जूते-चप्पल", "हार्डवेयर स्टोर", "बर्तन की दुकान", "ज्वैलरी", "चश्मे की दुकान", "किताबों की दुकान", "इलेक्ट्रॉनिक शोरूम", "फर्नीचर हाउस"],
  5: ["हलवाई/कुक", "टेंट हाउस", "डीजे/साउंड", "बैंड बाजा", "फोटोग्राफर", "ब्यूटी पार्लर", "मेहंदी आर्टिस्ट", "फूल सजावट", "केटरिंग"],
  6: ["ई-मित्र/सीएससी", "फोटोकॉपी/टाइपिंग", "बैंकिंग एजेंट", "बीमा एजेंट", "वकील/नोटरी", "प्रॉपर्टी डीलर"],
  7: ["दर्जी", "नाई/सैलून", "धोबी/प्रेस", "ट्यूशन Teacher", "सफाई कर्मचारी", "गार्ड/वॉचमैन", "टिफिन सर्विस", "आटा चक्की"],
  8: ["प्राइवेट डॉक्टर/क्लिनिक", "नर्स/ANM", "कंपाउंडर", "पैथोलॉजी/लैब", "आयुर्वेद/होम्योपैथी"],
  9: ["स्कूल/कोचिंग", "कंप्यूटर क्लास", "स्किल ट्रेनिंग", "ड्राइविंग स्कूल"],
  10: ["बिल्डिंग ठेकेदार", "रोड निर्माण", "टाइल मिस्त्री", "POP/False Ceiling", "ड्रिलिंग सर्विस"],
  11: ["मुर्गी पालन", "मछली पालन", "बकरी पालन", "मधुमक्खी पालन"],
  12: ["पानी टैंकर", "सेप्टिक टैंक सफाई", "कूड़ा उठाना", "ड्रेनेज सफाई"],
  13: ["JCB/ट्रैक्टर किराया", "शादी सामान किराया", "जनरेटर किराया", "स्पीकर किराया"],
  14: ["ढाबा/रेस्टोरेंट", "चाय की दुकान", "मिठाई की दुकान", "होटल/लॉज"],
  15: ["दिहाड़ी मजदूर", "लोडिंग/अनलोडिंग", "खेत में अस्थायी काम"]
};

interface SearchFormProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const iconMap: Record<string, any> = {
  Wrench, Tractor, Truck, Store, PartyPopper, Monitor, User, HeartPulse, GraduationCap, HardHat, PawPrint, Droplets, Key, Coffee, Briefcase
};

export default function SearchForm({ filters, setFilters, onSearch, isLoading }: SearchFormProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategory = MAIN_CATEGORIES.find(
    cat => filters.category === `${cat.hindi} (${cat.english})` || filters.category === cat.english
  );

  const SelectedIcon = selectedCategory ? (iconMap[selectedCategory.icon] || Wrench) : Search;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 md:p-3 relative z-30">
        <div className="flex flex-col gap-3">
          
          <div className="flex flex-col md:flex-row gap-2">
            {/* 1. मुख्य श्रेणी (Main Category Dropdown) */}
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full h-14 px-4 flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 border-2 border-transparent focus:border-emerald-500 rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg ${selectedCategory ? selectedCategory.color + ' bg-opacity-10 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <SelectedIcon size={20} />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none mb-1">Category / श्रेणी</p>
                    <p className="text-sm font-bold text-slate-700 truncate">
                      {selectedCategory ? `${selectedCategory.hindi} - ${selectedCategory.english}` : 'Select Category / श्रेणी चुनें'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-[300px] overflow-y-auto py-2 animate-in fade-in slide-in-from-top-2">
                  {MAIN_CATEGORIES.map((cat) => {
                    const Icon = iconMap[cat.icon] || Wrench;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setFilters({ ...filters, category: cat.english as Category, keyword: '' });
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left"
                      >
                        <div className={`p-2 rounded-lg ${cat.color} bg-opacity-10 text-emerald-600`}>
                          <Icon size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{cat.hindi} ({cat.english})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. उप-श्रेणी (Sub-Category Dropdown) - केवल तभी दिखेगा जब मुख्य श्रेणी चुनी हो */}
            <div className="flex-1">
              <div className="relative">
                <select
                  disabled={!selectedCategory}
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  className="w-full h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 appearance-none disabled:opacity-50"
                >
                  <option value="">Select Work / काम चुनें</option>
                  {selectedCategory && SUB_CATEGORIES_MAP[selectedCategory.id]?.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            {/* 3. पिन कोड सर्च (Pincode Search) */}
            <div className="flex-grow relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <MapPin size={20} />
              </div>
              <input
                type="text"
                placeholder="Enter Pincode / पिन कोड डालें"
                className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all text-sm font-medium"
              />
            </div>

            {/* एक्शन बटन */}
            <button
              onClick={onSearch}
              disabled={isLoading}
              className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 flex-shrink-0"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search size={20} />
                  <span>खोजें / Find</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
        Results within 10 KM / 10 किमी के भीतर परिणाम
      </p>
    </div>
  );
}
