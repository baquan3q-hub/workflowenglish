import React, { useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Brain, Target, Headphones, ArrowRight, Zap, Globe, Star } from 'lucide-react';

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
            { threshold: 0.15 }
        );

        document.querySelectorAll('.reveal').forEach((el) => {
            observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-white overflow-hidden">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">VocabMaster</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onGetStarted} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                            Đăng nhập
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
                        >
                            Bắt đầu miễn phí
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative">
                {/* Background decoration */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-40 anim-float"></div>
                <div className="absolute top-40 right-10 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-30 anim-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full blur-3xl opacity-40"></div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="anim-fade-up anim-fade-up-d1">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full mb-6 border border-blue-100">
                            <Sparkles className="w-3.5 h-3.5" />
                            Powered by Gemini AI
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 anim-fade-up anim-fade-up-d2">
                        <span className="text-slate-900">Học từ vựng</span>
                        <br />
                        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent anim-gradient">
                            thông minh hơn
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 anim-fade-up anim-fade-up-d3 leading-relaxed">
                        Biến danh sách từ vựng thành bài học <strong className="text-slate-700">flashcard</strong>, <strong className="text-slate-700">story</strong>, và <strong className="text-slate-700">quiz</strong> chỉ trong vài giây với trí tuệ nhân tạo.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center anim-fade-up anim-fade-up-d4">
                        <button
                            onClick={onGetStarted}
                            className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 transition-all hover:-translate-y-1 text-lg anim-pulse-glow"
                        >
                            Bắt đầu ngay
                            <ArrowRight className="w-5 h-5 inline ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-lg">
                            Xem demo ↓
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto anim-fade-up anim-fade-up-d5">
                        {[
                            { value: 'AI', label: 'Tạo bài tự động' },
                            { value: 'Free', label: 'Miễn phí hoàn toàn' },
                            { value: '6 Lvl', label: 'A1 đến C2' },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center">
                                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stat.value}</div>
                                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-slate-50 to-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16 reveal" style={{ opacity: 0 }}>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Tính năng nổi bật</h2>
                        <p className="text-slate-500 text-lg">Ba bước để chinh phục từ vựng tiếng Anh</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Brain className="w-7 h-7" />,
                                title: "Smart Flashcards",
                                desc: "Flashcard thông minh với phát âm IPA, ví dụ mẫu, và nghĩa tiếng Việt. Nghe trực tiếp với TTS.",
                                color: "from-blue-500 to-blue-600",
                                bgColor: "bg-blue-50",
                                borderColor: "border-blue-100",
                            },
                            {
                                icon: <Headphones className="w-7 h-7" />,
                                title: "Story Mode",
                                desc: "AI tạo câu chuyện sử dụng từ vựng. Nghe audio toàn bài, word-by-word highlighting, tua ±5s.",
                                color: "from-indigo-500 to-purple-600",
                                bgColor: "bg-indigo-50",
                                borderColor: "border-indigo-100",
                            },
                            {
                                icon: <Target className="w-7 h-7" />,
                                title: "Mastery Quiz",
                                desc: "Quiz trắc nghiệm và điền khuyết để kiểm tra kiến thức. Giải thích chi tiết cho mỗi câu.",
                                color: "from-emerald-500 to-teal-600",
                                bgColor: "bg-emerald-50",
                                borderColor: "border-emerald-100",
                            },
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                className={`reveal group relative p-6 sm:p-8 rounded-3xl border ${feature.borderColor} ${feature.bgColor} hover:shadow-xl transition-all duration-500 cursor-pointer hover:-translate-y-2`}
                                style={{ opacity: 0, animationDelay: `${idx * 0.15}s` }}
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16 reveal" style={{ opacity: 0 }}>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Cách hoạt động</h2>
                        <p className="text-slate-500 text-lg">Chỉ 3 bước đơn giản</p>
                    </div>

                    <div className="space-y-12">
                        {[
                            { step: '01', title: 'Nhập từ vựng', desc: 'Gõ hoặc dán danh sách từ vựng bạn muốn học. Chọn level và chủ đề.', icon: <Globe className="w-6 h-6" /> },
                            { step: '02', title: 'AI tạo bài học', desc: 'Gemini AI tự động tạo flashcard, câu chuyện, và quiz phù hợp cho bạn.', icon: <Zap className="w-6 h-6" /> },
                            { step: '03', title: 'Học và luyện tập', desc: 'Lần lượt học qua flashcard → đọc story → làm quiz để master từ vựng.', icon: <Star className="w-6 h-6" /> },
                        ].map((item, idx) => (
                            <div key={idx} className="reveal flex items-start gap-6" style={{ opacity: 0, animationDelay: `${idx * 0.15}s` }}>
                                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    {item.icon}
                                </div>
                                <div>
                                    <span className="text-blue-500 font-mono text-sm font-bold">STEP {item.step}</span>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1 mb-2">{item.title}</h3>
                                    <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto reveal" style={{ opacity: 0 }}>
                    <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden anim-gradient">
                        {/* Decorative circles */}
                        <div className="absolute top-4 left-8 w-20 h-20 border border-white/20 rounded-full"></div>
                        <div className="absolute bottom-4 right-8 w-32 h-32 border border-white/10 rounded-full"></div>
                        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/5 rounded-full"></div>

                        <h2 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">Sẵn sàng chinh phục từ vựng?</h2>
                        <p className="text-blue-100 text-lg mb-8 max-w-lg mx-auto relative z-10">
                            Tham gia ngay — hoàn toàn miễn phí. Không cần thẻ tín dụng.
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="relative z-10 px-8 py-4 bg-white text-blue-700 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 text-lg"
                        >
                            Tạo tài khoản miễn phí <ArrowRight className="w-5 h-5 inline ml-2" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-100 text-center text-slate-400 text-sm">
                <p>© 2024 VocabMaster. Powered by Gemini AI. Made with 💙</p>
            </footer>
        </div>
    );
};

export default LandingPage;
