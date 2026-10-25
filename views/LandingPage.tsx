import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowRight,
    BarChart3,
    BookOpenText,
    Brain,
    ChevronRight,
    CircleAlert,
    GraduationCap,
    Headphones,
    Languages,
    Loader2,
    Mic,
    PenLine,
    Repeat,
    Shield,
    Sparkles,
    Target,
    Timer,
    Zap,
} from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { toneClasses, type Tone } from '../components/ui/palette';
import { primaryBtn, secondaryBtn } from '../components/ui/styles';
import { signInWithGoogle } from '../services/supabaseClient';

interface LandingPageProps {
    onGetStarted: () => void;
    /** Starts Google sign-in; injectable for previews and tests. */
    onGoogle?: () => Promise<unknown>;
}

type Icon = typeof Zap;

/** The app logo (public/app-logo.png). */
function Logo({ size }: { size: 'md' | 'sm' }) {
    return (
        <img
            src="/app-logo.png"
            alt="VocabMaster Logo"
            className={`object-contain shadow-sm transition-transform group-hover:scale-105 ${size === 'md' ? 'h-9 w-9 rounded-xl' : 'h-6 w-6 rounded-lg'}`}
        />
    );
}

const STATS: { icon: Icon; tone: Tone; value: string; label: string }[] = [
    { icon: Zap, tone: 'butter', value: 'AI', label: 'Tạo bài tự động' },
    { icon: Shield, tone: 'mint', value: 'Free', label: 'Miễn phí hoàn toàn' },
    { icon: BarChart3, tone: 'sky', value: 'A1→C2', label: '6 cấp độ CEFR' },
    { icon: GraduationCap, tone: 'lavender', value: '4 kỹ năng', label: 'IELTS Academic' },
];

const FEATURES: { icon: Icon; tone: Tone; title: string; desc: string }[] = [
    { icon: Brain, tone: 'sky', title: 'Smart Flashcards', desc: 'IPA, nghĩa Việt, ví dụ mẫu, phát âm chuẩn. Theo dõi mức độ thành thạo từng từ.' },
    { icon: Headphones, tone: 'lavender', title: 'Story Mode + Audio', desc: 'AI viết câu chuyện dùng chính từ vựng của bạn, đọc thành tiếng và tô sáng từng từ.' },
    { icon: Target, tone: 'mint', title: 'Quiz & Fill-blank', desc: 'Trắc nghiệm nghĩa Việt và điền từ vào câu. Phải đúng mới qua bước tiếp theo.' },
    { icon: Repeat, tone: 'butter', title: 'Spaced Repetition', desc: 'Thuật toán SM-2 nhắc ôn đúng lúc sắp quên, từ đã học không trôi mất.' },
    { icon: BarChart3, tone: 'aqua', title: 'Thống kê tiến bộ', desc: 'Heatmap hoạt động, tỉ lệ nhớ, chuỗi ngày học và mục tiêu mỗi ngày.' },
    { icon: Languages, tone: 'peach', title: 'Giải thích bằng tiếng Việt', desc: 'Lỗi sai, câu khó và nhận xét bài viết đều được giải thích bằng tiếng Việt dễ hiểu.' },
];

const SKILLS: { icon: Icon; tone: Tone; name: string; points: string[] }[] = [
    { icon: Headphones, tone: 'sky', name: 'Listening', points: ['Đề 4 part, chấm ngay theo band', 'Chép chính tả từng câu', 'Đề AI tạo theo chủ đề'] },
    { icon: BookOpenText, tone: 'mint', name: 'Reading', points: ['Đủ 12 dạng câu hỏi Academic', 'Chỉ ra câu chứa đáp án và bẫy', 'Bấm vào từ để tra nghĩa'] },
    { icon: PenLine, tone: 'lavender', name: 'Writing', points: ['Chấm 4 tiêu chí, sửa từng câu', 'Lưu nháp, thi thử đếm ngược', 'Đề Task 1 có biểu đồ do AI tạo'] },
    { icon: Mic, tone: 'peach', name: 'Speaking', points: ['Ghi âm và chấm band', 'Phân tích độ trôi chảy', 'Thi thử đủ 3 phần'] },
];

