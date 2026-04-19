import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, RotateCcw, Share2 } from 'lucide-react';
import { classifyComplaint } from '../services/geminiService';
import { submitReportToDb } from '../services/firebase';

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi', native: 'हिंदी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'en-IN', label: 'English', native: 'English' },
];

const CATEGORY_META = {
  water:       { icon: '💧', label: 'Water' },
  roads:       { icon: '🛣️', label: 'Roads' },
  electricity: { icon: '⚡', label: 'Electricity' },
  health:      { icon: '🏥', label: 'Health' },
  sanitation:  { icon: '🗑️', label: 'Sanitation' },
};

export default function VoiceReportPage() {
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    setError('');
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscriptRef.current += res[0].transcript + ' ';
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      // 'no-speech' is non-fatal — user just hasn't spoken yet
      if (event.error === 'no-speech') return;
      setError(`Microphone error: ${event.error}. Please check permissions and try again.`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [selectedLang]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleAnalyze = async () => {
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (fullText.length < 10) {
      setError('Please record a longer complaint before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const analysis = await classifyComplaint(fullText);

      const severityLabel = analysis.severity >= 7 ? 'HIGH' : analysis.severity >= 4 ? 'MEDIUM' : 'LOW';

      const reportPayload = {
        title: analysis.summary,
        description: fullText,
        district: analysis.location,
        state: 'India',
        category: analysis.category,
        citizenId: 'voice-' + Math.floor(Math.random() * 100000),
        status: 'PENDING',
        upvotes: 0,
        severity: severityLabel,
        severityScore: analysis.severity,
        caseId: analysis.caseId,
        responsibleDept: analysis.responsibleDept,
        actionRequired: analysis.actionRequired,
        officialToNotify: analysis.responsibleDept + ' Head',
        submissionType: 'voice',
        language: selectedLang,
        duration: 'Unknown',
        affected: 'Unknown',
      };

      await submitReportToDb(reportPayload).catch((e) =>
        console.error('DB save error (non-fatal):', e)
      );

      setResult({ ...analysis, severityLabel });
    } catch (err) {
      console.error(err);
      setError('Analysis failed. Please check your Gemini API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Truth Mirror Voice Report',
        text: `Voice complaint filed: ${result.summary}. Case ID: ${result.caseId}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard?.writeText(`Case ID: ${result.caseId} — ${result.summary}`);
      alert(`Case ID ${result.caseId} copied to clipboard!`);
    }
  };

  const handleReset = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setTranscript('');
    setInterimTranscript('');
    setResult(null);
    setError('');
    finalTranscriptRef.current = '';
  };

  const renderSeverityBadge = (label, score) => {
    if (label === 'HIGH') return (
      <span className="bg-red-900/50 text-[#E8363D] border border-[#E8363D] px-3 py-1 rounded-full text-xs font-bold tracking-wider">
        🔴 HIGH ({score}/10)
      </span>
    );
    if (label === 'MEDIUM') return (
      <span className="bg-yellow-900/50 text-yellow-500 border border-yellow-500 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
        🟡 MEDIUM ({score}/10)
      </span>
    );
    return (
      <span className="bg-green-900/50 text-green-500 border border-green-500 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
        🟢 LOW ({score}/10)
      </span>
    );
  };

  // ── Result Screen ────────────────────────────────────────────────────────────
  if (result) {
    const catMeta = CATEGORY_META[result.category] || { icon: '📋', label: result.category };
    return (
      <div className="bg-[#0A0A0F] min-h-screen text-white px-4 pt-10 pb-10 max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-full bg-[#12122A] border border-[#1F1F2E] rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-[#E8363D]" />

          <div className="text-center mb-6 mt-2">
            <h2 className="text-xl md:text-2xl font-black text-green-500 tracking-tight flex items-center justify-center gap-2">
              ✅ VOICE COMPLAINT FILED
            </h2>
            <p className="text-gray-500 text-xs mt-1">Stored in Firebase • Classified by Gemini AI</p>
          </div>

          {/* Case ID */}
          <div className="bg-[#0A0A0F] rounded-lg p-5 flex flex-col items-center justify-center border border-red-900/30 mb-6">
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Case ID</p>
            <p className="text-[#E8363D] text-4xl md:text-5xl font-black tracking-tighter">{result.caseId}</p>
          </div>

          <div className="space-y-4">
            {/* Category + Severity */}
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Category</p>
                <span className="bg-[#1F1F2E] text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {catMeta.icon} {catMeta.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Severity</p>
                {renderSeverityBadge(result.severityLabel, result.severity)}
              </div>
            </div>

            {/* Location */}
            <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Location Detected</p>
              <p className="text-white text-sm font-semibold">📍 {result.location}</p>
            </div>

            {/* AI Summary */}
            <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">AI Summary</p>
              <p className="text-white text-sm leading-relaxed font-medium">{result.summary}</p>
            </div>

            {/* Dept + Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Responsible Dept</p>
                <p className="text-white text-sm font-semibold">{result.responsibleDept}</p>
              </div>
              <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Action Required</p>
                <p className="text-white text-sm font-semibold">{result.actionRequired}</p>
              </div>
            </div>

            {/* Original transcript */}
            <div className="bg-[#1F1F2E]/20 p-4 rounded-lg border-l-2 border-gray-600">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Your Recording</p>
              <p className="text-gray-300 text-sm italic leading-relaxed">"{transcript.trim()}"</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleShare}
              className="w-full bg-[#E8363D] hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,51,51,0.3)]"
            >
              <Share2 size={18} />
              <span>SHARE CASE ID</span>
            </button>
            <button
              onClick={handleReset}
              className="w-full bg-[#1F1F2E] hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              <span>Record Another Complaint</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Recording Screen ─────────────────────────────────────────────────────────
  const fullTranscriptSoFar = transcript + interimTranscript;
  const canAnalyze = fullTranscriptSoFar.trim().length >= 10 && !isRecording && !isAnalyzing;

  return (
    <div className="bg-[#0A0A0F] min-h-screen text-white px-4 pt-8 pb-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 border-b border-[#1F1F2E] pb-6">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">
          Voice <span className="text-[#E8363D]">Complaint</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed">
          Speak your complaint in your language. AI will classify and file it automatically.
        </p>
      </div>

      {/* Language Selector */}
      <div className="mb-8">
        <label className="block text-gray-300 font-bold mb-3 text-sm uppercase tracking-wide">
          Select Language
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => {
            const isActive = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => !isRecording && setSelectedLang(lang.code)}
                disabled={isRecording}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-red-950/60 border-[#E8363D] shadow-[0_0_10px_rgba(255,51,51,0.2)]'
                    : 'bg-[#12122A] border-[#1F1F2E] hover:bg-[#1A1A24]'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`text-base font-bold ${isActive ? 'text-[#E8363D]' : 'text-white'}`}>
                  {lang.native}
                </span>
                <span className="text-gray-500 text-[10px] mt-0.5">{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Record Button */}
      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none
            ${isRecording
              ? 'bg-[#E8363D] shadow-[0_0_40px_rgba(232,54,61,0.6)] scale-110'
              : 'bg-[#12122A] border-2 border-[#1F1F2E] hover:border-[#E8363D] hover:shadow-[0_0_20px_rgba(232,54,61,0.3)]'
            } ${isAnalyzing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {/* Pulse rings when recording */}
          {isRecording && (
            <>
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#E8363D] opacity-25 animate-ping" />
              <span className="absolute inline-flex h-[140%] w-[140%] rounded-full bg-[#E8363D] opacity-10 animate-ping" style={{ animationDelay: '0.3s' }} />
            </>
          )}
          {isRecording
            ? <MicOff size={40} className="text-white relative z-10" />
            : <Mic size={40} className="text-[#E8363D] relative z-10" />
          }
        </button>
        <p className="mt-4 text-sm font-semibold tracking-wide">
          {isRecording
            ? <span className="text-[#E8363D] animate-pulse">● RECORDING — Tap to stop</span>
            : <span className="text-gray-400">Tap to start recording</span>
          }
        </p>
      </div>

      {/* Live Transcript Box */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-gray-300 font-bold text-sm uppercase tracking-wide">Live Transcript</label>
          {transcript && !isRecording && (
            <button
              type="button"
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>
        <div className="min-h-[140px] bg-[#12122A] border border-[#1F1F2E] rounded-lg p-4 relative">
          {!transcript && !interimTranscript ? (
            <p className="text-gray-600 text-sm italic">
              {isRecording
                ? 'Listening… speak your complaint clearly.'
                : 'Your spoken words will appear here in real-time…'
              }
            </p>
          ) : (
            <p className="text-white text-sm leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-gray-400 italic">{interimTranscript}</span>
              )}
            </p>
          )}
          {/* character count */}
          {fullTranscriptSoFar && (
            <p className={`absolute bottom-2 right-3 text-[10px] ${fullTranscriptSoFar.trim().length >= 10 ? 'text-green-500' : 'text-red-400'}`}>
              {fullTranscriptSoFar.trim().length} chars
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-950/40 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className={`w-full font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 text-lg
          ${canAnalyze
            ? 'bg-[#E8363D] hover:bg-red-700 text-white shadow-[0_4px_20px_rgba(255,51,51,0.4)] hover:shadow-[0_4px_25px_rgba(255,51,51,0.6)]'
            : 'bg-[#12122A] text-gray-500 border border-[#1F1F2E] cursor-not-allowed'
          }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="animate-spin" size={22} />
            <span>Gemini is classifying your complaint…</span>
          </>
        ) : (
          <>
            <span className="text-xl">🤖</span>
            <span>ANALYZE & FILE COMPLAINT</span>
          </>
        )}
      </button>

      {/* Instructions */}
      <div className="mt-8 bg-[#12122A] border border-[#1F1F2E] rounded-lg p-4 space-y-2">
        <p className="text-gray-300 text-xs font-bold uppercase tracking-wide mb-3">How to use</p>
        {[
          '1. Select your language above',
          '2. Tap the mic button and speak your complaint',
          '3. Mention your area/ward, the problem, and how long it has been going on',
          '4. Tap the mic again to stop, then click Analyze',
          '5. Gemini AI will classify and file the report automatically',
        ].map((step) => (
          <p key={step} className="text-gray-500 text-xs leading-relaxed">{step}</p>
        ))}
      </div>
    </div>
  );
}
