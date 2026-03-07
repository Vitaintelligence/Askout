import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans relative overflow-hidden">
            {/* Background Glow Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="z-10 text-center px-6 max-w-3xl flex flex-col items-center">
                {/* Badge */}
                <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-semibold tracking-wide text-white/80 uppercase">
                    Powered by Maxify
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/50">
                    AskOut
                </h1>

                {/* Subtitle */}
                <p className="text-lg md:text-xl text-white/60 mb-10 max-w-xl mx-auto font-light leading-relaxed">
                    The ultimate platform for anonymous voice notes, fit ratings, and shooting your shot. Get the app to claim your personal link.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link
                        href="https://apps.apple.com/app/com.maxify.official"
                        className="flex items-center justify-center px-8 py-4 bg-white text-black rounded-full font-semibold text-[17px] transition-all hover:scale-105 hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                        <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91 1.29.07 2.46.52 3.33 1.42-3.26 1.95-2.73 6.64.44 7.9-.66 1.54-1.54 3.09-2.98 5.34m-3.44-15.4c.7-1.02 1.15-2.43.99-3.83-1.16.07-2.61.85-3.35 1.83-.65.84-1.18 2.29-1 3.65 1.34.08 2.65-.63 3.36-1.65" />
                        </svg>
                        Download on App Store
                    </Link>
                    <Link
                        href="https://maxify.app"
                        className="flex items-center justify-center px-8 py-4 bg-white/10 text-white rounded-full font-semibold text-[17px] backdrop-blur-md border border-white/10 transition-all hover:bg-white/20"
                    >
                        Learn More
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-center w-full z-10">
                <p className="text-white/40 text-sm font-medium">© {new Date().getFullYear()} Maxify Inc. All rights reserved.</p>
            </div>
        </div>
    );
}