const STEPS: { step: string; tone: Tone; title: string; desc: string }[] = [
    { step: '01', tone: 'sky', title: 'Nhập từ vựng hoặc chọn đề IELTS', desc: 'Gõ, dán hoặc nhập file .txt và chọn cấp độ CEFR; hoặc vào khu IELTS chọn kỹ năng muốn luyện.' },
    { step: '02', tone: 'periwinkle', title: 'AI tạo bài và chấm bài', desc: 'Gemini AI soạn flashcard, câu chuyện, quiz; chấm bài viết, bài nói và giải thích từng lỗi.' },
    { step: '03', tone: 'mint', title: 'Ôn đúng lúc, thấy mình tiến bộ', desc: 'Hệ thống nhắc ôn tập, sổ lỗi gom các lỗi lặp lại, thống kê cho thấy band và tỉ lệ nhớ theo thời gian.' },
];

const PROMISES: { icon: Icon; tone: Tone; title: string; desc: string }[] = [
    { icon: Shield, tone: 'mint', title: 'Miễn phí', desc: 'Đăng nhập bằng Google, GitHub hoặc email. Không cần thẻ tín dụng.' },
    { icon: Target, tone: 'sky', title: 'Minh bạch khi chấm', desc: 'Band là ước lượng của AI theo 4 tiêu chí IELTS, không phải điểm thi chính thức; luôn kèm lý do.' },
    { icon: Sparkles, tone: 'lavender', title: 'Nội dung tự soạn', desc: 'Đề và bài đọc được viết mới, không sao chép đề Cambridge.' },
];

const heroBtn = primaryBtn.replace('px-5', 'px-8').replace('text-sm', 'text-lg').replace('min-h-touch', 'min-h-[56px]');
const heroSecondary = secondaryBtn.replace('px-4', 'px-8').replace('text-sm', 'text-lg').replace('min-h-touch', 'min-h-[56px]');

