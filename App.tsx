import React, { useState, useEffect, useRef } from 'react';
import { fetchNews, CATEGORIES } from './services/newsService';
import { NewsItem, UserPersona, AccessibilityMode } from './types';
import { translateNewsBatch } from './services/geminiService';
import { CategoryNav } from './components/CategoryNav';
import { NewsCard } from './components/NewsCard';
import { Newspaper, Settings, UserCircle2, Info, Languages, Loader2 } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
    { code: 'English', label: 'English' },
    { code: 'Hindi', label: 'Hindi' },
    { code: 'Spanish', label: 'Spanish' },
    { code: 'French', label: 'French' },
    { code: 'German', label: 'German' },
    { code: 'Italian', label: 'Italian' },
    { code: 'Chinese', label: 'Chinese' },
    { code: 'Japanese', label: 'Japanese' },
    { code: 'Arabic', label: 'Arabic' },
];

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('WORLD');
  
  // Original News (English)
  const [originalNews, setOriginalNews] = useState<NewsItem[]>([]);
  // Displayed News (Potentially Translated)
  const [displayedNews, setDisplayedNews] = useState<NewsItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [globalLanguage, setGlobalLanguage] = useState('English');
  
  // Cache for translations: Key = LanguageCode, Value = TranslatedItems
  const translationCache = useRef<Record<string, NewsItem[]>>({});
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>(AccessibilityMode.DEFAULT);
  const [persona, setPersona] = useState<UserPersona>({ role: 'Citizen', location: 'USA' });

  // 1. Fetch News on Category Change
  useEffect(() => {
    // Clear cache when category changes because original content changes
    translationCache.current = {};
    loadNews(activeCategory);
  }, [activeCategory]);

  // 2. Handle Language Change (Translate visible news)
  useEffect(() => {
    const handleTranslation = async () => {
        if (originalNews.length === 0) return;

        if (globalLanguage === 'English') {
            setDisplayedNews(originalNews);
            return;
        }

        // Check Cache First
        if (translationCache.current[globalLanguage]) {
            setDisplayedNews(translationCache.current[globalLanguage]);
            return;
        }

        setTranslating(true);
        // Translate the current batch
        try {
            const translated = await translateNewsBatch(originalNews, globalLanguage);
            // Save to Cache
            translationCache.current[globalLanguage] = translated;
            setDisplayedNews(translated);
        } catch (e) {
            console.error("Translation failed", e);
            // Fallback to original
            setDisplayedNews(originalNews);
        } finally {
            setTranslating(false);
        }
    };

    handleTranslation();
  }, [globalLanguage, originalNews]);

  const loadNews = async (categoryId: string) => {
    setLoading(true);
    setDisplayedNews([]); // Clear current view
    
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (category) {
      const items = await fetchNews(category.rssUrl);
      setOriginalNews(items);
      // Logic for initial display handled by the 2nd useEffect
    } else {
        setLoading(false);
    }
  };
  
  // Ensure loading state is off when originalNews updates (if English)
  useEffect(() => {
      if (globalLanguage === 'English' && originalNews.length > 0) {
          setLoading(false);
      }
      // If not english, loading state waits for translation (managed by translating state)
  }, [originalNews]);
  
  // Composite loading state
  const isContentLoading = loading || (translating && displayedNews.length === 0);

  return (
    <div className={`min-h-screen bg-paper pb-20 ${accessibilityMode === AccessibilityMode.DYSLEXIA ? 'font-sans' : ''}`}>
      
      {/* Header */}
      <header className="bg-ink text-paper pt-6 pb-16 px-6 relative overflow-visible">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Newspaper size={200} />
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
            <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter font-serif">
                    The Unsalted Truth<span className="text-accent">.</span>
                </h1>
                <p className="text-paper-dark text-sm font-medium tracking-wide max-w-xl italic mt-1">
                    AI-Powered News Clarity
                </p>
            </div>

            <div className="flex items-center gap-3">
                 {/* Global Language Selector */}
                 <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-paper/60">
                        <Languages className="w-4 h-4" />
                    </div>
                    <select 
                        value={globalLanguage}
                        onChange={(e) => setGlobalLanguage(e.target.value)}
                        className="pl-9 pr-8 py-2.5 bg-ink-light border border-paper/20 rounded-full text-sm font-bold text-paper appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent shadow-lg hover:bg-ink-light/80 transition-colors"
                    >
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code} className="text-ink">{lang.label}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-paper/60">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                 </div>

                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2.5 bg-paper/10 rounded-full hover:bg-accent hover:text-white transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-paper h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold font-serif text-ink">Configuration</h2>
                    <button onClick={() => setShowSettings(false)} className="text-ink hover:text-accent font-bold">Close</button>
                </div>

                <div className="space-y-8">
                    {/* Persona Settings */}
                    <section>
                        <h3 className="flex items-center gap-2 font-bold text-accent uppercase text-sm mb-4">
                            <UserCircle2 className="w-4 h-4"/> Your Persona
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-ink mb-1">Role</label>
                                <select 
                                    className="w-full p-2 border border-ink/20 rounded bg-white text-ink"
                                    value={persona.role}
                                    onChange={(e) => setPersona({...persona, role: e.target.value})}
                                >
                                    <option value="Citizen">General Citizen</option>
                                    <option value="Student">Student</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Professional">Professional</option>
                                    <option value="Investor">Investor</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-ink mb-1">Location</label>
                                <input 
                                    type="text"
                                    className="w-full p-2 border border-ink/20 rounded bg-white text-ink"
                                    value={persona.location}
                                    onChange={(e) => setPersona({...persona, location: e.target.value})}
                                    placeholder="e.g. New York, USA"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Accessibility Settings */}
                    <section>
                         <h3 className="flex items-center gap-2 font-bold text-accent uppercase text-sm mb-4">
                            <Info className="w-4 h-4"/> Accessibility
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setAccessibilityMode(AccessibilityMode.DEFAULT)}
                                className={`p-3 rounded border text-sm font-bold ${accessibilityMode === AccessibilityMode.DEFAULT ? 'bg-ink text-paper' : 'bg-white border-ink/20'}`}
                            >
                                Standard
                            </button>
                            <button 
                                onClick={() => setAccessibilityMode(AccessibilityMode.DYSLEXIA)}
                                className={`p-3 rounded border text-sm font-bold font-sans ${accessibilityMode === AccessibilityMode.DYSLEXIA ? 'bg-ink text-paper' : 'bg-white border-ink/20'}`}
                            >
                                Dyslexia Friendly
                            </button>
                            <button 
                                onClick={() => setAccessibilityMode(AccessibilityMode.LARGE_TEXT)}
                                className={`p-3 rounded border text-sm font-bold text-lg ${accessibilityMode === AccessibilityMode.LARGE_TEXT ? 'bg-ink text-paper' : 'bg-white border-ink/20'}`}
                            >
                                Large Text
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area - Overlapping Header */}
      <main className="max-w-6xl mx-auto -mt-8 px-4 relative z-20">
        <div className="bg-paper-dark/50 backdrop-blur-xl rounded-t-xl overflow-hidden border-t border-x border-ink/10 min-h-[500px] shadow-2xl">
            
            <CategoryNav 
                activeCategory={activeCategory} 
                onSelect={setActiveCategory} 
                language={globalLanguage}
            />

            <div className="p-4 md:p-8">
                {/* Translating Overlay Indicator */}
                {translating && displayedNews.length > 0 && (
                     <div className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-ink opacity-70 bg-white/50 p-2 rounded">
                        <Loader2 className="w-4 h-4 animate-spin"/>
                        Translating Headlines...
                     </div>
                )}

                {isContentLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-black/5 rounded-lg animate-pulse border-b-4 border-r-4 border-black/5"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {displayedNews.map((item) => (
                            <NewsCard 
                                key={item.guid} 
                                item={item} 
                                persona={persona}
                                accessibilityMode={accessibilityMode}
                                language={globalLanguage}
                            />
                        ))}
                         {displayedNews.length === 0 && !loading && (
                            <div className="text-center py-20 opacity-50">
                                <h3 className="text-xl font-bold">No news found.</h3>
                                <p>This might be due to RSS proxy limits. Try refreshing.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
      </main>
      
      <footer className="text-center text-ink/40 text-sm py-8 font-sans">
        Powered by Google Gemini 2.5 Flash & 3.0 Pro • Built with React & Tailwind
      </footer>
    </div>
  );
};

export default App;