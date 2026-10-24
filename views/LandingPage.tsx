import React, { useEffect, useRef } from 'react';
import { ArrowRight, BarChart3, BookOpen, Brain, ChevronRight, GraduationCap, Headphones, Repeat, Shield, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { toneClasses, type Tone } from '../components/ui/palette';
import { primaryBtn, secondaryBtn } from '../components/ui/styles';

interface LandingPageProps {
    onGetStarted: () => void;
}

const STATS: { icon: typeof Zap; tone: Tone; value: string; label: string }[] = [
    { icon: Zap, tone: 'butter', value: 'AI', label: 'Tạo bài tự động' },
    { icon: Shield, tone: 'mint', value: 'Free', label: 'Miễn phí hoàn toàn' },
    { icon: BarChart3, tone: 'sky', value: 'A1→C2', label: '6 cấp độ CEFR' },
    { icon: Repeat, tone: 'lavender', value: 'SRS', label: 'Ôn tập thông minh' },
];

const FEATURES: { icon: typeof Zap; tone: Tone; title: string; desc: string }[] = [
    { icon: Brain, tone: 'sky', title: 'Smart Flashcards', desc: 'IPA, nghĩa Việt, ví dụ mẫu, TTS phát âm chuẩn. Theo dõi mức độ thành thạo từng từ.' },
    { icon: Headphones, tone: 'lavender', title: 'Story Mode + Audio', desc: 'AI viết câu chuyện sử dụng từ vựng. Nghe Gemini TTS, highlight từng từ theo thời gian thực.' },
    { icon: Target, tone: 'mint', title: 'Quiz & Fill-blank', desc: 'Trắc nghiệm nghĩa Việt + điền từ vào câu. Mastery learning — phải đúng mới qua.' },
    { icon: Repeat, tone: 'butter', title: 'Spaced Repetition', desc: 'Thuật toán SM-2 lên lịch ôn tập tối ưu. Không bao giờ quên từ đã học.' },
    { icon: BarChart3, tone: 'aqua', title: 'Analytics Dashboard', desc: 'Heatmap hoạt động, biểu đồ tiến trình, streak, phát hiện điểm yếu bằng AI.' },
    { icon: GraduationCap, tone: 'peach', title: 'IELTS Academic', desc: 'Luyện đủ 4 kỹ năng Listening, Reading, Writing, Speaking với chấm điểm và giải thích từ AI.' },
];

const STEPS: { step: string; tone: Tone; title: string; desc: string }[] = [
    { step: '01', tone: 'sky', title: 'Nhập từ vựng', desc: 'Gõ, dán, hoặc import file .txt. Chọn level CEFR (A1→C2) và chủ đề bạn quan tâm.' },
    { step: '02', tone: 'periwinkle', title: 'AI tạo bài học hoàn chỉnh', desc: 'Gemini AI sinh flashcard chi tiết, câu chuyện ngữ cảnh, quiz trắc nghiệm, và bài điền từ — trong vài giây.' },
    { step: '03', tone: 'mint', title: 'Học → Ôn → Thành thạo', desc: 'Hệ thống SRS tự động nhắc ôn tập đúng lúc. Streak, analytics, và AI gợi ý giúp bạn tiến bộ mỗi ngày.' },
];

const heroBtn = primaryBtn.replace('px-5', 'px-8').replace('text-sm', 'text-lg').replace('min-h-touch', 'min-h-[56px]');
const heroSecondary = secondaryBtn.replace('px-4', 'px-8').replace('text-sm', 'text-lg').replace('min-h-touch', 'min-h-[56px]');

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const observerRef = useRef<IntersectionObserver | null>(null);

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
                    <div className="group flex items-center gap-3">
                        <IconTile icon={BookOpen} tone="periwinkle" />
                        <span className="text-xl font-bold tracking-tight">VocabMaster</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                        <button onClick={onGetStarted} className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-tone-periwinkle-fg dark:text-slate-300 sm:block">
                            Đăng nhập
                        </button>
                        <button onClick={onGetStarted} className={`${primaryBtn} rounded-full`}>
                            Bắt đầu miễn phí
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-40">
                <div className="relative z-10 mx-auto max-w-5xl text-center">
                    <div className="anim-fade-up anim-fade-up-d1">
                        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-tone-sky-border bg-tone-sky px-4 py-2 text-sm font-semibold text-tone-sky-fg">
                            <Sparkles className="h-4 w-4" />
                            Powered by Gemini AI — Spaced Repetition
                        </span>
                    </div>

                    <h1 className="anim-fade-up anim-fade-up-d2 mb-8 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-8xl">
                        <span className="block">Chinh phục</span>
                        <span className="mt-2 block text-tone-periwinkle-fg">tiếng Anh</span>
                        <span className="mt-2 block text-slate-700 dark:text-slate-200">mỗi ngày</span>
                    </h1>

                    <p className="anim-fade-up anim-fade-up-d3 mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl">
                        AI tạo bài học cá nhân hóa từ danh sách từ vựng của bạn.
                        <br className="hidden sm:block" />
                        <span className="font-medium text-slate-800 dark:text-white">Flashcard → Story → Quiz → Spaced Repetition</span> — ghi nhớ sâu, không bao giờ quên.
                    </p>

                    <div className="anim-fade-up anim-fade-up-d4 flex flex-col justify-center gap-4 sm:flex-row">
                        <button onClick={onGetStarted} className={`${heroBtn} group lift rounded-2xl`}>
                            Bắt đầu học ngay
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </button>
                        <button onClick={onGetStarted} className={`${heroSecondary} lift rounded-2xl`}>
                            Đăng nhập với Google
                        </button>
                    </div>

                    <div className="anim-fade-up anim-fade-up-d5 mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
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
            </section>

            {/* Features Section */}
            <section className="relative px-4 py-24 sm:px-6 sm:py-28">
                <div className="relative z-10 mx-auto max-w-7xl">
                    <div className="reveal mb-16 text-center" style={{ opacity: 0 }}>
                        <span className="text-sm font-semibold uppercase tracking-widest text-tone-sky-fg">Tính năng</span>
                        <h2 className="mb-5 mt-4 text-4xl font-bold sm:text-5xl">
                            Hệ thống học tập <span className="text-tone-sky-fg">toàn diện</span>
                        </h2>
                        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                            Từ nhập liệu đến thành thạo — mọi thứ được AI cá nhân hóa cho riêng bạn
                        </p>
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
            <section className="relative px-4 py-24 sm:px-6 sm:py-28">
                <div className="mx-auto max-w-4xl">
                    <div className="reveal mb-16 text-center" style={{ opacity: 0 }}>
                        <span className="text-sm font-semibold uppercase tracking-widest text-tone-periwinkle-fg">Quy trình</span>
                        <h2 className="mb-5 mt-4 text-4xl font-bold sm:text-5xl">
                            3 bước. <span className="text-tone-periwinkle-fg">Vậy thôi.</span>
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {STEPS.map((item, idx) => (
                            <div
                                key={item.step}
                                className={`reveal lift flex items-start gap-6 rounded-2xl border p-6 ${toneClasses(item.tone).surface}`}
                                style={{ opacity: 0, animationDelay: `${idx * 0.15}s` }}
                            >
                                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold ${toneClasses(item.tone).tile}`}>
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial / Trust */}
            <section className="relative px-4 py-20 sm:px-6">
                <div className="reveal mx-auto max-w-4xl" style={{ opacity: 0 }}>
                    <div className="rounded-3xl border border-tone-butter-border bg-tone-butter p-8 text-center sm:p-12">
                        <div className="mb-6 flex items-center justify-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Trophy key={i} className="h-5 w-5 text-tone-butter-fg" />
                            ))}
                        </div>
                        <blockquote className="mb-6 text-xl font-medium leading-relaxed text-slate-800 dark:text-slate-100 sm:text-2xl">
                            "Từ việc nhập 10 từ vựng đến có bài học hoàn chỉnh với audio chỉ mất 5 giây.
                            Hệ thống SRS giúp tôi không quên từ nào đã học."
                        </blockquote>
                        <div className="flex items-center justify-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tone-periwinkle-soft text-tone-periwinkle-fg">
                                <Users className="h-5 w-5" />
                            </span>
                            <div className="text-left">
                                <p className="text-sm font-semibold">Người học tiếng Anh</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Sử dụng VocabMaster hàng ngày</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative px-4 py-24 sm:px-6 sm:py-28">
                <div className="reveal mx-auto max-w-3xl text-center" style={{ opacity: 0 }}>
                    <h2 className="mb-6 text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
                        Sẵn sàng <span className="text-tone-lavender-fg">chinh phục</span> từ vựng?
                    </h2>
                    <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-slate-300">
                        Miễn phí. Không cần thẻ tín dụng. Đăng nhập bằng Google hoặc GitHub và bắt đầu ngay.
                    </p>
                    <button onClick={onGetStarted} className={`${heroBtn} group lift rounded-2xl`}>
                        Tạo tài khoản miễn phí
                        <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                    <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">Hỗ trợ đăng nhập Google, GitHub, và Email</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative border-t border-slate-200 py-10 text-center dark:border-slate-800">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="group mb-4 flex items-center justify-center gap-2">
                        <IconTile icon={BookOpen} tone="periwinkle" size="sm" />
                        <span className="font-bold">VocabMaster</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">© 2025 VocabMaster. Powered by Gemini AI + Supabase.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