/** Illustrative cards beside the headline: what the app shows, not real user data. */
function HeroPreview() {
    return (
        <div className="relative mx-auto h-[340px] w-full max-w-sm" aria-hidden="true">
            <div className={`anim-float absolute left-0 top-2 w-64 rounded-2xl border p-4 shadow-raised ${toneClasses('sky').surface}`}>
                <p className="text-caption font-semibold text-tone-sky-fg">Flashcard · B2</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">resilient</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">/rɪˈzɪliənt/ · kiên cường</p>
            </div>
            <div className={`anim-float absolute right-0 top-28 w-60 rounded-2xl border p-4 shadow-raised ${toneClasses('lavender').surface}`} style={{ animationDelay: '1.5s' }}>
                <p className="flex items-center gap-1.5 text-caption font-semibold text-tone-lavender-fg">
                    <PenLine className="h-3.5 w-3.5" /> Writing Task 2
                </p>
                <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tone-mint-soft text-lg font-black text-tone-mint-fg">6.5</span>
                    <div className="flex-1 space-y-1.5">
                        {[80, 65, 70, 60].map((w, i) => (
                            <span key={i} className="block h-1.5 rounded-full bg-tone-lavender-soft">
                                <span className="block h-full rounded-full bg-tone-lavender-accent" style={{ width: `${w}%` }} />
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className={`anim-float absolute bottom-2 left-6 w-56 rounded-2xl border p-4 shadow-raised ${toneClasses('butter').surface}`} style={{ animationDelay: '3s' }}>
                <p className="flex items-center gap-1.5 text-caption font-semibold text-tone-butter-fg">
                    <Timer className="h-3.5 w-3.5" /> Ôn tập hôm nay
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">12 từ đến hạn ôn</p>
            </div>
        </div>
    );
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onGoogle = signInWithGoogle }) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [googleBusy, setGoogleBusy] = useState(false);
    const [googleError, setGoogleError] = useState('');

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('anim-fade-up');
                        observerRef.current?.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        document.querySelectorAll('.reveal').forEach((el) => {
            observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []);

    // Goes straight to Google; the page redirects there, so only a failure comes back here.
    const google = async () => {
        setGoogleBusy(true);
        setGoogleError('');
        try {
            await onGoogle();
        } catch (err) {
            setGoogleError(err instanceof Error && err.message ? err.message : 'Chưa đăng nhập Google được. Bạn thử lại hoặc dùng email nhé.');
            setGoogleBusy(false);
        }
    };

    return (
        <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
            {/* Soft colour blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="anim-float absolute left-[10%] top-[15%] h-[420px] w-[420px] rounded-full bg-tone-sky-soft opacity-70 blur-[100px]"></div>
                <div className="anim-float absolute bottom-[10%] right-[10%] h-[480px] w-[480px] rounded-full bg-tone-lavender-soft opacity-70 blur-[110px]" style={{ animationDelay: '3s' }}></div>
                <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tone-mint-soft opacity-50 blur-[130px]"></div>
            </div>

            {/* Nav */}
            <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <div className="group flex items-center gap-2.5">
                        <Logo size="md" />
                        <span className="text-xl font-bold tracking-tight">VocabMaster</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                        <a href="#ielts" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-tone-lavender-fg dark:text-slate-300 md:block">
                            IELTS
                        </a>
                        <a href="#features" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-tone-sky-fg dark:text-slate-300 md:block">
                            Tính năng
                        </a>
                        <button onClick={onGetStarted} className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-tone-periwinkle-fg dark:text-slate-300 sm:block">
                            Đăng nhập
                        </button>
                        <button onClick={onGetStarted} className={`${primaryBtn} rounded-full`}>
                            Bắt đầu miễn phí
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36">
                <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
                    <div className="text-center lg:text-left">
                        <div className="anim-fade-up anim-fade-up-d1">
                            <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-tone-sky-border bg-tone-sky px-4 py-2 text-sm font-semibold text-tone-sky-fg">
                                <Sparkles className="h-4 w-4" />
                                Từ vựng thông minh + IELTS Academic 4 kỹ năng
                            </span>
                        </div>

                        <h1 className="anim-fade-up anim-fade-up-d2 mb-8 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
                            <span className="block">Chinh phục</span>
                            <span className="mt-2 block text-tone-periwinkle-fg">tiếng Anh</span>
                            <span className="mt-2 block text-slate-700 dark:text-slate-200">mỗi ngày</span>
                        </h1>

                        <p className="anim-fade-up anim-fade-up-d3 mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl lg:mx-0">
                            AI tạo bài học từ chính danh sách từ của bạn, nhắc ôn đúng lúc, và luyện đủ Listening, Reading, Writing, Speaking với nhận xét bằng tiếng Việt.
                        </p>

                        <div className="anim-fade-up anim-fade-up-d4 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                            <button onClick={onGetStarted} className={`${heroBtn} group lift rounded-2xl`}>
                                Bắt đầu học ngay
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button onClick={google} disabled={googleBusy} className={`${heroSecondary} lift rounded-2xl`}>
                                {googleBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-lg font-black text-tone-sky-fg">G</span>}
                                {googleBusy ? 'Đang mở Google…' : 'Đăng nhập với Google'}
                            </button>
                        </div>
                        {googleError && (
                            <p role="alert" className="mx-auto mt-3 flex max-w-md items-start gap-2 rounded-xl bg-tone-blush p-3 text-left text-sm text-tone-blush-fg lg:mx-0">
                                <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /> {googleError}
                            </p>
                        )}

                        <div className="anim-fade-up anim-fade-up-d5 mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:justify-start">
                            {STATS.map((stat) => (
                                <div key={stat.label} className="group flex items-center gap-3">
                                    <IconTile icon={stat.icon} tone={stat.tone} size="sm" />
                                    <div className="text-left">
                                        <div className="text-lg font-bold">{stat.value}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="anim-fade-up anim-fade-up-d3 hidden lg:block">
                        <HeroPreview />
                    </div>
                </div>
            </section>

            {/* IELTS */}
            <section id="ielts" className="relative scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
                <div className="relative z-10 mx-auto max-w-6xl">
                    <div className="reveal mb-14 text-center" style={{ opacity: 0 }}>
                        <span className="text-sm font-semibold uppercase tracking-widest text-tone-lavender-fg">IELTS Academic</span>
                        <h2 className="mb-5 mt-4 text-4xl font-bold sm:text-5xl">
                            Luyện đủ <span className="text-tone-lavender-fg">4 kỹ năng</span>
                        </h2>
                        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                            Mỗi kỹ năng có đề luyện, chế độ thi thử, bài học chiến lược và lịch sử band để thấy mình tiến bộ.
                        </p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {SKILLS.map((s, idx) => (
                            <div key={s.name} className={`reveal lift group rounded-2xl border p-6 ${toneClasses(s.tone).surface}`} style={{ opacity: 0, animationDelay: `${idx * 0.1}s` }}>
                                <IconTile icon={s.icon} tone={s.tone} size="lg" className="mb-4" />
                                <h3 className={`mb-3 text-lg font-bold ${toneClasses(s.tone).text}`}>{s.name}</h3>
                                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    {s.points.map((p) => (
                                        <li key={p} className="flex items-start gap-2">
                                            <ChevronRight className={`mt-0.5 h-4 w-4 flex-shrink-0 ${toneClasses(s.tone).text}`} aria-hidden />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Vocabulary features */}
            <section id="features" className="relative scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
                <div className="relative z-10 mx-auto max-w-7xl">
                    <div className="reveal mb-14 text-center" style={{ opacity: 0 }}>
                        <span className="text-sm font-semibold uppercase tracking-widest text-tone-sky-fg">Từ vựng</span>
                        <h2 className="mb-5 mt-4 text-4xl font-bold sm:text-5xl">
                            Hệ thống học từ <span className="text-tone-sky-fg">toàn diện</span>
                        </h2>
                        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">Từ nhập liệu đến thành thạo, mọi bước được AI cá nhân hoá cho riêng bạn.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((feature, idx) => (
                            <div
                                key={feature.title}
                                className={`reveal lift group relative rounded-2xl border p-7 ${toneClasses(feature.tone).surface}`}
                                style={{ opacity: 0, animationDelay: `${idx * 0.1}s` }}
                            >
                                <IconTile icon={feature.icon} tone={feature.tone} size="lg" className="mb-5" />
                                <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="relative px-4 py-20 sm:px-6 sm:py-24">
                <div className="mx-auto max-w-4xl">
                    <div className="reveal mb-14 text-center" style={{ opacity: 0 }}>
                        <span className="text-sm font-semibold uppercase tracking-widest text-tone-periwinkle-fg">Quy trình</span>
                        <h2 className="mb-5 mt-4 text-4xl font-bold sm:text-5xl">
                            3 bước. <span className="text-tone-periwinkle-fg">Vậy thôi.</span>
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {STEPS.map((item, idx) => (
                            <div key={item.step} className={`reveal lift flex items-start gap-6 rounded-2xl border p-6 ${toneClasses(item.tone).surface}`} style={{ opacity: 0, animationDelay: `${idx * 0.15}s` }}>
                                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold ${toneClasses(item.tone).tile}`}>{item.step}</div>
                                <div>
                                    <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* What we promise (no invented testimonials) */}
            <section className="relative px-4 py-16 sm:px-6">
                <div className="reveal mx-auto grid max-w-5xl gap-4 sm:grid-cols-3" style={{ opacity: 0 }}>
                    {PROMISES.map((p) => (
                        <div key={p.title} className="lift group rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                            <IconTile icon={p.icon} tone={p.tone} className="mb-3" />
                            <h3 className="mb-1 font-bold">{p.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative px-4 py-24 sm:px-6 sm:py-28">
                <div className="reveal mx-auto max-w-3xl text-center" style={{ opacity: 0 }}>
                    <h2 className="mb-6 text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
                        Sẵn sàng <span className="text-tone-lavender-fg">chinh phục</span> tiếng Anh?
                    </h2>
                    <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-slate-300">Miễn phí. Đăng nhập bằng Google, GitHub hoặc email và bắt đầu ngay.</p>
                    <button onClick={onGetStarted} className={`${heroBtn} group lift rounded-2xl`}>
                        Tạo tài khoản miễn phí
                        <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative border-t border-slate-200 py-10 text-center dark:border-slate-800">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="group mb-4 flex items-center justify-center gap-2">
                        <Logo size="sm" />
                        <span className="font-bold">VocabMaster</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} VocabMaster. Powered by Gemini AI + Supabase.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
