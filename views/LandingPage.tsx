import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowUpRight,
    BarChart3,
    BookOpenText,
    Brain,
    Check,
    CircleAlert,
    GraduationCap,
    Headphones,
    Languages,
    Loader2,
    Mic,
    PenLine,
    Repeat,
    Sparkles,
    Target,
    Zap,
} from 'lucide-react';
import { signInWithGoogle } from '../services/supabaseClient';

interface LandingPageProps {
    onGetStarted: () => void;
    /** Starts Google sign-in; injectable for previews and tests. */
    onGoogle?: () => Promise<unknown>;
}

/* ──────────────────────────────────────────────────────────────────────────
   Audio Synthesizer for Mechanical Keycap Click (Web Audio API)
   ────────────────────────────────────────────────────────────────────────── */
function playKeySound(freq = 600) {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch {
        // Audio might be blocked before first gesture, ignore gracefully
    }
}

/* ──────────────────────────────────────────────────────────────────────────
   Isometric Emotion Keycap Data
   ────────────────────────────────────────────────────────────────────────── */
type EmotionType = 'excited' | 'cool' | 'nerd' | 'determined' | 'happy' | 'talking' | 'headphone' | 'surprised' | 'writer';

interface KeycapDef {
    id: string;
    label: string;
    emotion: EmotionType;
    word: string;
    meaning: string;
    topColor: string;
    sideColor: string;
    textColor: string;
    glowColor: string;
    x: number;
    y: number;
    w: number;
    h: number;
    animClass: string;
}

const HERO_KEYCAPS: KeycapDef[] = [
    {
        id: 'k-o',
        label: 'O',
        emotion: 'excited',
        word: 'Opportunity',
        meaning: 'Cơ hội vươn ra toàn cầu',
        topColor: '#FF6B2C',
        sideColor: '#D94D12',
        textColor: '#FFFFFF',
        glowColor: 'rgba(255, 107, 44, 0.45)',
        x: 155,
        y: 50,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-1',
    },
    {
        id: 'k-code',
        label: '</>',
        emotion: 'cool',
        word: 'AI-Engine',
        meaning: 'Gemini 2.5 Pro hỗ trợ 24/7',
        topColor: '#FFFFFF',
        sideColor: '#CBD5E1',
        textColor: '#0F172A',
        glowColor: 'rgba(255, 255, 255, 0.65)',
        x: 275,
        y: 45,
        w: 125,
        h: 96,
        animClass: 'anim-keycap-2',
    },
    {
        id: 'k-v',
        label: 'V',
        emotion: 'nerd',
        word: 'Vocabulary',
        meaning: 'Kho 5.000+ từ vựng học thuật',
        topColor: '#C084FC',
        sideColor: '#9333EA',
        textColor: '#FFFFFF',
        glowColor: 'rgba(192, 132, 252, 0.45)',
        x: 95,
        y: 155,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-3',
    },
    {
        id: 'k-e',
        label: 'E',
        emotion: 'determined',
        word: 'Excellence',
        meaning: 'Đạt band điểm IELTS mục tiêu',
        topColor: '#818CF8',
        sideColor: '#4F46E5',
        textColor: '#FFFFFF',
        glowColor: 'rgba(129, 140, 248, 0.45)',
        x: 215,
        y: 150,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-1',
    },
    {
        id: 'k-r',
        label: 'R',
        emotion: 'happy',
        word: 'Retention',
        meaning: 'Ghi nhớ dài hạn với SM-2',
        topColor: '#34D399',
        sideColor: '#059669',
        textColor: '#FFFFFF',
        glowColor: 'rgba(52, 211, 153, 0.45)',
        x: 335,
        y: 145,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-2',
    },
    {
        id: 'k-f',
        label: 'F',
        emotion: 'talking',
        word: 'Fluency',
        meaning: 'Giao tiếp & phản xạ tự nhiên',
        topColor: '#38BDF8',
        sideColor: '#0284C7',
        textColor: '#FFFFFF',
        glowColor: 'rgba(56, 189, 248, 0.45)',
        x: 65,
        y: 265,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-2',
    },
    {
        id: 'k-l',
        label: 'L',
        emotion: 'headphone',
        word: 'Listening',
        meaning: '4 Parts luyện nghe kèm Audio',
        topColor: '#FACC15',
        sideColor: '#CA8A04',
        textColor: '#0F172A',
        glowColor: 'rgba(250, 204, 21, 0.5)',
        x: 180,
        y: 260,
        w: 105,
        h: 96,
        animClass: 'anim-keycap-3',
    },
    {
        id: 'k-o2',
        label: 'O',
        emotion: 'surprised',
        word: 'Original',
        meaning: 'Đề tự sinh mới 100% không trùng lặp',
        topColor: '#FB923C',
        sideColor: '#EA580C',
        textColor: '#FFFFFF',
        glowColor: 'rgba(251, 146, 60, 0.45)',
        x: 305,
        y: 255,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-1',
    },
    {
        id: 'k-w',
        label: 'W',
        emotion: 'writer',
        word: 'Writing',
        meaning: 'Chấm 4 tiêu chí Task 1 & 2',
        topColor: '#F472B6',
        sideColor: '#DB2777',
        textColor: '#FFFFFF',
        glowColor: 'rgba(244, 114, 182, 0.45)',
        x: 405,
        y: 300,
        w: 96,
        h: 96,
        animClass: 'anim-keycap-2',
    },
];

/**
 * Render Emotion Face on Keycap Top Surface with Interactive Reactions
 */
