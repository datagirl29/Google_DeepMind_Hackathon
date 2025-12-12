import React, { useState, useEffect } from 'react';
import { NewsItem, NewsBreakdown, GroundingChunk, UserPersona } from '../types';
import { analyzeNewsItem, generateNewsImage, generateSpeech } from '../services/geminiService';
import { Loader2, ShieldCheck, MapPin, ExternalLink, Activity, Globe, Play, Square, Users, CheckCircle2, ArrowRight, Zap, History } from 'lucide-react';

interface NewsCardProps {
  item: NewsItem;
  persona: UserPersona;
  accessibilityMode: string;
  language: string; // Received from App
}

// UI Translation Dictionary
const UI_LABELS: Record<string, Record<string, string>> = {
    'Read Full Story': { 'Spanish': 'Leer Historia', 'French': 'Lire l\'histoire', 'German': 'Ganze Geschichte', 'Hindi': 'पूरी कहानी पढ़ें', 'Chinese': '阅读全文', 'Arabic': 'اقرأ القصة كاملة', 'Japanese': '全文を読む', 'Italian': 'Leggi tutto' },
    'Fold Newspaper': { 'Spanish': 'Cerrar', 'French': 'Fermer', 'German': 'Schließen', 'Hindi': 'बंद करें', 'Chinese': '收起', 'Arabic': 'أغلق', 'Japanese': '閉じる', 'Italian': 'Chiudi' },
    'Analyzing...': { 'Spanish': 'Analizando...', 'French': 'Analyse...', 'German': 'Analysieren...', 'Hindi': 'विश्लेषण हो रहा है...', 'Chinese': '分析中...', 'Arabic': 'جار التحليل...', 'Japanese': '分析中...', 'Italian': 'Analisi...' },
    'Listen': { 'Spanish': 'Escuchar', 'French': 'Écouter', 'German': 'Hören', 'Hindi': 'सुनें', 'Chinese': '听', 'Arabic': 'استمع', 'Japanese': '聞く', 'Italian': 'Ascolta' },
    'Stop': { 'Spanish': 'Parar', 'French': 'Arrêter', 'German': 'Stopp', 'Hindi': 'रोकें', 'Chinese': '停止', 'Arabic': 'قف', 'Japanese': '停止', 'Italian': 'Stop' },
    'Fig 1. Editorial Illustration': { 'Spanish': 'Fig 1. Ilustración Editorial', 'French': 'Fig 1. Illustration Éditoriale', 'German': 'Abb 1. Redaktionelle Illustration', 'Hindi': 'चित्र 1. संपादकीय चित्रण', 'Chinese': '图 1. 社论插图', 'Arabic': 'الشكل 1. رسم افتتاحي', 'Japanese': '図1. 編集イラスト', 'Italian': 'Fig 1. Illustrazione Editoriale' },
    'Sketching...': { 'Spanish': 'Dibujando...', 'French': 'Esquisse...', 'German': 'Zeichnen...', 'Hindi': 'चित्र बन रहा है...', 'Chinese': '素描中...', 'Arabic': 'رسم...', 'Japanese': 'スケッチ中...', 'Italian': 'Schizzo...' },
    'Advisor': { 'Spanish': 'Asesor', 'French': 'Conseiller', 'German': 'Berater', 'Hindi': 'सलाहकार', 'Chinese': '顾问', 'Arabic': 'مستشار', 'Japanese': 'アドバイザー', 'Italian': 'Consigliere' },
    'Recommendation': { 'Spanish': 'Recomendación', 'French': 'Recommandation', 'German': 'Empfehlung', 'Hindi': 'सिफारिश', 'Chinese': '建议', 'Arabic': 'توصية', 'Japanese': '推奨', 'Italian': 'Raccomandazione' },
    'Past Context': { 'Spanish': 'Contexto Pasado', 'French': 'Contexte Passé', 'German': 'Vergangener Kontext', 'Hindi': 'पिछला संदर्भ', 'Chinese': '过去背景', 'Arabic': 'السياق الماضي', 'Japanese': '過去の背景', 'Italian': 'Contesto Passato' },
    'WHAT HAPPENED?': { 'Spanish': '¿QUÉ PASÓ?', 'French': 'QUE S\'EST-IL PASSÉ ?', 'German': 'WAS IST PASSIERT?', 'Hindi': 'क्या हुआ?', 'Chinese': '发生了什么？', 'Arabic': 'ماذا حدث؟', 'Japanese': '何が起きた？', 'Italian': 'COSA È SUCCESSO?' },
    'WHY IT MATTERS?': { 'Spanish': '¿POR QUÉ IMPORTA?', 'French': 'POURQUOI C\'EST IMPORTANT ?', 'German': 'WARUM ES WICHTIG IST?', 'Hindi': 'यह महत्वपूर्ण क्यों है?', 'Chinese': '为什么很重要？', 'Arabic': 'لماذا هذا مهم؟', 'Japanese': 'なぜ重要なのか？', 'Italian': 'PERCHÉ È IMPORTANTE?' },
    'WHO IS AFFECTED!': { 'Spanish': '¡QUIÉN ESTÁ AFECTADO!', 'French': 'QUI EST TOUCHÉ !', 'German': 'WER IST BETROFFEN!', 'Hindi': 'कौन प्रभावित है!', 'Chinese': '谁受影响！', 'Arabic': 'من المتأثر!', 'Japanese': '誰が影響を受けるか！', 'Italian': 'CHI È COINVOLTO!' },
    'Verified Sources': { 'Spanish': 'Fuentes Verificadas', 'French': 'Sources Vérifiées', 'German': 'Verifizierte Quellen', 'Hindi': 'सत्यापित स्रोत', 'Chinese': '经核实来源', 'Arabic': 'مصادر موثوقة', 'Japanese': '検証された情報源', 'Italian': 'Fonti Verificate' },
    'Present': { 'Spanish': 'Presente', 'French': 'Présent', 'German': 'Gegenwart', 'Hindi': 'वर्तमान', 'Chinese': '现在', 'Arabic': 'الحاضر', 'Japanese': '現在', 'Italian': 'Presente' },
    'Future': { 'Spanish': 'Futuro', 'French': 'Futur', 'German': 'Zukunft', 'Hindi': 'भविष्य', 'Chinese': '未来', 'Arabic': 'المستقبل', 'Japanese': '未来', 'Italian': 'Futuro' },
};

