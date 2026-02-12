import React, { useState } from 'react';
import { BookOpen, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { signUp, signIn } from '../services/supabaseClient';

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