function EmotionFace({
    emotion,
    isHovered,
    textColor,
}: {
    emotion: EmotionType;
    isHovered: boolean;
    textColor: string;
}) {
    switch (emotion) {
        case 'excited': // 🤩 Star Eyes & Big Smile
            return (
                <g transform="translate(48, 52)">
                    {/* Eyes */}
                    {isHovered ? (
                        <g fill="#FFDF00" stroke="#0F172A" strokeWidth="1.5">
                            <polygon points="-16,-4 -13,2 -7,2 -11,6 -9,12 -15,8 -20,12 -18,6 -23,2 -16,2" />
                            <polygon points="16,-4 19,2 25,2 21,6 23,12 17,8 12,12 14,6 9,2 16,2" />
                        </g>
                    ) : (
                        <g fill={textColor} className="anim-emotion-blink">
                            <circle cx="-16" cy="0" r="4" />
                            <circle cx="16" cy="0" r="4" />
                        </g>
                    )}
                    {/* Cheeks */}
                    <circle cx="-22" cy="7" r="4.5" fill="#FDA4AF" opacity="0.8" />
                    <circle cx="22" cy="7" r="4.5" fill="#FDA4AF" opacity="0.8" />
                    {/* Big Smile */}
                    <path
                        d="M -12 7 Q 0 20 12 7 Z"
                        fill={isHovered ? '#FFFFFF' : textColor}
                        stroke="#0F172A"
                        strokeWidth="1.5"
                    />
                </g>
            );

        case 'cool': // 😎 Sunglasses Hacker Face
            return (
                <g transform="translate(62, 52)">
                    {/* Sunglasses */}
                    <path
                        d="M -30 -6 Q -15 -10 0 -6 Q 15 -10 30 -6 L 26 8 Q 15 12 2 8 L 0 4 L -2 8 Q -15 12 -26 8 Z"
                        fill="#0F172A"
                    />
                    {/* Glasses Reflection */}
                    <line x1="-22" y1="-3" x2="-8" y2="4" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="-3" x2="22" y2="4" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                    {/* Smirk Smile */}
                    <path
                        d="M -6 14 Q 8 20 16 10"
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                </g>
            );

        case 'nerd': // 🧐 Monocle / Knowledge Glasses
            return (
                <g transform="translate(48, 52)">
                    {/* Eyeglasses */}
                    <circle cx="-15" cy="0" r="8" fill="none" stroke={textColor} strokeWidth="2" />
                    <circle cx="15" cy="0" r="8" fill="none" stroke={textColor} strokeWidth="2" />
                    <line x1="-7" y1="0" x2="7" y2="0" stroke={textColor} strokeWidth="2" />
                    {/* Pupils */}
                    <circle cx={isHovered ? -13 : -15} cy="0" r="3" fill={textColor} />
                    <circle cx={isHovered ? 17 : 15} cy="0" r="3" fill={textColor} />
                    {/* Friendly Smile */}
                    <path d="M -8 10 Q 0 16 8 10" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" />
                </g>
            );

        case 'determined': // 😤 Confident Warrior
            return (
                <g transform="translate(48, 52)">
                    {/* Eyebrows */}
                    <line x1="-20" y1="-6" x2="-10" y2="-2" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="20" y1="-6" x2="10" y2="-2" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    {/* Eyes */}
                    <circle cx="-14" cy="2" r="3.5" fill={textColor} className="anim-emotion-blink" />
                    <circle cx="14" cy="2" r="3.5" fill={textColor} className="anim-emotion-blink" />
                    {/* Cheeks */}
                    <circle cx="-20" cy="7" r="4" fill="#FECDD3" opacity="0.9" />
                    <circle cx="20" cy="7" r="4" fill="#FECDD3" opacity="0.9" />
                    {/* Wide Confident Mouth */}
                    <path d="M -10 10 Q 0 18 10 10" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                </g>
            );

        case 'happy': // 😊 Happy Crescent Eyes & Rosy Cheeks
            return (
                <g transform="translate(48, 52)">
                    {/* Crescent Eyes */}
                    <path d="M -20 2 Q -14 -6 -8 2" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 8 2 Q 14 -6 20 2" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    {/* Rosy Cheeks */}
                    <circle cx="-20" cy="7" r="5" fill="#F472B6" opacity="0.85" />
                    <circle cx="20" cy="7" r="5" fill="#F472B6" opacity="0.85" />
                    {/* Warm Smile */}
                    <path d="M -10 9 Q 0 20 10 9" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                </g>
            );

        case 'talking': // 🗣️ Fluent Talking Face
            return (
                <g transform="translate(48, 52)">
                    {/* Big Eyes */}
                    <circle cx="-15" cy="0" r="4.5" fill={textColor} className="anim-emotion-blink" />
                    <circle cx="15" cy="0" r="4.5" fill={textColor} className="anim-emotion-blink" />
                    {/* Talking Mouth */}
                    {isHovered ? (
                        <ellipse cx="0" cy="12" rx="7" ry="9" fill={textColor} stroke="#0F172A" strokeWidth="1.5" />
                    ) : (
                        <ellipse cx="0" cy="11" rx="6" ry="6" fill={textColor} />
                    )}
                </g>
            );

        case 'headphone': // 🎧 Headphone Music Jam
            return (
                <g transform="translate(52, 52)">
                    {/* Headphone Band */}
                    <path d="M -26 2 A 26 26 0 0 1 26 2" fill="none" stroke="#0F172A" strokeWidth="4" />
                    {/* Earcups */}
                    <rect x="-30" y="-3" width="8" height="14" rx="4" fill="#0F172A" />
                    <rect x="22" y="-3" width="8" height="14" rx="4" fill="#0F172A" />
                    {/* Enjoying Closed Eyes */}
                    <path d="M -16 3 Q -10 -2 -4 3" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 4 3 Q 10 -2 16 3" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    {/* Whistle Smile */}
                    <path d="M -6 11 Q 0 18 6 11" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                </g>
            );

        case 'surprised': // 😲 Wow / Original Discovery
            return (
                <g transform="translate(48, 52)">
                    {/* Wide Open Eyes */}
                    <circle cx="-14" cy="0" r="5" fill="#FFFFFF" stroke={textColor} strokeWidth="2" />
                    <circle cx="-14" cy="0" r="2.5" fill={textColor} />
                    <circle cx="14" cy="0" r="5" fill="#FFFFFF" stroke={textColor} strokeWidth="2" />
                    <circle cx="14" cy="0" r="2.5" fill={textColor} />
                    {/* Surprised O-Mouth */}
                    <circle cx="0" cy="13" r={isHovered ? 7 : 5} fill={textColor} />
                </g>
            );

        case 'writer': // ✍️ Writer Creator Face
            return (
                <g transform="translate(48, 52)">
                    {/* Wink / Creative Eye */}
                    <path d="M -18 2 Q -12 -4 -6 2" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="14" cy="1" r="4.5" fill={textColor} />
                    {/* Cheeks */}
                    <circle cx="-18" cy="8" r="4" fill="#FDA4AF" opacity="0.9" />
                    <circle cx="18" cy="8" r="4" fill="#FDA4AF" opacity="0.9" />
                    {/* Gentle Smile */}
                    <path d="M -8 11 Q 0 18 8 11" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" />
                </g>
            );
    }
}