// Helper to decode raw PCM data from Gemini TTS
const pcmToAudioBuffer = (buffer: ArrayBuffer, ctx: AudioContext): AudioBuffer => {
    const pcm16 = new Int16Array(buffer);
    const sampleRate = 24000; // Gemini TTS standard
    const channels = 1;
    
    const audioBuffer = ctx.createBuffer(channels, pcm16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
    }
    
    return audioBuffer;
};

export const NewsCard: React.FC<NewsCardProps> = ({ item, persona, accessibilityMode, language }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<NewsBreakdown | null>(null);
  const [links, setLinks] = useState<GroundingChunk[]>([]);
  const [imageParams, setImageParams] = useState<{ url: string; loading: boolean }>({ url: '', loading: false });
  const [audioParams, setAudioParams] = useState<{ playing: boolean; loading: boolean }>({ playing: false, loading: false });
  
  // Track the language currently displayed in the breakdown
  const [analyzedLanguage, setAnalyzedLanguage] = useState('');

  const audioContextRef = React.useRef<AudioContext | null>(null);
  const audioSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  // NEW: Ref to cache the decoded audio buffer
  const audioBufferRef = React.useRef<AudioBuffer | null>(null);

  // Helper to get translated UI label
  const t = (label: string) => UI_LABELS[label]?.[language] || label;

  // Re-analyze automatically if the card is open and the global language changes
  useEffect(() => {
    if (expanded && breakdown && language !== analyzedLanguage) {
        handleAnalyze(true);
    }
  }, [language]);

  const handleAnalyze = async (forceRegenerateImage = false) => {
    // Check if language changed since last analysis
    const isLanguageMismatch = analyzedLanguage !== '' && analyzedLanguage !== language;
    const shouldRegenerate = forceRegenerateImage || isLanguageMismatch;

    // If we have data AND the language matches AND we aren't forced -> just toggle
    if (breakdown && !shouldRegenerate) {
        setExpanded(!expanded);
        return;
    }
    
    // Clear the audio cache because we are about to get new content/language
    audioBufferRef.current = null;

    setLoading(true);
    setExpanded(true); // Force open to show loader
    try {
      const result = await analyzeNewsItem(item.title, item.snippet || "", persona, language);
      setBreakdown(result.breakdown);
      setLinks(result.groundingChunks);
      setAnalyzedLanguage(language);
      
      // Generate art. Pass flag to force regeneration if language changed.
      handleAutoGenerateArt(shouldRegenerate);
    } catch (e) {
      alert("Analysis failed. Please try again.");
      setExpanded(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerateArt = async (force = false) => {
    // If image exists and we are not forced to regenerate, skip.
    if (imageParams.url && !force) return;

    setImageParams({ url: '', loading: true });
    try {
        // Uses Nano Banana (Flash Image) via service
        const url = await generateNewsImage(item.title);
        setImageParams({ url, loading: false });
    } catch (e) {
        console.error("Auto-art failed", e);
        setImageParams({ url: '', loading: false });
    }
  };

  const handleTTS = async () => {
    if (audioParams.playing) {
        audioSourceRef.current?.stop();
        setAudioParams({ ...audioParams, playing: false });
        return;
    }

    if (!breakdown) return;

    setAudioParams({ ...audioParams, loading: true });
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        
        // Use cached buffer if available
        let buffer = audioBufferRef.current;

        if (!buffer) {
            const whatText = breakdown.what.join('. ');
            const impactText = breakdown.present_consequences.join('. ');
            const futureText = breakdown.future_impact.join('. ');
            const textToRead = `Here is the truth. ${breakdown.why}. What Happened: ${whatText}. Why it matters: ${impactText}. Future outlook: ${futureText}`;
            
            const audioData = await generateSpeech(textToRead);
            buffer = pcmToAudioBuffer(audioData, audioContextRef.current);
            // Cache the buffer for next time
            audioBufferRef.current = buffer;
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setAudioParams({ playing: false, loading: false });
        source.start(0);
        audioSourceRef.current = source;
        
        setAudioParams({ playing: true, loading: false });
    } catch (e) {
        console.error(e);
        setAudioParams({ ...audioParams, loading: false });
        alert("Failed to generate speech.");
    }
  };

  const isDyslexic = accessibilityMode === 'DYSLEXIA';
  const isLargeText = accessibilityMode === 'LARGE_TEXT';

  return (
    <div 
        className={`
            relative border-b-4 border-r-4 border-ink shadow-sm rounded-lg p-6 mb-6 transition-all duration-300 overflow-hidden group
            ${expanded ? 'scale-[1.01] shadow-xl border-accent bg-[#FDFBF7]' : 'bg-white hover:border-ink-light'}
            ${isDyslexic ? 'font-sans tracking-wide leading-loose' : 'font-serif'}
            ${isLargeText ? 'text-lg' : 'text-base'}
        `}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 relative z-10">
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-accent uppercase tracking-widest">
                <span>{item.source}</span>
                <span>•</span>
                <span>{new Date(item.pubDate).toLocaleDateString()}</span>
            </div>
            
            {/* Title visible when collapsed OR when loading (analyzing) */}
            {(!expanded || loading) && (
                <h3 className={`font-bold text-ink mb-3 ${isLargeText ? 'text-2xl' : 'text-xl'}`}>
                    {item.title}
                </h3>
            )}
            
            {/* Snippet visible when collapsed OR when loading (analyzing) */}
            {(!expanded || loading) && <p className="text-ink/70 line-clamp-2 font-sans">{item.snippet}</p>}
        </div>
        
        <div className="flex gap-2 shrink-0 items-center flex-wrap justify-end">
             {/* Listen Button - Top Right (Visible when expanded AND not loading) */}
             {expanded && !loading && (
                <button 
                    onClick={handleTTS}
                    disabled={audioParams.loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-sans font-bold text-sm shadow-sm border border-ink/20 transition-colors
                        ${audioParams.playing 
                            ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                            : 'bg-white text-ink hover:bg-ink/5'
                        }`}
                >
                    {audioParams.loading ? <Loader2 className="animate-spin w-4 h-4"/> : audioParams.playing ? <Square className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current"/>}
                    {audioParams.playing ? t("Stop") : t("Listen")}
                </button>
             )}

             {/* Main Action Button */}
             <button 
                onClick={() => handleAnalyze(false)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-md hover:bg-accent transition-colors font-sans font-bold text-sm shadow-sm min-w-[140px] justify-center"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {loading ? t("Analyzing...") : expanded ? t("Fold Newspaper") : t("Read Full Story")}
            </button>
        </div>
      </div>

      {/* Expanded Analysis Section - Only visible when we have data AND we are not loading */}
      {expanded && breakdown && !loading && (
        <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500 relative z-10">
            
            {/* 1. One Line Summary - Centered Top */}
            <div className="text-center max-w-3xl mx-auto mb-6">
                <h4 className="text-xl md:text-2xl font-serif italic font-medium text-ink leading-relaxed border-b-2 border-double border-ink/10 pb-6 relative">
                    "{breakdown.why}"
                </h4>
            </div>

            {/* 2. Audience & Stats Row - Centered */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
                 {/* Audience Badge */}
                 <div className="flex items-center gap-2 px-3 py-1 bg-accent text-white rounded-full text-xs font-bold uppercase shadow-sm">
                    <Users className="w-4 h-4" />
                    {breakdown.audience}
                </div>
                
                {/* Location Badge */}
                <div className="flex items-center gap-2 px-3 py-1 bg-white text-ink rounded-full text-xs font-bold uppercase border border-ink/20 shadow-sm">
                    <MapPin className="w-3 h-3" />
                    {breakdown.geolocation?.label || "Global"}
                </div>

                {/* Bias Badge */}
                <div className="flex items-center gap-2 px-3 py-1 bg-white text-ink rounded-full text-xs font-bold uppercase border border-ink/20 shadow-sm">
                     <ShieldCheck className="w-3 h-3" />
                     {breakdown.bias_analysis.label || (breakdown.bias_analysis.is_controversial ? "Controversial" : "Verified")}
                </div>
            </div>

            {/* 3. Auto-Generated Art - Centered (Pencil Sketch) with TEXT OVERLAY */}
            {(imageParams.url || imageParams.loading) && (
                <div className="mb-10 max-w-2xl mx-auto">
                    {imageParams.url ? (
                        <div className="rounded-sm overflow-hidden border-4 border-white shadow-lg bg-white p-2 group-image">
                             <div className="relative">
                                 <img src={imageParams.url} alt="Editorial Sketch" className="w-full h-auto filter sepia-[.2] contrast-125" />
                                 
                                 {/* OVERLAY: Positioned at the bottom of the image */}
                                 <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center items-end bg-gradient-to-t from-black/20 to-transparent">
                                    <div className="bg-paper/95 backdrop-blur-md p-3 border border-ink/10 shadow-lg max-w-[95%]">
                                        <p className="font-serif font-bold text-center text-ink text-sm md:text-lg leading-tight italic">
                                            "{item.title}"
                                        </p>
                                    </div>
                                 </div>
                             </div>

                             <div className="mt-2 text-center text-[10px] font-sans font-bold uppercase tracking-widest text-ink/40">
                                {t("Fig 1. Editorial Illustration")}
                             </div>
                        </div>
                    ) : (
                        <div className="h-48 rounded-sm bg-gray-50 flex items-center justify-center border-2 border-dashed border-ink/20">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="animate-spin w-6 h-6 text-ink/40" />
                                <span className="text-xs font-sans font-bold uppercase text-ink/40">{t("Sketching...")}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-8 items-start">
                
                {/* Left Column (Span 2): The Facts & Why It Matters */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* What Happened - Bullet Points */}
                    <div className="p-5 rounded-lg bg-white border-2 border-ink/10 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                        <h4 className="flex items-center gap-2 font-bold text-lg text-ink mb-4">
                            <Zap className="w-5 h-5 text-accent fill-current" />
                            {t("WHAT HAPPENED?")}
                        </h4>
                        <ul className="space-y-3">
                            {breakdown.what.map((point, i) => (
                                <li key={i} className="flex items-start gap-3 text-ink/90">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {/* Who - Compact */}
                    <div className="p-4 rounded-lg bg-white/50 border border-ink/5">
                        <h4 className="font-bold text-sm uppercase opacity-70 mb-2">{t("WHO IS AFFECTED!")}</h4>
                        <div className="flex flex-wrap gap-2">
                            {breakdown.who.map((w, i) => (
                                <span key={i} className="px-2 py-1 bg-white border border-ink/10 rounded text-xs font-semibold text-ink/80">{w}</span>
                            ))}
                        </div>
                    </div>

                    {/* Why It Matters */}
                    <div className="p-5 rounded-lg bg-accent/5 border border-accent/20">
                         <h4 className="flex items-center gap-2 font-bold text-base text-ink mb-4">
                            <Activity className="w-4 h-4 text-accent" />
                            {t("WHY IT MATTERS?")}
                        </h4>
                        <div className="grid md:grid-cols-2 gap-6">
                             <div>
                                <h5 className="text-xs font-bold uppercase text-accent mb-2 flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3"/> {t("Present")}
                                </h5>
                                <ul className="space-y-2">
                                    {breakdown.present_consequences.map((c, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="block w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></span>
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                             </div>
                             <div>
                                <h5 className="text-xs font-bold uppercase text-accent mb-2 flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3"/> {t("Future")}
                                </h5>
                                <ul className="space-y-2">
                                    {breakdown.future_impact.map((f, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="block w-1.5 h-1.5 rounded-full bg-accent/50 mt-1.5 shrink-0"></span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Span 1): Advisor & Past Context */}
                <div className="space-y-6">
                    {/* Advisor Card */}
                    <div className="bg-ink text-paper p-5 rounded-lg shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldCheck size={100} />
                        </div>
                        <h4 className="font-bold uppercase tracking-wider text-sm mb-3 border-b border-paper/20 pb-2 relative z-10">{t("Advisor")}</h4>
                        <div className="mb-4 relative z-10">
                            <span className="text-xs opacity-80 uppercase">{t("Recommendation")}</span>
                            <div className="text-3xl font-black text-accent mt-1">{breakdown.wait_or_prepare.advice}</div>
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed italic relative z-10">
                            "{breakdown.wait_or_prepare.reasoning}"
                        </p>
                    </div>

                    {/* Past Context Block */}
                    <div className="bg-[#F2EAD3] p-5 rounded-lg border border-ink/10 relative">
                        <h4 className="font-bold uppercase text-xs text-ink/60 mb-3 flex items-center gap-2">
                            <History className="w-4 h-4"/> {t("Past Context")}
                        </h4>
                        {breakdown.past_references && breakdown.past_references.length > 0 ? (
                            <ul className="space-y-3">
                                {breakdown.past_references.map((ref, i) => (
                                    <li key={i} className="text-sm text-ink/80 italic leading-relaxed border-l-2 border-ink/20 pl-3">
                                        {ref}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-ink/40 italic">Currently no context found.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Verified Sources / Grounding */}
            {links && links.length > 0 && (
                <div className="mt-8 pt-6 border-t border-ink/10">
                    <h4 className="font-bold text-sm uppercase text-ink/60 mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4"/> {t("Verified Sources")}
                    </h4>
                    <div className="flex flex-wrap gap-3">
                        {links.map((link, idx) => link.web?.uri && (
                            <a 
                                key={idx} 
                                href={link.web.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-ink/20 rounded-full hover:border-accent hover:text-accent transition-colors truncate max-w-[200px]"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {link.web.title || "Source"}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};