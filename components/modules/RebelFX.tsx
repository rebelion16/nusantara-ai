import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Activity, Zap, MessageSquare, 
  Eye, BarChart2, ShieldCheck, Radio, 
  Send, Upload, AlertTriangle, CheckCircle, RefreshCw, Sparkles
} from 'lucide-react';
import { analyzeForexChart, chatWithAstra, generateForexSignal, fileToBase64 } from '../../services/geminiService';

// --- CONSTANTS ---

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'chat', label: 'Astra AI Chat', icon: MessageSquare },
  { id: 'scanner', label: 'Chart Scanner', icon: Eye },
  { id: 'signals', label: 'Signal Generator', icon: Zap },
  { id: 'risk', label: 'Risk Guardian', icon: ShieldCheck },
];

const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'NAS100', 'US30'];
const TIMEFRAMES = ['M5', 'M15', 'H1', 'H4', 'D1'];

// --- MOCK DATA FOR DASHBOARD VISUALS ---

const MOCK_SENTIMENT = [
  { pair: 'XAUUSD', value: 75, trend: 'Bullish' },
  { pair: 'EURUSD', value: 40, trend: 'Bearish' },
  { pair: 'GBPUSD', value: 55, trend: 'Neutral' },
  { pair: 'USDJPY', value: 80, trend: 'Strong Bullish' },
];

const MOCK_EVENTS = [
  { time: '19:30', currency: 'USD', event: 'CPI Data Release', impact: 'High' },
  { time: '21:00', currency: 'USD', event: 'FOMC Meeting', impact: 'High' },
  { time: '14:00', currency: 'EUR', event: 'Lagarde Speaks', impact: 'Medium' },
];

// --- COMPONENTS ---

const SentimentRadar: React.FC = () => {
  return (
    <div className="relative w-full h-64 flex items-center justify-center bg-slate-900/50 rounded-full border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden">
      {/* Grid Rings */}
      <div className="absolute w-[80%] h-[80%] border border-dashed border-slate-700 rounded-full animate-pulse"></div>
      <div className="absolute w-[50%] h-[50%] border border-slate-700 rounded-full"></div>
      <div className="absolute w-[20%] h-[20%] bg-cyan-500/10 rounded-full blur-xl"></div>
      
      {/* Radar Scan Line */}
      <div className="absolute w-1/2 h-1/2 top-0 right-1/2 origin-bottom-right bg-gradient-to-t from-transparent to-cyan-500/30 animate-[spin_4s_linear_infinite] rounded-tl-full"></div>
      
      {/* Blips */}
      <div className="absolute top-[20%] left-[30%] w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] animate-ping"></div>
      <div className="absolute bottom-[30%] right-[20%] w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>
      <div className="absolute top-[15%] right-[35%] w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_10px_#eab308]"></div>

      <div className="z-10 text-center">
        <h3 className="text-2xl font-black text-cyan-400 tracking-widest">MARKET PULSE</h3>
        <p className="text-[10px] text-cyan-700 font-mono">SCANNING...</p>
      </div>
    </div>
  );
};