/**
 * Interactive 3D Isometric Keycap with Animated Emotion Face & Physical Click
 */
function IsometricEmotionKeycap({
    def,
    isPressed,
    onClick,
    onHover,
}: {
    def: KeycapDef;
    isPressed: boolean;
    onClick: () => void;
    onHover: (hovering: boolean) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <g
            className={`cursor-pointer select-none transition-all duration-200 group ${def.animClass}`}
            style={{
                transform: isPressed
                    ? `translate(${def.x}px, ${def.y + 12}px)`
                    : isHovered
                    ? `translate(${def.x}px, ${def.y - 6}px) scale(1.06)`
                    : `translate(${def.x}px, ${def.y}px)`,
                transformOrigin: `${def.x + def.w / 2}px ${def.y + def.h / 2}px`,
                filter: isHovered ? `drop-shadow(0 0 16px ${def.glowColor})` : 'none',
            }}
            onClick={onClick}
            onMouseEnter={() => {
                setIsHovered(true);
                onHover(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                onHover(false);
            }}
            role="button"
            tabIndex={0}
            aria-label={`Key ${def.label} (${def.word}): ${def.meaning}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* Hard Drop Shadow on Blueprint Grid */}
            <rect
                x={8}
                y={def.h - 6}
                width={def.w}
                height={22}
                rx={20}
                fill="rgba(15, 23, 42, 0.45)"
            />

            {/* Front & Side 3D Extrusion (Thân phím 3D) */}
            <path
                d={`M 0,24 
                   Q 0,${def.h} 18,${def.h} 
                   L ${def.w - 18},${def.h} 
                   Q ${def.w},${def.h} ${def.w},${def.h - 20} 
                   L ${def.w},24 
                   Z`}
                fill={def.sideColor}
                stroke="#0F172A"
                strokeWidth={2.5}
                strokeLinejoin="round"
            />

            {/* Top Surface (Mặt trên của phím) */}
            <rect
                x={0}
                y={0}
                width={def.w}
                height={def.h - 18}
                rx={20}
                fill={def.topColor}
                stroke="#0F172A"
                strokeWidth={2.5}
                className="transition-colors duration-150"
            />

            {/* Gloss Highlight Edge */}
            <path
                d={`M 16,6 L ${def.w - 16},6`}
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth={2.5}
                strokeLinecap="round"
            />

            {/* Keycap Letter Label (Góc trên) */}
            <text
                x={18}
                y={24}
                textAnchor="start"
                fill={def.textColor}
                fontWeight="900"
                fontSize={def.label.length > 2 ? '15' : '18'}
                fontFamily="system-ui, -apple-system, sans-serif"
                className="pointer-events-none select-none tracking-tight opacity-95"
            >
                {def.label}
            </text>

            {/* Emotion Face Component */}
            <EmotionFace
                emotion={def.emotion}
                isHovered={isHovered}
                textColor={def.textColor}
            />
        </g>
    );
}

/**
 * Interactive 3D Isometric Keycaps Cluster with Moving Emotion Faces
 */
function HeroIsometricCluster() {
    const [pressedId, setPressedId] = useState<string | null>(null);
    const [activeWord, setActiveWord] = useState<{ word: string; meaning: string } | null>({
        word: 'Vocabulary',
        meaning: 'Khám phá thế giới từ vựng tiếng Anh với phím cơ Emotion tương tác',
    });

    const handleKeyClick = (def: KeycapDef, freq = 600) => {
        playKeySound(freq);
        setPressedId(def.id);
        setActiveWord({ word: def.word, meaning: def.meaning });
        setTimeout(() => setPressedId(null), 180);
    };

    return (
        <div className="relative mx-auto w-full max-w-[560px] select-none">
            {/* Live Keycap Tooltip / Status Display */}
            {activeWord && (
                <div className="absolute -top-6 right-2 sm:right-6 z-20 flex items-center gap-2.5 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 shadow-neo dark:border-slate-700 dark:bg-slate-900 anim-scale-in">
                    <span className="flex h-3 w-3 animate-ping rounded-full bg-emerald-500" />
                    <div>
                        <span className="font-mono text-xs font-bold uppercase text-blue-600 dark:text-sky-400">
                            {activeWord.word}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{activeWord.meaning}</p>
                    </div>
                </div>
            )}

            {/* Main Isometric SVG Canvas */}
            <svg
                viewBox="0 0 540 450"
                className="h-auto w-full overflow-visible"
                style={{ filter: 'drop-shadow(0 14px 28px rgba(15, 23, 42, 0.1))' }}
            >
                {/* Blueprint grid guide */}
                <defs>
                    <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                        <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#2563EB" strokeWidth="0.8" strokeOpacity="0.25" />
                    </pattern>
                </defs>

                <rect x="20" y="20" width="500" height="400" rx="24" fill="url(#hero-grid)" opacity="0.6" />

                {/* 3D Emotion Keycaps */}
                {HERO_KEYCAPS.map((k, index) => (
                    <IsometricEmotionKeycap
                        key={k.id}
                        def={k}
                        isPressed={pressedId === k.id}
                        onClick={() => handleKeyClick(k, 480 + index * 40)}
                        onHover={(hovering) => {
                            if (hovering) {
                                setActiveWord({ word: k.word, meaning: k.meaning });
                            }
                        }}
                    />
                ))}

                {/* 3D Floating Speech Bubble (Góc trái dưới) */}
                <g className="anim-float" style={{ transform: 'translate(35px, 345px)' }}>
                    <rect x="6" y="6" width="130" height="42" rx="21" fill="rgba(15, 23, 42, 0.35)" />
                    <path
                        d="M 0,21 Q 0,48 21,48 L 109,48 Q 130,48 130,27 L 130,21 Z"
                        fill="#A855F7"
                        stroke="#0F172A"
                        strokeWidth="2.5"
                    />
                    <rect x="0" y="0" width="130" height="42" rx="21" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
                    <circle cx="44" cy="21" r="5" fill="#0F172A" className="anim-speech-dot-1" />
                    <circle cx="65" cy="21" r="5" fill="#0F172A" className="anim-speech-dot-2" />
                    <circle cx="86" cy="21" r="5" fill="#0F172A" className="anim-speech-dot-3" />
                </g>

                {/* 3D Isometric Floating Cursor (Mũi tên chỉ chuột góc trung tâm) */}
                <g className="anim-float" style={{ transform: 'translate(265px, 185px)', animationDelay: '1.2s' }}>
                    <path
                        d="M 12 12 L 34 34 L 24 38 L 30 52 L 20 56 L 14 42 L 4 48 Z"
                        fill="rgba(15, 23, 42, 0.45)"
                    />
                    <path
                        d="M 0 0 L 26 26 L 14 30 L 22 46 L 12 50 L 4 34 L -8 40 Z"
                        fill="#FFFFFF"
                        stroke="#0F172A"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M 3 6 L 19 22 L 10 25 L 16 38 L 11 40 L 4 28 L -3 33 Z"
                        fill="#38BDF8"
                    />
                </g>

                {/* Isometric Space/Enter Bar with Emotion Flame */}
                <g
                    className="cursor-pointer group anim-keycap-3"
                    style={{ transform: 'translate(315px, 365px)' }}
                    onClick={() => {
                        playKeySound(320);
                        setActiveWord({
                            word: 'Spaced Repetition',
                            meaning: 'Thuật toán nhắc ôn tập đúng thời điểm vàng chống quên từ',
                        });
                    }}
                >
                    <rect x="6" y="6" width="125" height="28" rx="8" fill="rgba(15, 23, 42, 0.35)" />
                    <path d="M 0,14 L 0,28 L 125,28 L 125,14 Z" fill="#D97706" stroke="#0F172A" strokeWidth="2.5" />
                    <rect x="0" y="0" width="125" height="20" rx="8" fill="#FBBF24" stroke="#0F172A" strokeWidth="2.5" />
                    <text
                        x="62"
                        y="15"
                        textAnchor="middle"
                        fill="#0F172A"
                        fontWeight="900"
                        fontSize="11"
                        fontFamily="monospace"
                        className="tracking-wider"
                    >
                        🔥 SM-2 SPACEBAR
                    </text>
                </g>
            </svg>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   RollText Component for Navbar Dock (Fixes duplicate text bug)
   ────────────────────────────────────────────────────────────────────────── */
function RollText({ text }: { text: string }) {
    return (
        <span className="inline-flex h-[1.3em] overflow-hidden flex-col justify-start leading-[1.3em] select-none pointer-events-none">
            <span className="transition-transform duration-300 ease-[cubic-bezier(0.15,0.5,0.05,1)] group-hover:-translate-y-full">
                {text}
            </span>
            <span className="transition-transform duration-300 ease-[cubic-bezier(0.15,0.5,0.05,1)] group-hover:-translate-y-full" aria-hidden="true">
                {text}
            </span>
        </span>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Marquee 3D Items Data (Using real transparent 3D icons from public/)
   ────────────────────────────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
    { text: 'IELTS LISTENING 4 PARTS', icon: '/listening-3d.png' },
    { text: 'READING 12 DẠNG ACADEMIC', icon: '/reading-3d.png' },
    { text: 'WRITING TASK 1 & 2 CHẤM THEO 4 TIÊU CHÍ', icon: '/writing-3d.png' },
    { text: 'SPEAKING GHI ÂM CHẤM BAND', icon: '/speaking-3d.png' },
    { text: 'STREAK FLAME HỌC MỖI NGÀY', icon: '/streak-flame.png' },
    { text: 'SPACED REPETITION SM-2', icon: '/review-refresh.png' },
    { text: 'KHO 5.000+ TỪ VỰNG HỌC THUẬT', icon: '/vocabulary-trophy.png' },
    { text: 'GEMINI 2.5 AI ENGINE', icon: '/glossy-ai-bubble.png' },
    { text: 'VOCABMASTER 2026', icon: '/app-logo.png' },
];

/* ──────────────────────────────────────────────────────────────────────────
   Bento Grid Skill Cards
   ────────────────────────────────────────────────────────────────────────── */
interface SkillCardProps {
    title: string;
    subtitle: string;
    badge: string;
    iconSrc: string;
    features: string[];
    accentColor: string;
    bgColor: string;
    badgeColor: string;
}

const SKILL_CARDS: SkillCardProps[] = [
    {
        title: 'Listening',
        subtitle: 'Luyện nghe phản xạ 4 Part chuẩn format đề thật',
        badge: 'Audio AI',
        iconSrc: '/listening-3d.png',
        features: ['Chấm band điểm tức thì theo từng câu', 'Chép chính tả từng câu (Dictation Mode)', 'Đề nghe theo chủ đề từ vựng bạn học'],
        accentColor: '#2563EB',
        bgColor: '#EFF6FF',
        badgeColor: '#DBEAFE',
    },
    {
        title: 'Reading',
        subtitle: '12 dạng câu hỏi Academic với giải thích chi tiết',
        badge: 'Tra cứu 1-chạm',
        iconSrc: '/reading-3d.png',
        features: ['Đầy đủ dạng T/F/NG, Matching, Completion', 'Chỉ rõ vị trí dẫn chứng & bẫy từ vựng', 'Bấm vào bất kỳ từ nào để xem nghĩa và lưu sổ'],
        accentColor: '#059669',
        bgColor: '#ECFDF5',
        badgeColor: '#D1FAE5',
    },
    {
        title: 'Writing',
        subtitle: 'Chấm Task 1 & Task 2 theo 4 tiêu chí giám khảo',
        badge: 'Chấm 4 tiêu chí',
        iconSrc: '/writing-3d.png',
        features: ['Chữa ngữ pháp & nâng cấp từ vựng C1/C2', 'Đếm ngược thời gian như phòng thi thật', 'Lưu nháp tự động và theo dõi lịch sử band'],
        accentColor: '#9333EA',
        bgColor: '#FAF5FF',
        badgeColor: '#F3E8FF',
    },
    {
        title: 'Speaking',
        subtitle: 'Phân tích phát âm, độ trôi chảy & từ vựng',
        badge: 'Ghi âm & Đánh giá',
        iconSrc: '/speaking-3d.png',
        features: ['Ghi âm trực tiếp và chấm điểm từng part', 'Nhận xét chi tiết bằng tiếng Việt dễ hiểu', 'Gợi ý ý tưởng & từ nối tự nhiên cho Part 2/3'],
        accentColor: '#EA580C',
        bgColor: '#FFF7ED',
        badgeColor: '#FFEDD5',
    },
];

/* ──────────────────────────────────────────────────────────────────────────
   FAQ Data
   ────────────────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
    {
        q: 'VocabMaster có thực sự miễn phí không?',
        a: 'Có! Bạn có thể sử dụng tất cả tính năng tạo flashcard bằng Gemini AI, ôn tập Spaced Repetition và phòng luyện thi IELTS 4 kỹ năng hoàn toàn miễn phí mà không cần thẻ tín dụng.',
    },
    {
        q: 'Thuật toán Spaced Repetition SM-2 hoạt động như thế nào?',
        a: 'Hệ thống tự động tính toán thời điểm bạn sắp quên từ vựng dựa trên mức độ dễ/khó bạn đánh giá khi học. Nhờ đó, bạn ôn ít hơn nhưng nhớ từ vựng lâu hơn gấp 4 lần.',
    },
    {
        q: 'Đề thi IELTS và bài đọc có phải đề Cambridge bản quyền không?',
        a: 'Không. Toàn bộ đề đọc, đề nghe và bài viết đều được AI tự tạo nguyên bản (original content) theo chuẩn cấu trúc đề thi IELTS Academic, không sao chép từ bất kỳ sách xuất bản nào.',
    },
    {
        q: 'Tôi có thể học trên điện thoại hoặc cài đặt ứng dụng không?',
        a: 'Hoàn toàn được! VocabMaster là một Progressive Web App (PWA). Bạn có thể bấm "Thêm vào màn hình chính" (Add to Home Screen) trên iPhone hoặc Android để dùng như app độc lập.',
    },
];

/* ──────────────────────────────────────────────────────────────────────────
   Main LandingPage Component
   ────────────────────────────────────────────────────────────────────────── */
export const LandingPage: React.FC<LandingPageProps> = ({
    onGetStarted,
    onGoogle = signInWithGoogle,
}) => {
    const [googleBusy, setGoogleBusy] = useState(false);
    const [googleError, setGoogleError] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleGoogleAuth = async () => {
        setGoogleBusy(true);
        setGoogleError('');
        try {
            await onGoogle();
        } catch (err: any) {
            setGoogleError(err?.message || 'Chưa đăng nhập được với Google. Bạn thử lại nhé!');
            setGoogleBusy(false);
        }
    };

    const toggleFaq = (idx: number) => {
        setOpenFaq(openFaq === idx ? null : idx);
    };

    return (
        <div className="min-h-screen bg-blueprint-grid text-slate-900 selection:bg-blue-600 selection:text-white dark:text-white">
            {/* ─── Top Header: Sui Overflow Style ─── */}
            <header className="sticky top-0 z-40 border-b-2 border-slate-900 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    {/* Left Brand */}
                    <div className="flex items-center gap-3">
                        <img
                            src="/app-logo.png"
                            alt="VocabMaster Logo"
                            className="h-9 w-9 object-contain rounded-xl shadow-neo-sm border-2 border-slate-900 dark:border-slate-700"
                        />
                        <div className="flex flex-col">
                            <span className="font-black tracking-tight text-lg leading-none sm:text-xl">
                                VocabMaster <span className="text-blue-600 dark:text-sky-400">2026</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
                                AI-Powered English
                            </span>
                        </div>
                    </div>

                    {/* Middle Tag / Date Badge */}
                    <div className="hidden md:flex items-center gap-2 rounded-full border-2 border-slate-900 bg-blue-50 px-3 py-1 font-mono text-xs font-semibold text-blue-700 shadow-neo-sm dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300">
                        <span className="text-slate-400">&lt;engine&gt;</span>
                        <span>Gemini 2.5 + Spaced Repetition</span>
                        <span className="text-slate-400">&lt;/engine&gt;</span>
                    </div>

                    {/* Right CTAs */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onGetStarted}
                            className="hidden sm:inline-block font-mono text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-sky-400 px-3 py-2 transition-colors"
                        >
                            Đăng nhập
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-blue-600 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-slate-700"
                        >
                            <span>Bắt đầu ngay</span>
                            <ArrowUpRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ─── Hero Section with Blueprint Frame ─── */}
            <section className="relative px-4 pt-10 pb-16 sm:px-6 lg:pt-16 lg:pb-24">
                <div className="mx-auto max-w-7xl">
                    {/* Main Neo-Brutalist Frame Window */}
                    <div className="relative rounded-3xl border-2 border-slate-900 bg-white/95 p-6 shadow-neo-lg dark:border-slate-700 dark:bg-slate-900/95 sm:p-10 lg:p-12">
                        {/* Top Window Header */}
                        <div className="mb-8 flex items-center justify-between border-b-2 border-slate-900 pb-4 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full border border-slate-900 bg-red-400" />
                                <span className="h-3 w-3 rounded-full border border-slate-900 bg-yellow-400" />
                                <span className="h-3 w-3 rounded-full border border-slate-900 bg-emerald-400" />
                                <span className="ml-2 font-mono text-xs font-bold uppercase text-slate-500">
                                    VocabMaster Overflow 2026
                                </span>
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                                &lt;status&gt; Free · Unlimited AI &lt;/status&gt;
                            </div>
                        </div>

                        {/* Hero Content Grid */}
                        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1.1fr]">
                            {/* Left Headline */}
                            <div className="text-left">
                                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-yellow-300 px-3 py-1 font-mono text-xs font-extrabold uppercase text-slate-900 shadow-neo-sm">
                                    <Zap className="h-3.5 w-3.5 fill-slate-900" />
                                    <span>Phiên bản Mới 2026 · AI Gemini</span>
                                </div>

                                <h1 className="mb-6 font-black tracking-tighter text-slate-950 dark:text-white text-5xl sm:text-7xl lg:text-8xl leading-[0.9]">
                                    Vocab
                                    <span className="block text-blue-600 dark:text-sky-400">Master</span>
                                    <span className="block text-slate-800 dark:text-slate-200">2026</span>
                                </h1>

                                <p className="mb-8 max-w-xl text-base sm:text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    Nền tảng học từ vựng tiếng Anh thông minh và Luyện thi IELTS Academic 4 kỹ năng với AI. Nhấp vào các phím Emotion 3D để khám phá từ vựng và bắt đầu hành trình thành thạo tiếng Anh!
                                </p>

                                {/* Split Neo-Brutalist CTA Button */}
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="group inline-flex items-stretch rounded-xl border-2 border-slate-900 bg-slate-900 text-white shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-slate-600">
                                        <button
                                            onClick={onGetStarted}
                                            className="px-6 py-3.5 font-mono text-sm font-black uppercase tracking-wider transition-colors hover:text-yellow-300"
                                        >
                                            Bắt đầu học miễn phí
                                        </button>
                                        <div className="flex items-center justify-center border-l-2 border-slate-800 bg-blue-600 px-3.5 transition-colors group-hover:bg-blue-500">
                                            <ArrowUpRight className="h-5 w-5 transition-transform duration-200 group-hover:rotate-45" />
                                        </div>
                                    </div>

                                    {/* Google Auth Button */}
                                    <button
                                        onClick={handleGoogleAuth}
                                        disabled={googleBusy}
                                        className="inline-flex items-center gap-2.5 rounded-xl border-2 border-slate-900 bg-white px-5 py-3.5 font-mono text-sm font-bold text-slate-900 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    >
                                        {googleBusy ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        ) : (
                                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                                <path
                                                    fill="#4285F4"
                                                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                                                />
                                                <path
                                                    fill="#34A853"
                                                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                                                />
                                                <path
                                                    fill="#FBBC05"
                                                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                                                />
                                                <path
                                                    fill="#EA4335"
                                                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                                                />
                                            </svg>
                                        )}
                                        <span>Đăng nhập Google</span>
                                    </button>
                                </div>

                                {googleError && (
                                    <div className="mt-4 flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 p-2.5 font-mono text-xs text-red-700">
                                        <CircleAlert className="h-4 w-4 flex-shrink-0" />
                                        <span>{googleError}</span>
                                    </div>
                                )}

                                {/* Key Features Badges */}
                                <div className="mt-10 flex flex-wrap gap-2 pt-6 border-t-2 border-slate-100 dark:border-slate-800">
                                    {[
                                        { label: '6 Cấp độ CEFR (A1→C2)', color: 'bg-emerald-100 text-emerald-800' },
                                        { label: 'IELTS Academic 4 Kỹ năng', color: 'bg-purple-100 text-purple-800' },
                                        { label: 'Spaced Repetition SM-2', color: 'bg-blue-100 text-blue-800' },
                                        { label: 'Audio AI giọng chuẩn bản xứ', color: 'bg-amber-100 text-amber-800' },
                                    ].map((badge) => (
                                        <span
                                            key={badge.label}
                                            className={`rounded-md border border-slate-900/10 px-2.5 py-1 text-xs font-bold ${badge.color} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}
                                        >
                                            {badge.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Right Hero Visual: 3D Isometric Emotion Keycaps Cluster */}
                            <div className="relative">
                                <HeroIsometricCluster />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Infinite Marquee Ticker with 3D Icons (Transparent Backgrounds) ─── */}
            <div className="relative border-y-2 border-slate-900 bg-yellow-300 py-3 text-slate-950 overflow-hidden flex select-none dark:border-slate-700 dark:bg-yellow-400 shadow-neo-sm">
                <style>{`
                    @keyframes continuousMarqueeRun {
                        0% { transform: translate3d(0, 0, 0); }
                        100% { transform: translate3d(-50%, 0, 0); }
                    }
                    .marquee-auto-runner {
                        display: flex;
                        width: max-content;
                        will-change: transform;
                        animation: continuousMarqueeRun 25s linear infinite !important;
                    }
                `}</style>
                <div className="marquee-auto-runner">
                    {[0, 1].map((copyIndex) => (
                        <div key={copyIndex} className="flex items-center gap-10 whitespace-nowrap font-mono text-xs sm:text-sm font-black uppercase tracking-wider pr-10">
                            {MARQUEE_ITEMS.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-slate-900 font-bold opacity-60">✦</span>
                                    <img
                                        src={item.icon}
                                        alt=""
                                        className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0 transition-transform duration-200 hover:scale-125"
                                        draggable={false}
                                    />
                                    <span className="font-extrabold">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── IELTS 4 Kỹ Năng: Bento Grid ─── */}
            <section id="ielts" className="px-4 py-20 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-14 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-purple-100 px-4 py-1 font-mono text-xs font-bold uppercase text-purple-900 shadow-neo-sm dark:bg-slate-800 dark:text-purple-300">
                            <GraduationCap className="h-4 w-4" />
                            <span>IELTS Academic Hub</span>
                        </div>
                        <h2 className="mt-4 font-black tracking-tight text-3xl sm:text-5xl text-slate-900 dark:text-white">
                            Luyện Đủ <span className="text-purple-600 dark:text-purple-400">4 Kỹ Năng</span> Chuẩn Format
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300 font-medium">
                            Đề thi độc quyền do Gemini AI biên soạn mới 100%, có phân tích lỗi sai và ước tính band điểm theo thang điểm chuẩn quốc tế.
                        </p>
                    </div>

                    {/* Bento Grid 4 Cards */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {SKILL_CARDS.map((card) => {
                            return (
                                <div
                                    key={card.title}
                                    className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div>
                                        {/* Card Top 3D Icon & Badge */}
                                        <div className="mb-5 flex items-center justify-between">
                                            <div
                                                className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-slate-900 shadow-neo-sm p-2 transition-transform duration-200 group-hover:scale-110"
                                                style={{ backgroundColor: card.bgColor }}
                                            >
                                                <img
                                                    src={card.iconSrc}
                                                    alt={card.title}
                                                    className="h-full w-full object-contain"
                                                    draggable={false}
                                                />
                                            </div>
                                            <span
                                                className="rounded-md border border-slate-900/10 px-2 py-0.5 font-mono text-[11px] font-bold"
                                                style={{ backgroundColor: card.badgeColor, color: card.accentColor }}
                                            >
                                                {card.badge}
                                            </span>
                                        </div>

                                        <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                            {card.title}
                                        </h3>
                                        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {card.subtitle}
                                        </p>

                                        {/* Feature checklist */}
                                        <ul className="space-y-2.5 border-t-2 border-slate-100 pt-5 dark:border-slate-800">
                                            {card.features.map((feat, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                                                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                                                    </span>
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Action button inside card */}
                                    <button
                                        onClick={onGetStarted}
                                        className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-slate-900 bg-slate-50 py-2.5 font-mono text-xs font-bold uppercase transition-colors group-hover:bg-slate-900 group-hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:group-hover:bg-blue-600"
                                    >
                                        <span>Luyện ngay</span>
                                        <ArrowUpRight className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── Spaced Repetition & Features Grid ─── */}
            <section id="features" className="border-t-2 border-slate-900 bg-white/70 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-14 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-emerald-100 px-4 py-1 font-mono text-xs font-bold uppercase text-emerald-900 shadow-neo-sm dark:bg-slate-800 dark:text-emerald-300">
                            <Brain className="h-4 w-4" />
                            <span>Trí nhớ siêu tốc</span>
                        </div>
                        <h2 className="mt-4 font-black tracking-tight text-3xl sm:text-5xl text-slate-900 dark:text-white">
                            Hệ Thống Học Từ Vựng <span className="text-emerald-600 dark:text-emerald-400">Toàn Diện</span>
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300 font-medium">
                            Từ nhập từ vựng đến khi ghi nhớ vĩnh viễn, thuật toán Spaced Repetition nhắc bạn đúng thời điểm vàng trước khi quên.
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                iconSrc: '/review-refresh.png',
                                title: 'Spaced Repetition SM-2',
                                desc: 'Thuật toán lặp lại ngắt quãng tính toán chính xác chu kỳ ôn tập, giảm 80% thời gian học mà nhớ từ lâu gấp 4 lần.',
                                color: 'bg-blue-100',
                            },
                            {
                                iconSrc: '/sach-mo-lap-lanh-pastel-3d.png',
                                title: 'Smart 3D Flashcards',
                                desc: 'Thẻ từ lật 2 mặt kèm IPA, định nghĩa, ví dụ sinh động và audio phát âm chuẩn bản xứ.',
                                color: 'bg-purple-100',
                            },
                            {
                                iconSrc: '/glossy-ai-bubble.png',
                                title: 'Story Mode + Audio AI',
                                desc: 'AI tự động dệt nên câu chuyện thú vị chứa các từ vựng bạn đang học, vừa nghe vừa đọc để nhớ từ trong ngữ cảnh.',
                                color: 'bg-pink-100',
                            },
                            {
                                iconSrc: '/streak-flame.png',
                                title: 'Quiz & Điền Khuyết',
                                desc: 'Bộ câu hỏi trắc nghiệm và điền từ vào câu thực tế giúp bạn củng cố kiến thức trước khi hoàn thành bài học.',
                                color: 'bg-amber-100',
                            },
                            {
                                iconSrc: '/vocabulary-trophy.png',
                                title: 'Thống Kê Heatmap Tiến Độ',
                                desc: 'Biểu đồ hoạt động hàng ngày, chuỗi ngày học streak flame 🔥 và đo lường độ thành thạo từng từ vựng.',
                                color: 'bg-emerald-100',
                            },
                            {
                                iconSrc: '/app-logo.png',
                                title: 'Giải Thích 100% Tiếng Việt',
                                desc: 'Mọi điểm ngữ pháp, lỗi sai phát âm hay phân tích bài viết IELTS đều được dịch nghĩa và giải thích bằng tiếng Việt.',
                                color: 'bg-sky-100',
                            },
                        ].map((item) => {
                            return (
                                <div
                                    key={item.title}
                                    className="group rounded-2xl border-2 border-slate-900 bg-white p-7 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-slate-900 ${item.color} shadow-neo-sm p-2 transition-transform duration-200 group-hover:scale-110`}>
                                        <img src={item.iconSrc} alt="" className="h-full w-full object-contain" draggable={false} />
                                    </div>
                                    <h3 className="mb-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                        {item.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── 3 Bước Học: Neo-Brutalist Step Cards ─── */}
            <section id="steps" className="px-4 py-20 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-14 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-yellow-200 px-4 py-1 font-mono text-xs font-bold uppercase text-yellow-950 shadow-neo-sm dark:bg-slate-800 dark:text-yellow-300">
                            <Sparkles className="h-4 w-4" />
                            <span>Quy trình tinh gọn</span>
                        </div>
                        <h2 className="mt-4 font-black tracking-tight text-3xl sm:text-5xl text-slate-900 dark:text-white">
                            3 Bước Đơn Giản Đến Thành Thạo
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {[
                            {
                                num: '01',
                                title: 'Nhập từ vựng hoặc chọn bộ đề IELTS',
                                desc: 'Dán danh sách từ bạn muốn học, hoặc chọn các bộ đề thi mẫu IELTS Academic theo 4 kỹ năng.',
                                color: 'bg-blue-600 text-white',
                            },
                            {
                                num: '02',
                                title: 'Gemini AI tự động tạo bài giảng & trắc nghiệm',
                                desc: 'Hệ thống tức thời sinh Flashcard, câu chuyện đọc hiểu, bài tập trắc nghiệm và chấm bài tự động.',
                                color: 'bg-purple-600 text-white',
                            },
                            {
                                num: '03',
                                title: 'Ôn tập đúng lúc theo thuật toán Spaced Repetition',
                                desc: 'App thông báo những từ vựng đến hạn cần ôn để kiến thức chuyển hẳn vào trí nhớ dài hạn của bạn.',
                                color: 'bg-emerald-600 text-white',
                            },
                        ].map((step) => (
                            <div
                                key={step.num}
                                className="flex flex-col sm:flex-row items-start gap-6 rounded-2xl border-2 border-slate-900 bg-white p-7 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-slate-700 dark:bg-slate-900"
                            >
                                <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 font-mono text-2xl font-black ${step.color} shadow-neo-sm`}>
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className="mb-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                        {step.title}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FAQ Accordion (Sui Overflow 4-Dot Interactive Button) ─── */}
            <section id="faq" className="border-t-2 border-slate-900 bg-slate-50 px-4 py-20 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-14 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-orange-100 px-4 py-1 font-mono text-xs font-bold uppercase text-orange-950 shadow-neo-sm dark:bg-slate-800 dark:text-orange-300">
                            <span>Hỏi & Đáp</span>
                        </div>
                        <h2 className="mt-4 font-black tracking-tight text-3xl sm:text-5xl text-slate-900 dark:text-white">
                            Câu Hỏi Thường Gặp
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {FAQ_ITEMS.map((item, idx) => {
                            const isOpen = openFaq === idx;
                            return (
                                <div
                                    key={idx}
                                    className="overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-neo transition-all dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <button
                                        onClick={() => toggleFaq(idx)}
                                        className="flex w-full items-center justify-between p-6 text-left"
                                        aria-expanded={isOpen}
                                    >
                                        <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                                            {item.q}
                                        </span>

                                        {/* Sui Overflow 4-Dot Interactive Button */}
                                        <div
                                            className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 transition-all duration-300 ${
                                                isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-yellow-300 text-slate-950'
                                            }`}
                                        >
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                            </div>
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="border-t-2 border-slate-100 px-6 pt-4 pb-6 font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300 text-sm leading-relaxed anim-fade-up">
                                            {item.a}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── Final CTA Banner ─── */}
            <section className="px-4 py-20 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-5xl rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-14 text-white shadow-neo-xl text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                    <div className="relative z-10">
                        <span className="inline-block rounded-full border-2 border-white/40 bg-white/10 px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest text-white mb-6">
                            Bắt đầu ngay hôm nay
                        </span>
                        <h2 className="font-black text-4xl sm:text-6xl tracking-tight mb-6">
                            Chinh Phục Tiếng Anh & IELTS Cùng AI
                        </h2>
                        <p className="mx-auto max-w-2xl text-blue-100 text-base sm:text-lg mb-10 font-medium">
                            Không cần thẻ tín dụng. Đăng nhập trong 5 giây và bắt đầu làm chủ vốn từ của bạn ngay bây giờ.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={onGetStarted}
                                className="flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-yellow-400 px-8 py-4 font-mono text-sm font-black uppercase text-slate-950 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                            >
                                <span>Tạo tài khoản miễn phí</span>
                                <ArrowUpRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Retro Bottom Dock Navigation: Fix Duplicate Text & Add Perfect Roll-up ─── */}
            <nav
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl rounded-2xl border-2 border-slate-900 bg-white/95 backdrop-blur-md shadow-neo-lg dark:border-slate-700 dark:bg-slate-900/95 overflow-hidden"
                aria-label="Điều hướng nhanh"
            >
                <div className="flex items-center divide-x-2 divide-slate-900 dark:divide-slate-700 overflow-x-auto scrollbar-none text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <a
                        href="#"
                        className="group flex-1 min-w-[90px] py-3.5 text-center transition-colors hover:bg-blue-600 hover:text-white flex items-center justify-center"
                    >
                        <RollText text="Tổng quan" />
                    </a>
                    <a
                        href="#ielts"
                        className="group flex-1 min-w-[90px] py-3.5 text-center transition-colors hover:bg-yellow-400 hover:text-slate-950 flex items-center justify-center"
                    >
                        <RollText text="IELTS Hub" />
                    </a>
                    <a
                        href="#features"
                        className="group flex-1 min-w-[90px] py-3.5 text-center transition-colors hover:bg-emerald-500 hover:text-white flex items-center justify-center"
                    >
                        <RollText text="Từ vựng" />
                    </a>
                    <a
                        href="#steps"
                        className="group flex-1 min-w-[90px] py-3.5 text-center transition-colors hover:bg-purple-600 hover:text-white flex items-center justify-center"
                    >
                        <RollText text="Lộ trình" />
                    </a>
                    <a
                        href="#faq"
                        className="group flex-1 min-w-[90px] py-3.5 text-center transition-colors hover:bg-orange-500 hover:text-white flex items-center justify-center"
                    >
                        <RollText text="Hỏi đáp" />
                    </a>
                    <button
                        onClick={onGetStarted}
                        className="group flex items-center justify-center gap-1.5 bg-slate-950 text-yellow-300 px-6 py-3.5 font-black transition-colors hover:bg-blue-600 hover:text-white dark:bg-blue-600 dark:text-white flex-shrink-0"
                    >
                        <RollText text="Bắt đầu" />
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:rotate-45" />
                    </button>
                </div>
            </nav>

            {/* ─── Footer ─── */}
            <footer className="border-t-2 border-slate-900 bg-white py-12 pb-24 text-center dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="mb-4 flex items-center justify-center gap-2.5">
                        <img
                            src="/app-logo.png"
                            alt="VocabMaster Logo"
                            className="h-8 w-8 object-contain rounded-lg border-2 border-slate-900 dark:border-slate-700 shadow-neo-sm"
                        />
                        <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
                            VocabMaster 2026
                        </span>
                    </div>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        © {new Date().getFullYear()} VocabMaster · Inspired by Sui Overflow · Powered by Gemini AI + Supabase
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
