'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, User as UserIcon, Star, Globe, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface SearchResults {
  celebrities: Array<{
    id: string;
    name: string;
    imageUrl: string;
    category: string;
    country: string;
  }>;
  users: Array<{
    id: string;
    name: string | null;
    profilePath: string | null;
  }>;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResults>({ celebrities: [], users: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length >= 2) {
      const fetchResults = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data);
          }
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    }
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
          <Search className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Search Results</h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-1">Intelligence Report for: "{query}"</p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block p-4 rounded-full border-t-2 border-primary animate-spin mb-4" />
          <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.2em]">Synchronizing_Data_Clusters...</p>
        </div>
      ) : results.celebrities.length === 0 && results.users.length === 0 ? (
        <div className="py-24 text-center bg-surface/20 rounded-[40px] border border-white/5">
          <p className="text-gray-500 italic font-mono uppercase tracking-[0.3em]">No subjects found matching your query.</p>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in duration-700">
          {/* Celebrities Section */}
          {results.celebrities.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Star size={14} className="text-primary" /> Verified Subjects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.celebrities.map((celeb) => (
                  <Link 
                    key={celeb.id} 
                    href={`/celebrity/${celeb.id}`}
                    className="group flex items-center gap-4 p-4 rounded-3xl bg-surface/40 border border-white/5 hover:border-primary/30 hover:bg-surface/60 transition-all"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-primary/20 transition-all">
                      <img src={celeb.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{celeb.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">{celeb.category}</span>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-gray-600 uppercase">
                          <Globe size={10} /> {celeb.country}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-700 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Users Section */}
          {results.users.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <UserIcon size={14} className="text-blue-500" /> Community Members
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.users.map((user) => (
                  <Link 
                    key={user.id} 
                    href={`/user/${user.id}`}
                    className="group flex items-center gap-4 p-4 rounded-3xl bg-surface/40 border border-white/5 hover:border-blue-500/30 hover:bg-surface/60 transition-all"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-blue-500/20 transition-all bg-white/5 flex items-center justify-center">
                      {user.profilePath ? (
                        <img src={user.profilePath} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="text-gray-700" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{user.name || 'Anonymous Member'}</h3>
                      <span className="text-[10px] text-gray-600 font-mono uppercase">Broadcast Agent // active</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SearchResultsContent />
    </Suspense>
  );
}
