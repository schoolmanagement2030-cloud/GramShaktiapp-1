import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  ChevronDown,
  Wrench,
  Tractor,
  Truck,
  Store,
  PartyPopper,
  Monitor,
  User,
  HeartPulse,
  GraduationCap,
  HardHat,
  PawPrint,
  Droplets,
  Key,
  Coffee,
  Briefcase
} from 'lucide-react';

import { Category, SearchFilters } from '../types';
import { MAIN_CATEGORIES, CATEGORY_MAP } from '../constants';

interface SearchFormProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading: boolean;
  categories?: any[];
  works?: any[];
}

const iconMap: Record<string, any> = {
  Wrench, Tractor, Truck, Store, PartyPopper, Monitor,
  User, HeartPulse, GraduationCap, HardHat,
  PawPrint, Droplets, Key, Coffee, Briefcase
};

export default function SearchForm({
  filters,
  setFilters,
  onSearch,
  isLoading
}: SearchFormProps) {

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ CLOSE DROPDOWN OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ SELECTED CATEGORY
  const selectedCategory = MAIN_CATEGORIES.find(
    (cat: any) => filters.category === cat.english
  );

  const SelectedIcon = selectedCategory
    ? (iconMap[selectedCategory.icon] || Wrench)
    : Search;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 md:p-3 relative z-30">

        <div className="flex flex-col gap-3">

          {/* 🔥 CATEGORY ROW */}
          <div className="flex flex-col md:flex-row gap-2">

            {/* MAIN CATEGORY */}
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full h-14 px-4 flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 border-2 border-transparent focus:border-emerald-500 rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg ${
                    selectedCategory
                      ? selectedCategory.color + ' bg-opacity-10 text-emerald-600'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <SelectedIcon size={20} />
                  </div>

                  <div className="truncate">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Category</p>
                    <p className="text-sm font-bold text-slate-700 truncate">
                      {selectedCategory ? selectedCategory.hindi : 'Select Category'}
                    </p>
                  </div>
                </div>

                <ChevronDown
                  size={20}
                  className={`text-slate-400 transition ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* DROPDOWN */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border max-h-[300px] overflow-y-auto z-50">

                  {MAIN_CATEGORIES.map((cat: any) => {
                    const Icon = iconMap[cat.icon] || Wrench;

                    return (
                      <button
                        key={cat.english}
                        onClick={() => {
                          setFilters({
                            ...filters,
                            category: cat.english as Category,
                            keyword: ''
                          });
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition"
                      >
                        <div className={`p-2 rounded-lg ${cat.color} bg-opacity-10`}>
                          <Icon size={18} />
                        </div>

                        <span className="text-sm font-bold">
                          {cat.hindi}
                        </span>
                      </button>
                    );
                  })}

                </div>
              )}
            </div>

            {/* SUB CATEGORY */}
            <div className="flex-1">
              <select
                disabled={!selectedCategory}
                value={filters.keyword}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    keyword: e.target.value
                  })
                }
                className="w-full h-14 px-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl text-sm font-bold"
              >
                <option value="">Select Work</option>

                {selectedCategory &&
                  CATEGORY_MAP[selectedCategory.english]?.map((sub: string) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
              </select>
            </div>

          </div>

          {/* 🔥 LOCATION + BUTTON */}
          <div className="flex flex-col md:flex-row gap-2">

            <div className="flex-grow relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <MapPin size={20} />
              </div>

              <input
                type="text"
                placeholder="Enter Pincode (optional)"
                className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 rounded-2xl focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={onSearch}
              disabled={isLoading}
              className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 transition"
            >
              {isLoading ? "Loading..." : (
                <>
                  <Search size={20} />
                  Find Workers
                </>
              )}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}