const SignalCard: React.FC<{ signal: any }> = ({ signal }) => {
  if (!signal.pair) return null;
  const isBuy = signal.action?.toUpperCase().includes('BUY');
  return (
    <div className={`p-4 rounded-xl border-l-4 ${isBuy ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'} mb-4 animate-fade-in`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg text-white">{signal.pair}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isBuy ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>{signal.action}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
         <div>Entry: <span className="text-white">{signal.entry}</span></div>
         <div>Confidence: <span className="text-cyan-400">{signal.confidence}</span></div>
         <div>SL: <span className="text-red-400">{signal.stop_loss}</span></div>
         <div>TP: <span className="text-green-400">{signal.take_profit_1}</span></div>
      </div>
      <p className="mt-2 text-xs text-slate-400 italic border-t border-slate-700/50 pt-2">"{signal.reasoning}"</p>
    </div>
  );
};

export const RebelFXModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Chat State
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Systems online. I am Astra. Ready to analyze the markets. What is your directive?" }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scanner State
  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Signal State
  const [selectedPair, setSelectedPair] = useState('XAUUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H1');
  const [generatedSignal, setGeneratedSignal] = useState<any>(null);
  const [isSignaling, setIsSignaling] = useState(false);

  // Risk Calc
  const [balance, setBalance] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPips, setStopLossPips] = useState(30);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMsg.trim()) return;
    const userText = inputMsg;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputMsg('');
    setIsChatting(true);

    try {
      const response = await chatWithAstra(messages, userText);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection interruption. Signal lost." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleScanChart = async () => {
    if (!scanImage) return;
    setIsScanning(true);
    try {
      const base64 = await fileToBase64(scanImage);
      const result = await analyzeForexChart(base64);
      setScanResult(result);
    } catch (e) {
      setScanResult("Analysis Failed. Image corrupted or unreadable.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateSignal = async () => {
    setIsSignaling(true);
    setGeneratedSignal(null);
    try {
      const jsonStr = await generateForexSignal(selectedPair, selectedTimeframe);
      const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      setGeneratedSignal(JSON.parse(cleanJson));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSignaling(false);
    }
  };

  const calculateLotSize = () => {
    // Basic formula: Risk Amount / (SL Pips * Pip Value)
    // Assuming USD base currency and standard lots approx $10/pip for majors (simplified)
    const riskAmount = balance * (riskPercent / 100);
    const lotSize = riskAmount / (stopLossPips * 10);
    return lotSize.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500 selection:text-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                <TrendingUp className="text-white" />
             </div>
             <div>
               <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">DIGITAL REBEL FX</h1>
               <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">AI Trading Intelligence Unit</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span className="text-xs font-mono text-green-400">SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Sidebar Nav */}
        <nav className="w-full lg:w-20 bg-slate-900 border-r border-slate-800 flex lg:flex-col items-center py-4 gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
           {TABS.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`p-3 rounded-xl transition-all group relative flex-shrink-0 ${activeTab === tab.id ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
               title={tab.label}
             >
               <tab.icon size={24} />
               {activeTab === tab.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-l hidden lg:block shadow-[0_0_10px_#22d3ee]"></div>}
               {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-cyan-400 rounded-t lg:hidden shadow-[0_0_10px_#22d3ee]"></div>}
             </button>
           ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 lg:p-8">
           <div className="max-w-7xl mx-auto h-full">
              
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    {/* Radar */}
                    <div className="lg:col-span-1 bg-slate-900/50 rounded-3xl p-6 border border-slate-800 backdrop-blur-sm">
                       <SentimentRadar />
                       <div className="mt-6 space-y-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Sentiment</h4>
                          {MOCK_SENTIMENT.map(s => (
                             <div key={s.pair} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <span className="font-bold text-sm text-slate-200">{s.pair}</span>
                                <div className="flex items-center gap-3">
                                   <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <div className={`h-full ${s.trend.includes('Bullish') ? 'bg-green-500' : s.trend.includes('Bearish') ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${s.value}%` }}></div>
                                   </div>
                                   <span className={`text-[10px] font-bold ${s.trend.includes('Bullish') ? 'text-green-400' : s.trend.includes('Bearish') ? 'text-red-400' : 'text-yellow-400'}`}>{s.trend}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Stats */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* AI Forecast */}
                       <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl p-6 border border-indigo-500/20">
                          <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
                             <Sparkles size={18}/> AI Forecast (24H)
                          </h3>
                          <div className="text-4xl font-black text-white mb-1">XAUUSD</div>
                          <div className="text-sm text-green-400 font-mono mb-6">Probability: UP (78%)</div>
                          <div className="h-24 flex items-end gap-1">
                             {[40, 55, 45, 60, 75, 65, 80, 70, 85, 90, 85, 95].map((h, i) => (
                                <div key={i} className="flex-1 bg-indigo-500/30 rounded-t hover:bg-indigo-400 transition-colors" style={{ height: `${h}%` }}></div>
                             ))}
                          </div>
                       </div>

                       {/* Events */}
                       <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
                          <h3 className="flex items-center gap-2 text-slate-400 font-bold mb-4">
                             <Radio size={18}/> Economic Radar
                          </h3>
                          <div className="space-y-4">
                             {MOCK_EVENTS.map((ev, i) => (
                                <div key={i} className="flex items-start gap-3 relative">
                                   <div className="text-xs font-mono text-slate-500 mt-0.5">{ev.time}</div>
                                   <div className="flex-1">
                                      <div className="text-sm font-bold text-slate-200">{ev.event}</div>
                                      <div className="text-[10px] text-slate-500">{ev.currency} • Impact: <span className={ev.impact === 'High' ? 'text-red-500' : 'text-yellow-500'}>{ev.impact}</span></div>
                                   </div>
                                   {i < MOCK_EVENTS.length - 1 && <div className="absolute left-[18px] top-6 bottom-[-10px] w-px bg-slate-800"></div>}
                                </div>
                             ))}
                          </div>
                       </div>

                       {/* Market Map (Mini Heatmap) */}
                       <div className="col-span-1 md:col-span-2 bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Volatility Heatmap</h3>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                             {Array.from({length: 16}).map((_, i) => (
                                <div key={i} className={`aspect-square rounded flex items-center justify-center text-[10px] font-bold ${Math.random() > 0.5 ? 'bg-green-900/40 text-green-400 border border-green-500/20' : 'bg-red-900/40 text-red-400 border border-red-500/20'}`}>
                                   {['EUR', 'USD', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'][i % 8]}
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                 <div className="h-full flex flex-col bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden animate-fade-in">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center shadow-[0_0_10px_#0891b2]">
                             <MessageSquare size={16} className="text-white"/>
                          </div>
                          <div>
                             <h3 className="font-bold text-white text-sm">ASTRA AI</h3>
                             <p className="text-[10px] text-cyan-400 font-mono">ONLINE • ANALYST LEVEL 99</p>
                          </div>
                       </div>
                       <button onClick={() => setMessages([])} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"><RefreshCw size={16}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                       {messages.map((m, i) => (
                          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                                <p className="whitespace-pre-wrap">{m.text}</p>
                             </div>
                          </div>
                       ))}
                       <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 bg-slate-800/30 border-t border-slate-800">
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask Astra about XAUUSD..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                          />
                          <button 
                             onClick={handleSendMessage}
                             disabled={isChatting || !inputMsg.trim()}
                             className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors disabled:opacity-50"
                          >
                             {isChatting ? <RefreshCw className="animate-spin"/> : <Send size={20}/>}
                          </button>
                       </div>
                    </div>
                 </div>
              )}

              {/* SCANNER TAB */}
              {activeTab === 'scanner' && (
                 <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col items-center justify-center text-center border-dashed relative group">
                       <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                             if(e.target.files && e.target.files[0]) {
                                setScanImage(e.target.files[0]);
                                setScanPreview(URL.createObjectURL(e.target.files[0]));
                                setScanResult('');
                             }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                       />
                       {scanPreview ? (
                          <div className="relative w-full h-full max-h-[400px]">
                             <img src={scanPreview} alt="Chart" className="w-full h-full object-contain rounded-xl" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-lg backdrop-blur">Ganti Chart</span>
                             </div>
                          </div>
                       ) : (
                          <>
                             <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-slate-400" />
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">Upload Chart</h3>
                             <p className="text-slate-400 text-sm max-w-xs">Drop screenshot TradingView atau MT4 di sini untuk dianalisa AI Vision.</p>
                          </>
                       )}
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 flex flex-col">
                       <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-white flex items-center gap-2"><Eye className="text-cyan-500"/> AI Vision Analysis</h3>
                          <button 
                             onClick={handleScanChart}
                             disabled={!scanImage || isScanning}
                             className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/50 transition-all disabled:opacity-50"
                          >
                             {isScanning ? 'Scanning...' : 'Scan Market'}
                          </button>
                       </div>
                       
                       <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300">
                          {scanResult ? (
                             <div className="whitespace-pre-wrap">{scanResult}</div>
                          ) : (
                             <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <Activity size={48} className="mb-2 opacity-20"/>
                                <p>Menunggu hasil scan...</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              )}

              {/* SIGNALS TAB */}
              {activeTab === 'signals' && (
                 <div className="h-full max-w-3xl mx-auto animate-fade-in space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
                       <div className="flex items-center gap-2 mb-6">
                          <Zap className="text-yellow-400" fill="currentColor"/>
                          <h2 className="text-xl font-bold text-white">Signal Generator</h2>
                       </div>
                       
                       <div className="flex gap-4 mb-6">
                          <select 
                             value={selectedPair}
                             onChange={(e) => setSelectedPair(e.target.value)}
                             className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-cyan-500"
                          >
                             {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select 
                             value={selectedTimeframe}
                             onChange={(e) => setSelectedTimeframe(e.target.value)}
                             className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-cyan-500"
                          >
                             {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <button 
                             onClick={handleGenerateSignal}
                             disabled={isSignaling}
                             className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                             {isSignaling ? <RefreshCw className="animate-spin"/> : <Zap size={18}/>}
                             Generate
                          </button>
                       </div>

                       {generatedSignal && (
                          <div className="bg-black/40 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-600"></div>
                             <SignalCard signal={generatedSignal} />
                          </div>
                       )}

                       {!generatedSignal && !isSignaling && (
                          <div className="text-center py-12 text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                             <BarChart2 size={48} className="mx-auto mb-2 opacity-30"/>
                             <p>Select pair and generate AI signal.</p>
                          </div>
                       )}
                    </div>
                 </div>
              )}

              {/* RISK TAB */}
              {activeTab === 'risk' && (
                 <div className="h-full max-w-2xl mx-auto animate-fade-in pt-10">
                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                       <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 blur-[80px] rounded-full"></div>
                       
                       <div className="flex items-center gap-3 mb-8">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                             <ShieldCheck className="text-green-400" size={24} />
                          </div>
                          <div>
                             <h2 className="text-2xl font-bold text-white">Risk Guardian</h2>
                             <p className="text-slate-400 text-xs">Protect your capital with AI calculation.</p>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Balance ($)</label>
                             <input 
                               type="number" 
                               value={balance}
                               onChange={(e) => setBalance(Number(e.target.value))}
                               className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xl text-white font-mono focus:border-green-500 outline-none"
                             />
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Risk %</label>
                                <input 
                                  type="number" 
                                  value={riskPercent}
                                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xl text-white font-mono focus:border-green-500 outline-none"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Stop Loss (Pips)</label>
                                <input 
                                  type="number" 
                                  value={stopLossPips}
                                  onChange={(e) => setStopLossPips(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xl text-white font-mono focus:border-green-500 outline-none"
                                />
                             </div>
                          </div>

                          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mt-6">
                             <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                   <div className="text-xs text-slate-400 mb-1">Risk Amount</div>
                                   <div className="text-2xl font-black text-red-400">${(balance * (riskPercent/100)).toFixed(2)}</div>
                                </div>
                                <div>
                                   <div className="text-xs text-slate-400 mb-1">Recommended Lot</div>
                                   <div className="text-2xl font-black text-green-400">{calculateLotSize()}</div>
                                   <div className="text-[10px] text-slate-500">Standard Lot</div>
                                </div>
                             </div>
                          </div>

                          <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-xl border border-blue-500/20">
                             <AlertTriangle className="text-blue-400 flex-shrink-0" size={20} />
                             <p className="text-xs text-blue-200">
                                <strong>AI Tip:</strong> Never risk more than 2% of your account on a single trade. Consistency beats intensity.
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

           </div>
        </main>
      </div>
    </div>
  );
};