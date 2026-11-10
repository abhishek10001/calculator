'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  History, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Delete, 
  HelpCircle, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw,
  Calculator as CalcIcon,
  Atom,
  Info,
  Heart,
  Shield,
  Cpu,
  Layers
} from 'lucide-react';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

type AngleMode = 'DEG' | 'RAD';
type ThemeMode = 'dark' | 'light' | 'cyber' | 'sunset';

export default function CalculatorApp() {
  // Calculator State
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // UI & Settings State
  const [isScientific, setIsScientific] = useState<boolean>(false);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [newResultFlash, setNewResultFlash] = useState<boolean>(false);
  const [currentYear, setCurrentYear] = useState<number>(2025);

  // Flags
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [lastCalculated, setLastCalculated] = useState<boolean>(false);

  // Audio synthesis for subtle click sounds
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playClickSound = useCallback((freq = 400, type: OscillatorType = 'sine', duration = 0.03) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might fail in restricted environments
    }
  }, [soundEnabled]);

  // Load history & theme from localStorage & set year safely
  useEffect(() => {
    const year = new Date().getFullYear();
    setCurrentYear(year);
    const savedHistory = localStorage.getItem('calc_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        // ignore
      }
    }
    const savedTheme = localStorage.getItem('calc_theme') as ThemeMode;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('calc_history', JSON.stringify(history));
  }, [history]);

  // Save theme
  useEffect(() => {
    localStorage.setItem('calc_theme', theme);
  }, [theme]);

  // Handle number input
  const inputDigit = useCallback((digit: string) => {
    playClickSound(600, 'sine');
    setNewResultFlash(false);
    if (lastCalculated) {
      setDisplay(digit);
      setEquation('');
      setLastCalculated(false);
      setWaitingForOperand(false);
      return;
    }

    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, lastCalculated, waitingForOperand, playClickSound]);

  // Handle decimal point
  const inputDecimal = useCallback(() => {
    playClickSound(550, 'sine');
    setNewResultFlash(false);
    if (lastCalculated) {
      setDisplay('0.');
      setEquation('');
      setLastCalculated(false);
      setWaitingForOperand(false);
      return;
    }

    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }

    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, lastCalculated, waitingForOperand, playClickSound]);

  // Clear all
  const clearAll = useCallback(() => {
    playClickSound(300, 'triangle');
    setDisplay('0');
    setEquation('');
    setWaitingForOperand(false);
    setLastCalculated(false);
    setNewResultFlash(false);
  }, [playClickSound]);

  // Clear entry
  const clearEntry = useCallback(() => {
    playClickSound(350, 'triangle');
    setDisplay('0');
    setNewResultFlash(false);
  }, [playClickSound]);

  // Backspace
  const handleBackspace = useCallback(() => {
    playClickSound(450, 'triangle');
    if (lastCalculated || waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display, lastCalculated, waitingForOperand, playClickSound]);

  // Perform basic arithmetic calculation
  const calculateResult = useCallback((leftVal: number, rightVal: number, op: string): number => {
    switch (op) {
      case '+': return leftVal + rightVal;
      case '-': return leftVal - rightVal;
      case '×':
      case '*': return leftVal * rightVal;
      case '÷':
      case '/': return rightVal === 0 ? NaN : leftVal / rightVal;
      case '^':
      case 'xy': return Math.pow(leftVal, rightVal);
      case 'yroot': return Math.pow(leftVal, 1 / rightVal);
      default: return rightVal;
    }
  }, []);

  // Handle operators (+, -, *, /)
  const handleOperator = useCallback((nextOperator: string) => {
    playClickSound(500, 'sine');
    setNewResultFlash(false);
    const inputValue = parseFloat(display);

    if (equation === '') {
      setEquation(`${display} ${nextOperator} `);
    } else if (waitingForOperand) {
      // Replace last operator
      setEquation(equation.trim().slice(0, -1) + ` ${nextOperator} `);
    } else {
      const parts = equation.trim().split(' ');
      if (parts.length >= 3) {
        const leftVal = parseFloat(parts[0]);
        const op = parts[1];
        const result = calculateResult(leftVal, inputValue, op);
        if (isNaN(result) || !isFinite(result)) {
          setDisplay('Error');
          setEquation('');
          setWaitingForOperand(true);
          return;
        }
        const stringResult = String(result);
        setDisplay(stringResult);
        setEquation(`${stringResult} ${nextOperator} `);
      } else {
        setEquation(`${display} ${nextOperator} `);
      }
    }

    setWaitingForOperand(true);
    setLastCalculated(false);
  }, [display, equation, waitingForOperand, calculateResult, playClickSound]);

  // Equals
  const handleEquals = useCallback(() => {
    playClickSound(700, 'sine');
    if (equation === '') return;

    const inputValue = parseFloat(display);
    const parts = equation.trim().split(' ');
    
    const leftVal = parseFloat(parts[0]);
    const op = parts[1] || '+';
    let rightVal = inputValue;

    if (waitingForOperand && parts.length >= 3) {
      rightVal = leftVal;
    }

    const fullExpr = `${equation}${waitingForOperand ? '' : display}`;
    const result = calculateResult(leftVal, rightVal, op);

    let finalResultStr = '';
    if (isNaN(result) || !isFinite(result)) {
      finalResultStr = 'Error';
    } else {
      finalResultStr = String(parseFloat(result.toFixed(10)));
    }

    setDisplay(finalResultStr);
    setEquation('');
    setWaitingForOperand(true);
    setLastCalculated(true);
    setNewResultFlash(true);

    if (finalResultStr !== 'Error') {
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        expression: fullExpr,
        result: finalResultStr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setHistory(prev => [newItem, ...prev.slice(0, 49)]);
    }
  }, [display, equation, waitingForOperand, calculateResult, playClickSound]);

  // Scientific functions
  const handleScientificFunc = useCallback((funcName: string) => {
    playClickSound(650, 'sine');
    setNewResultFlash(false);
    const val = parseFloat(display);
    let res = 0;
    let exprDesc = '';

    const toRad = (angle: number) => angle * (Math.PI / 180);
    const fromRad = (rad: number) => rad * (180 / Math.PI);

    switch (funcName) {
      case 'sin':
        res = Math.sin(angleMode === 'DEG' ? toRad(val) : val);
        exprDesc = `sin(${val}${angleMode === 'DEG' ? '°' : ''})`;
        break;
      case 'cos':
        res = Math.cos(angleMode === 'DEG' ? toRad(val) : val);
        exprDesc = `cos(${val}${angleMode === 'DEG' ? '°' : ''})`;
        break;
      case 'tan':
        res = Math.tan(angleMode === 'DEG' ? toRad(val) : val);
        exprDesc = `tan(${val}${angleMode === 'DEG' ? '°' : ''})`;
        break;
      case 'asin':
        res = angleMode === 'DEG' ? fromRad(Math.asin(val)) : Math.asin(val);
        exprDesc = `asin(${val})`;
        break;
      case 'acos':
        res = angleMode === 'DEG' ? fromRad(Math.acos(val)) : Math.acos(val);
        exprDesc = `acos(${val})`;
        break;
      case 'atan':
        res = angleMode === 'DEG' ? fromRad(Math.atan(val)) : Math.atan(val);
        exprDesc = `atan(${val})`;
        break;
      case 'log':
        res = Math.log10(val);
        exprDesc = `log(${val})`;
        break;
      case 'ln':
        res = Math.log(val);
        exprDesc = `ln(${val})`;
        break;
      case 'sqrt':
        res = Math.sqrt(val);
        exprDesc = `√(${val})`;
        break;
      case 'cbrt':
        res = Math.cbrt(val);
        exprDesc = `∛(${val})`;
        break;
      case 'square':
        res = Math.pow(val, 2);
        exprDesc = `(${val})²`;
        break;
      case 'cube':
        res = Math.pow(val, 3);
        exprDesc = `(${val})³`;
        break;
      case 'inv':
        res = 1 / val;
        exprDesc = `1/(${val})`;
        break;
      case 'percent':
        res = val / 100;
        exprDesc = `${val}%`;
        break;
      case 'negate':
        res = -val;
        exprDesc = `negate(${val})`;
        break;
      case 'factorial': {
        if (val < 0 || !Number.isInteger(val)) {
          setDisplay('Error');
          return;
        }
        let f = 1;
        for (let i = 2; i <= val; i++) f *= i;
        res = f;
        exprDesc = `${val}!`;
        break;
      }
      case 'pi':
        res = Math.PI;
        exprDesc = 'π';
        break;
      case 'e':
        res = Math.E;
        exprDesc = 'e';
        break;
      case 'abs':
        res = Math.abs(val);
        exprDesc = `|${val}|`;
        break;
      case 'exp':
        res = Math.exp(val);
        exprDesc = `e^(${val})`;
        break;
      default:
        return;
    }

    const finalResultStr = String(parseFloat(res.toFixed(10)));
    setDisplay(finalResultStr);
    setLastCalculated(true);
    setNewResultFlash(true);

    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      expression: exprDesc,
      result: finalResultStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setHistory(prev => [newItem, ...prev.slice(0, 49)]);
  }, [display, angleMode, playClickSound]);

  // Memory functions
  const memoryClear = () => { playClickSound(400, 'sine'); setMemory(0); };
  const memoryRecall = () => { playClickSound(450, 'sine'); setDisplay(String(memory)); setWaitingForOperand(false); };
  const memoryAdd = () => { playClickSound(500, 'sine'); setMemory(memory + parseFloat(display)); };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
      } else if (e.key === '.') {
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        handleOperator(e.key);
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        clearAll();
      } else if (e.key.toLowerCase() === 's') {
        setIsScientific(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, handleOperator, handleEquals, handleBackspace, clearAll]);

  // Copy result to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme styles configuration
  const themeStyles = {
    dark: {
      bg: 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100',
      panel: 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800/80 shadow-2xl shadow-black/80',
      screen: 'bg-black/60 border-zinc-800/60 text-white shadow-inner',
      btnNum: 'bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-100 border-zinc-700/50 active:bg-zinc-600',
      btnOp: 'bg-amber-600/90 hover:bg-amber-500 text-white border-amber-500/50 active:bg-amber-700 shadow-lg shadow-amber-900/20',
      btnSci: 'bg-zinc-800/40 hover:bg-zinc-700/60 text-cyan-400 border-zinc-700/30 active:bg-zinc-700',
      btnAction: 'bg-zinc-700/70 hover:bg-zinc-600/80 text-rose-400 border-zinc-600/50 active:bg-zinc-500',
      accentGlow: 'from-amber-500/10 via-cyan-500/10 to-transparent'
    },
    light: {
      bg: 'bg-gradient-to-br from-slate-100 via-zinc-200 to-slate-200 text-zinc-800',
      panel: 'bg-white/80 backdrop-blur-xl border-zinc-200/80 shadow-2xl shadow-zinc-300/50',
      screen: 'bg-zinc-100/80 border-zinc-300/80 text-zinc-900 shadow-inner',
      btnNum: 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200 active:bg-zinc-200 shadow-sm',
      btnOp: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 active:bg-blue-700 shadow-md shadow-blue-500/20',
      btnSci: 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-200 active:bg-slate-300',
      btnAction: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 active:bg-rose-200',
      accentGlow: 'from-blue-500/15 via-indigo-500/10 to-transparent'
    },
    cyber: {
      bg: 'bg-gradient-to-br from-purple-950 via-zinc-950 to-blue-950 text-cyan-200',
      panel: 'bg-zinc-900/90 backdrop-blur-2xl border-cyan-500/30 shadow-2xl shadow-cyan-950/80',
      screen: 'bg-black/80 border-cyan-500/50 text-cyan-300 shadow-cyan-500/10 shadow-inner',
      btnNum: 'bg-zinc-900/80 hover:bg-cyan-950/50 text-cyan-100 border-cyan-900/60 active:bg-cyan-900/60',
      btnOp: 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-fuchsia-400/80 active:bg-fuchsia-700 shadow-lg shadow-fuchsia-600/30',
      btnSci: 'bg-zinc-900/60 hover:bg-purple-950/60 text-purple-400 border-purple-900/50 active:bg-purple-900/50',
      btnAction: 'bg-zinc-900/80 hover:bg-rose-950/50 text-rose-400 border-rose-900/60 active:bg-rose-900/50',
      accentGlow: 'from-fuchsia-500/20 via-cyan-500/20 to-transparent'
    },
    sunset: {
      bg: 'bg-gradient-to-br from-rose-950 via-orange-950 to-zinc-950 text-orange-100',
      panel: 'bg-zinc-900/85 backdrop-blur-xl border-orange-500/30 shadow-2xl shadow-orange-950/50',
      screen: 'bg-black/70 border-orange-500/40 text-orange-200 shadow-inner',
      btnNum: 'bg-zinc-800/80 hover:bg-zinc-700 text-orange-100 border-orange-900/40 active:bg-zinc-600',
      btnOp: 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white border-amber-500/50 shadow-lg shadow-rose-900/30',
      btnSci: 'bg-zinc-800/50 hover:bg-zinc-700/70 text-amber-400 border-orange-900/30 active:bg-zinc-700',
      btnAction: 'bg-zinc-800/70 hover:bg-zinc-700 text-rose-400 border-rose-900/40 active:bg-zinc-600',
      accentGlow: 'from-amber-500/20 via-rose-500/20 to-transparent'
    }
  }[theme];

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-between p-2 sm:p-6 transition-colors duration-500 relative overflow-x-hidden ${themeStyles.bg}`}>
      {/* Background ambient lighting */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b ${themeStyles.accentGlow} blur-3xl pointer-events-none rounded-full`} />

      {/* Top Header / Nav */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-4 px-2 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/20">
            <CalcIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
              NexusCalc <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">Pro</span>
            </h1>
            <p className="text-xs opacity-60 hidden sm:block">Advanced Next.js 15 Calculator &amp; Scientific Studio</p>
          </div>
        </div>

        {/* Controls: Theme, Scientific Toggle, Sound, History, Help */}
        <div className="flex items-center gap-2">
          {/* Theme selector */}
          <div className="flex bg-black/20 backdrop-blur-md rounded-xl p-1 border border-white/10">
            {(['dark', 'light', 'cyber', 'sunset'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  theme === t ? 'bg-white/20 shadow-sm text-white' : 'opacity-60 hover:opacity-100'
                }`}
                title={`Switch to ${t} theme`}
              >
                {t === 'dark' ? <Moon className="w-3.5 h-3.5" /> : t === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Atom className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all text-sm"
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>

          {/* Help Modal Toggle */}
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2.5 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all text-sm hidden sm:block"
            title="Keyboard shortcuts & Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* History Drawer Toggle */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all text-xs font-medium"
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">History</span>
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-bold text-[10px]">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container with Calculator & History Drawer */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 z-10 my-auto py-6">
        
        {/* Calculator Body */}
        <div className={`w-full ${isScientific ? 'max-w-2xl' : 'max-w-md'} rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${themeStyles.panel}`}>
          
          {/* Top toolbar: Scientific Mode Toggle & Angle Mode */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsScientific(!isScientific)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isScientific 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10' 
                    : 'bg-white/5 opacity-70 hover:opacity-100 border-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scientific Mode</span>
              </button>

              {memory !== 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold animate-pulse">
                  <span>M: {memory}</span>
                  <button onClick={memoryClear} className="ml-1 hover:text-white font-bold">×</button>
                </div>
              )}
            </div>

            {/* Angle Mode Toggle (DEG / RAD) */}
            {isScientific && (
              <div className="flex bg-black/30 rounded-xl p-0.5 border border-white/10">
                <button
                  onClick={() => setAngleMode('DEG')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    angleMode === 'DEG' ? 'bg-amber-500 text-black shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  DEG
                </button>
                <button
                  onClick={() => setAngleMode('RAD')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    angleMode === 'RAD' ? 'bg-amber-500 text-black shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  RAD
                </button>
              </div>
            )}
          </div>

          {/* Display Screen */}
          <div className={`w-full rounded-2xl p-4 mb-4 border flex flex-col justify-end items-end relative overflow-hidden ${themeStyles.screen}`}>
            {/* Copy button */}
            <div className="absolute top-2.5 left-3 flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-all text-xs opacity-70 hover:opacity-100 flex items-center gap-1"
                title="Copy result"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied && <span className="text-[10px] text-emerald-400">Copied</span>}
              </button>
            </div>

            {/* Equation history string */}
            <div className="text-xs opacity-60 h-6 flex items-center font-mono tracking-wide truncate max-w-full">
              {equation}
            </div>

            {/* Main display number */}
            <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight transition-all duration-300 truncate max-w-full ${
              newResultFlash ? 'text-amber-400 scale-[1.02]' : ''
            }`}>
              {display}
            </div>
          </div>

          {/* Keypad Grid: Standard + Scientific */}
          <div className={`grid gap-2.5 ${isScientific ? 'grid-cols-10' : 'grid-cols-4'}`}>
            
            {/* Scientific Keypad Column (if enabled) */}
            {isScientific && (
              <div className="col-span-4 grid grid-cols-4 gap-2.5 pr-2 border-r border-white/10">
                <button onClick={() => handleScientificFunc('sin')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>sin</button>
                <button onClick={() => handleScientificFunc('cos')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>cos</button>
                <button onClick={() => handleScientificFunc('tan')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>tan</button>
                <button onClick={() => handleScientificFunc('sqrt')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>√</button>

                <button onClick={() => handleScientificFunc('asin')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>sin⁻¹</button>
                <button onClick={() => handleScientificFunc('acos')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>cos⁻¹</button>
                <button onClick={() => handleScientificFunc('atan')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>tan⁻¹</button>
                <button onClick={() => handleScientificFunc('cbrt')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>∛</button>

                <button onClick={() => handleScientificFunc('log')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>log</button>
                <button onClick={() => handleScientificFunc('ln')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>ln</button>
                <button onClick={() => handleScientificFunc('square')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>x²</button>
                <button onClick={() => handleScientificFunc('cube')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>x³</button>

                <button onClick={() => handleOperator('^')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>xʸ</button>
                <button onClick={() => handleScientificFunc('inv')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>1/x</button>
                <button onClick={() => handleScientificFunc('pi')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>π</button>
                <button onClick={() => handleScientificFunc('e')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>e</button>

                <button onClick={() => handleScientificFunc('factorial')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>n!</button>
                <button onClick={() => handleScientificFunc('abs')} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>|x|</button>
                <button onClick={memoryRecall} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>MR</button>
                <button onClick={memoryAdd} className={`p-3 rounded-xl text-xs font-bold border transition-all ${themeStyles.btnSci}`}>M+</button>
              </div>
            )}

            {/* Standard Keypad */}
            <div className={`${isScientific ? 'col-span-6' : 'col-span-4'} grid grid-cols-4 gap-2.5`}>
              <button onClick={clearAll} className={`p-3.5 rounded-2xl text-sm font-bold border transition-all ${themeStyles.btnAction}`}>AC</button>
              <button onClick={clearEntry} className={`p-3.5 rounded-2xl text-sm font-bold border transition-all ${themeStyles.btnAction}`}>CE</button>
              <button onClick={handleBackspace} className={`p-3.5 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center ${themeStyles.btnAction}`} title="Backspace">
                <Delete className="w-4 h-4" />
              </button>
              <button onClick={() => handleOperator('÷')} className={`p-3.5 rounded-2xl text-base font-bold border transition-all ${themeStyles.btnOp}`}>÷</button>

              <button onClick={() => inputDigit('7')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>7</button>
              <button onClick={() => inputDigit('8')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>8</button>
              <button onClick={() => inputDigit('9')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>9</button>
              <button onClick={() => handleOperator('×')} className={`p-3.5 rounded-2xl text-base font-bold border transition-all ${themeStyles.btnOp}`}>×</button>

              <button onClick={() => inputDigit('4')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>4</button>
              <button onClick={() => inputDigit('5')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>5</button>
              <button onClick={() => inputDigit('6')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>6</button>
              <button onClick={() => handleOperator('-')} className={`p-3.5 rounded-2xl text-base font-bold border transition-all ${themeStyles.btnOp}`}>−</button>

              <button onClick={() => inputDigit('1')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>1</button>
              <button onClick={() => inputDigit('2')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>2</button>
              <button onClick={() => inputDigit('3')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>3</button>
              <button onClick={() => handleOperator('+')} className={`p-3.5 rounded-2xl text-base font-bold border transition-all ${themeStyles.btnOp}`}>+</button>

              <button onClick={() => handleScientificFunc('negate')} className={`p-3.5 rounded-2xl text-sm font-bold border transition-all ${themeStyles.btnNum}`}>±</button>
              <button onClick={() => inputDigit('0')} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>0</button>
              <button onClick={inputDecimal} className={`p-3.5 rounded-2xl text-lg font-bold border transition-all ${themeStyles.btnNum}`}>.</button>
              <button onClick={handleEquals} className={`p-3.5 rounded-2xl text-lg font-extrabold border transition-all ${themeStyles.btnOp}`}>=</button>
            </div>

          </div>

        </div>

        {/* Calculation History Panel (Collapsible Drawer) */}
        {historyOpen && (
          <div className={`w-full lg:w-80 h-[540px] rounded-3xl p-5 border flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-right-4 ${themeStyles.panel}`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <h2 className="font-bold text-sm tracking-tight">Calculation History</h2>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* History Items list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                  <RotateCcw className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs font-medium">No past calculations yet.</p>
                  <p className="text-[10px] mt-1">Your solved expressions will appear here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setDisplay(item.result);
                      setWaitingForOperand(true);
                    }}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between text-[11px] opacity-60 mb-1">
                      <span>{item.timestamp}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-amber-400 font-semibold transition-all">Reuse</span>
                    </div>
                    <div className="font-mono text-xs opacity-80 truncate">{item.expression}</div>
                    <div className="font-mono text-sm font-bold mt-0.5 tracking-tight">= {item.result}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${themeStyles.panel}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">Calculator Help &amp; Shortcuts</h3>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs opacity-90">
              <div>
                <h4 className="font-bold text-amber-400 mb-1.5 uppercase tracking-wider text-[10px]">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-white/5 flex justify-between"><span className="opacity-70">Numbers</span><code className="font-mono">0 - 9</code></div>
                  <div className="p-2 rounded-xl bg-white/5 flex justify-between"><span className="opacity-70">Operators</span><code className="font-mono">+ - * /</code></div>
                  <div className="p-2 rounded-xl bg-white/5 flex justify-between"><span className="opacity-70">Calculate</span><code className="font-mono">Enter / =</code></div>
                  <div className="p-2 rounded-xl bg-white/5 flex justify-between"><span className="opacity-70">Delete</span><code className="font-mono">Backspace</code></div>
                  <div className="p-2 rounded-xl bg-white/5 flex justify-between"><span className="opacity-70">Clear All</span><code className="font-mono">Esc</code></div>
                  <div className="p-2 rounded-xl bg-white/5 flex justify-between"><span className="opacity-70">Decimal</span><code className="font-mono">.</code></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-amber-400 mb-1.5 uppercase tracking-wider text-[10px]">Features</h4>
                <p className="leading-relaxed opacity-80">
                  NexusCalc Pro features a fully integrated scientific mode, angle mode toggle (DEG/RAD), audio feedback clicks, persistent history drawer, and customizable glassmorphism themes.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Professional Footer */}
      <footer className="w-full max-w-5xl mt-12 pt-8 pb-6 border-t border-white/10 z-10 text-xs text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/20">
                <CalcIcon className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight">NexusCalc Pro</span>
            </div>
            <p className="opacity-60 text-[11px] leading-relaxed">
              High-performance scientific calculator built with Next.js 15, React 19, and Tailwind CSS. Precision math in your browser.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all text-opacity-70 hover:text-opacity-100"
                aria-label="GitHub Repository"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all text-opacity-70 hover:text-opacity-100"
                aria-label="X (Twitter)"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all text-opacity-70 hover:text-opacity-100"
                aria-label="LinkedIn Profile"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[10px] tracking-widest uppercase opacity-80 flex items-center gap-1.5 text-amber-400">
              <Layers className="w-3.5 h-3.5" /> Modules
            </h4>
            <ul className="space-y-1.5 opacity-70 text-[11px]">
              <li><button onClick={() => setIsScientific(false)} className="hover:opacity-100 transition-opacity">Standard Calculator</button></li>
              <li><button onClick={() => setIsScientific(true)} className="hover:opacity-100 transition-opacity">Scientific Calculator</button></li>
              <li><button onClick={() => setHistoryOpen(true)} className="hover:opacity-100 transition-opacity">Calculation History</button></li>
              <li><button onClick={() => setHelpOpen(true)} className="hover:opacity-100 transition-opacity">Keyboard Shortcuts</button></li>
            </ul>
          </div>

          {/* Technology Stack */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[10px] tracking-widest uppercase opacity-80 flex items-center gap-1.5 text-amber-400">
              <Cpu className="w-3.5 h-3.5" /> Tech Stack
            </h4>
            <ul className="space-y-1.5 opacity-70 text-[11px]">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Next.js 15 App Router</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> React 19 &amp; TypeScript</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Tailwind CSS v4</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Web Audio API &amp; Lucide Icons</li>
            </ul>
          </div>

          {/* Legal & Status */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[10px] tracking-widest uppercase opacity-80 flex items-center gap-1.5 text-amber-400">
              <Shield className="w-3.5 h-3.5" /> System Status
            </h4>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="opacity-70 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Engine</span>
                <span className="text-emerald-400 font-bold">Operational</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="opacity-70">Sound Engine</span>
                <span className={soundEnabled ? 'text-cyan-400 font-semibold' : 'opacity-50'}>{soundEnabled ? 'Active' : 'Muted'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="opacity-70">Theme</span>
                <span className="capitalize font-semibold text-amber-400">{theme}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & credits bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] opacity-60">
          <p>© {currentYear} NexusCalc Pro. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              crafted by Jaden with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
