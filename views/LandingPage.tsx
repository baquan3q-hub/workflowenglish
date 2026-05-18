import React, { useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Brain, Target, Headphones, ArrowRight, Zap, BarChart3, Repeat, Shield, Users, Trophy, ChevronRight } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

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
        <div className="min-h-screen bg-[#0a0a1a] text-white overflow-hidden">
            {/* Animated background particles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] anim-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] anim-float" style={{ animationDelay: '3s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[150px]"></div>
            </div>

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-xl blur-md opacity-50"></div>
                            <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-xl">
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>
                        <span className="font-bold text-xl tracking-tight">VocabMaster</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                        <button onClick={onGetStarted} className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
                            Đăng nhập
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-5 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-full hover:shadow-lg hover:shadow-white/10 transition-all hover:-translate-y-0.5"
                        >
                            Bắt đầu miễn phí
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    {/* Badge */}
                    <div className="anim-fade-up anim-fade-up-d1">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm text-blue-300 text-sm font-semibold rounded-full mb-8 border border-white/10">
                            <Sparkles className="w-4 h-4" />
                            Powered by Gemini AI — Spaced Repetition
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-[0.9] mb-8 anim-fade-up anim-fade-up-d2 tracking-tight">
                        <span className="block text-white">Chinh phục</span>
                        <span className="block mt-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent anim-gradient">
                            tiếng Anh
                        </span>
                        <span className="block mt-2 text-white/90">mỗi ngày</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-12 anim-fade-up anim-fade-up-d3 leading-relaxed">
                        AI tạo bài học cá nhân hóa từ danh sách từ vựng của bạn.
                        <br className="hidden sm:block" />
                        <span className="text-white/80 font-medium">Flashcard → Story → Quiz → Spaced Repetition</span> — 
                        ghi nhớ sâu, không bao giờ quên.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center anim-fade-up anim-fade-up-d4">
                        <button
                            onClick={onGetStarted}
                            className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-2xl shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-1 text-lg overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Bắt đầu học ngay
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-lg"
                        >
                            Đăng nhập với Google
                        </button>
                    </div>

                    {/* Social proof */}
                    <div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12 anim-fade-up anim-fade-up-d5">
                        {[
                            { icon: <Zap className="w-5 h-5 text-amber-400" />, value: 'AI', label: 'Tạo bài tự động' },
                            { icon: <Shield className="w-5 h-5 text-emerald-400" />, value: 'Free', label: 'Miễn phí hoàn toàn' },
                            { icon: <BarChart3 className="w-5 h-5 text-blue-400" />, value: 'A1→C2', label: '6 cấp độ CEFR' },
                            { icon: <Repeat className="w-5 h-5 text-purple-400" />, value: 'SRS', label: 'Ôn tập thông minh' },
                        ].map((stat, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    {stat.icon}
                                </div>
                                <div className="text-left">
                                    <div className="text-lg font-bold text-white">{stat.value}</div>
                                    <div className="text-xs text-slate-500">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-24 sm:py-32 px-4 sm:px-6">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-20 reveal" style={{ opacity: 0 }}>
                        <span className="text-blue-400 font-semibold text-sm uppercase tracking-widest">Tính năng</span>
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mt-4 mb-5">
                            Hệ thống học tập <span className="text-blue-400">toàn diện</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Từ nhập liệu đến thành thạo — mọi thứ được AI cá nhân hóa cho riêng bạn
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Brain className="w-7 h-7" />,
                                title: "Smart Flashcards",
                                desc: "IPA, nghĩa Việt, ví dụ mẫu, TTS phát âm chuẩn. Theo dõi mức độ thành thạo từng từ.",
                                gradient: "from-blue-500/20 to-blue-600/5",
                                iconBg: "from-blue-500 to-blue-600",
                                border: "border-blue-500/20",
                            },
                            {
                                icon: <Headphones className="w-7 h-7" />,
                                title: "Story Mode + Audio",
                                desc: "AI viết câu chuyện sử dụng từ vựng. Nghe Gemini TTS, highlight từng từ theo thời gian thực.",
                                gradient: "from-purple-500/20 to-purple-600/5",
                                iconBg: "from-purple-500 to-purple-600",
                                border: "border-purple-500/20",
                            },
                            {
                                icon: <Target className="w-7 h-7" />,
                                title: "Quiz & Fill-blank",
                                desc: "Trắc nghiệm nghĩa Việt + điền từ vào câu. Mastery learning — phải đúng mới qua.",
                                gradient: "from-emerald-500/20 to-emerald-600/5",
                                iconBg: "from-emerald-500 to-emerald-600",
                                border: "border-emerald-500/20",
                            },
                            {
                                icon: <Repeat className="w-7 h-7" />,
                                title: "Spaced Repetition",
                                desc: "Thuật toán SM-2 lên lịch ôn tập tối ưu. Không bao giờ quên từ đã học.",
                                gradient: "from-amber-500/20 to-amber-600/5",
                                iconBg: "from-amber-500 to-amber-600",
                                border: "border-amber-500/20",
                            },
                            {
                                icon: <BarChart3 className="w-7 h-7" />,
                                title: "Analytics Dashboard",
                                desc: "Heatmap hoạt động, biểu đồ tiến trình, streak, phát hiện điểm yếu bằng AI.",
                                gradient: "from-rose-500/20 to-rose-600/5",
                                iconBg: "from-rose-500 to-rose-600",
                                border: "border-rose-500/20",
                            },
                            {
                                icon: <Sparkles className="w-7 h-7" />,
                                title: "AI Recommendations",
                                desc: "Gợi ý từ vựng mới phù hợp trình độ. Tự động điều chỉnh level khi bạn tiến bộ.",
                                gradient: "from-indigo-500/20 to-indigo-600/5",
                                iconBg: "from-indigo-500 to-indigo-600",
                                border: "border-indigo-500/20",
                            },
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                className={`reveal group relative p-7 rounded-2xl bg-gradient-to-br ${feature.gradient} border ${feature.border} backdrop-blur-sm hover:scale-[1.02] transition-all duration-500`}
                                style={{ opacity: 0, animationDelay: `${idx * 0.1}s` }}
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center text-white mb-5 shadow-lg`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="relative py-24 sm:py-32 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-20 reveal" style={{ opacity: 0 }}>
                        <span className="text-indigo-400 font-semibold text-sm uppercase tracking-widest">Quy trình</span>
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mt-4 mb-5">
                            3 bước. <span className="text-indigo-400">Vậy thôi.</span>
                        </h2>
                    </div>

                    <div className="space-y-8">
                        {[
                            { 
                                step: '01', 
                                title: 'Nhập từ vựng', 
                                desc: 'Gõ, dán, hoặc import file .txt. Chọn level CEFR (A1→C2) và chủ đề bạn quan tâm.',
                                accent: 'text-blue-400 border-blue-500/30 bg-blue-500/5'
                            },
                            { 
                                step: '02', 
                                title: 'AI tạo bài học hoàn chỉnh', 
                                desc: 'Gemini AI sinh flashcard chi tiết, câu chuyện ngữ cảnh, quiz trắc nghiệm, và bài điền từ — trong vài giây.',
                                accent: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5'
                            },
                            { 
                                step: '03', 
                                title: 'Học → Ôn → Thành thạo', 
                                desc: 'Hệ thống SRS tự động nhắc ôn tập đúng lúc. Streak, analytics, và AI gợi ý giúp bạn tiến bộ mỗi ngày.',
                                accent: 'text-purple-400 border-purple-500/30 bg-purple-500/5'
                            },
                        ].map((item, idx) => (
                            <div key={idx} className={`reveal flex items-start gap-6 p-6 rounded-2xl border ${item.accent} transition-all`} style={{ opacity: 0, animationDelay: `${idx * 0.15}s` }}>
                                <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-lg ${item.accent.split(' ')[0]}`}>
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial / Trust */}
            <section className="relative py-20 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto reveal" style={{ opacity: 0 }}>
                    <div className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-1 mb-6">
                            {[...Array(5)].map((_, i) => (
                                <Trophy key={i} className="w-5 h-5 text-amber-400" />
                            ))}
                        </div>
                        <blockquote className="text-xl sm:text-2xl font-medium text-white/90 leading-relaxed mb-6">
                            "Từ việc nhập 10 từ vựng đến có bài học hoàn chỉnh với audio chỉ mất 5 giây. 
                            Hệ thống SRS giúp tôi không quên từ nào đã học."
                        </blockquote>
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-white">Người học tiếng Anh</p>
                                <p className="text-xs text-slate-500">Sử dụng VocabMaster hàng ngày</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative py-24 sm:py-32 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto text-center reveal" style={{ opacity: 0 }}>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                        Sẵn sàng <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">chinh phục</span> từ vựng?
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
                        Miễn phí. Không cần thẻ tín dụng. Đăng nhập bằng Google hoặc GitHub và bắt đầu ngay.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onGetStarted}
                            className="group px-10 py-5 bg-white text-slate-900 font-bold rounded-2xl shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all hover:-translate-y-1 text-lg"
                        >
                            Tạo tài khoản miễn phí
                            <ChevronRight className="w-5 h-5 inline ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                    <p className="mt-6 text-xs text-slate-600">
                        Hỗ trợ đăng nhập Google, GitHub, và Email
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-10 border-t border-white/5 text-center">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-1.5 rounded-lg">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-white">VocabMaster</span>
                    </div>
                    <p className="text-slate-600 text-sm">
                        © 2025 VocabMaster. Powered by Gemini AI + Supabase. Made with 💙
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
