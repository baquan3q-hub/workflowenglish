import React, { useState } from 'react';
import { BookOpen, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { signUp, signIn, signInWithGoogle, signInWithGithub } from '../services/supabaseClient';

interface AuthPageProps {
    onLogin: () => void;
    onBack: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onBack }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resetForm = () => {
        setEmail('');
        setUsername('');
        setDisplayName('');
        setPassword('');
        setError(null);
        setSuccess(null);
    };

    const switchMode = (newMode: 'login' | 'signup') => {
        resetForm();
        setMode(newMode);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email.trim() || !password.trim()) {
            setError('Vui lòng điền đầy đủ thông tin.');
            return;
        }

        setIsLoading(true);

        try {
            if (mode === 'signup') {
                if (!username.trim() || !displayName.trim()) {
                    setError('Vui lòng nhập tên đăng nhập và tên hiển thị.');
                    setIsLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('Mật khẩu phải có ít nhất 6 ký tự.');
                    setIsLoading(false);
                    return;
                }

                await signUp(email.trim(), password, username.trim(), displayName.trim());
                setSuccess('Đăng ký thành công! Đang đăng nhập...');
                setTimeout(() => onLogin(), 800);
            } else {
                await signIn(email.trim(), password);
                onLogin();
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.message?.includes('already registered')) {
                setError('Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.');
            } else if (err.message?.includes('Invalid login')) {
                setError('Email hoặc mật khẩu không đúng.');
            } else if (err.message?.includes('duplicate key') && err.message?.includes('username')) {
                setError('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
            } else {
                setError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
            {/* Background decoration */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-30 anim-float"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-20 anim-float" style={{ animationDelay: '3s' }}></div>

            <div className="w-full max-w-md relative z-10">
                {/* Back button */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Quay lại</span>
                </button>

                {/* Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 anim-scale-in">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
                            <BookOpen className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {mode === 'login' ? 'Chào mừng bạn quay lại!' : 'Tham gia VocabMaster miễn phí'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700"
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        {/* Username (signup only) */}
                        {mode === 'signup' && (
                            <div className="anim-fade-up" style={{ animationDelay: '0s' }}>
                                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Tên đăng nhập</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700"
                                    placeholder="username"
                                />
                            </div>
                        )}

                        {/* Display Name (signup only) */}
                        {mode === 'signup' && (
                            <div className="anim-fade-up" style={{ animationDelay: '0.05s' }}>
                                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Tên hiển thị</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700"
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 pr-12"
                                    placeholder="••••••"
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error / Success Messages */}
                        {error && (
                            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-start gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-xl border border-green-100">
                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                            ) : mode === 'login' ? (
                                <><LogIn className="w-4 h-4" /> Đăng nhập</>
                            ) : (
                                <><UserPlus className="w-4 h-4" /> Đăng ký</>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-xs text-slate-400 font-medium">hoặc</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Google Sign In */}
                    <button
                        onClick={async () => {
                            setError(null);
                            try {
                                await signInWithGoogle();
                            } catch (err: any) {
                                setError(err.message || 'Đăng nhập Google thất bại.');
                            }
                        }}
                        className="w-full py-3 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Đăng nhập bằng Google
                    </button>

                    {/* GitHub Sign In */}
                    <button
                        onClick={async () => {
                            setError(null);
                            try {
                                await signInWithGithub();
                            } catch (err: any) {
                                setError(err.message || 'Đăng nhập GitHub thất bại.');
                            }
                        }}
                        className="w-full py-3 mt-3 bg-slate-900 border-2 border-slate-900 rounded-xl font-semibold text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        Đăng nhập bằng GitHub
                    </button>

                    {/* Toggle */}
                    <div className="mt-6 text-center text-sm text-slate-500">
                        {mode === 'login' ? (
                            <>
                                Chưa có tài khoản?{' '}
                                <button onClick={() => switchMode('signup')} className="text-blue-600 font-semibold hover:underline">
                                    Đăng ký ngay
                                </button>
                            </>
                        ) : (
                            <>
                                Đã có tài khoản?{' '}
                                <button onClick={() => switchMode('login')} className="text-blue-600 font-semibold hover:underline">
                                    Đăng nhập
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
