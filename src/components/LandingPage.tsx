import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Shield, Zap, BarChart3, Globe, Languages } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../lib/LanguageContext';
import { useFirebase } from '../lib/FirebaseContext';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, login } = useFirebase();
  const navigate = useNavigate();

  const handleStart = async () => {
    if (user) {
      navigate('/dashboard');
    } else {
      try {
        const result = await login();
        const loggedInUser = result.user;
        
        if (loggedInUser) {
          // Create or update user document
          const userRef = doc(db, 'users', loggedInUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: loggedInUser.uid,
              email: loggedInUser.email,
              displayName: loggedInUser.displayName,
              photoURL: loggedInUser.photoURL,
              role: loggedInUser.email === 'xingshengchoong@gmail.com' ? 'admin' : 'client',
              createdAt: serverTimestamp()
            });
          }
        }
        
        navigate('/dashboard');
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md px-4 md:px-8 h-20 flex items-center justify-between max-w-7xl mx-auto left-0 right-0">
        <span className="text-xl md:text-2xl font-black text-primary tracking-tighter font-headline">{t('brand')}</span>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Features</a>
          </div>
          
          {/* Language Switcher */}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition-colors"
          >
            <Languages className="w-3.5 h-3.5" />
            {language === 'en' ? '中文' : 'EN'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className="premium-gradient text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold font-headline shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {user ? t('openApp') : t('startJourney')}
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow pt-32">
        <section className="px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-12 md:py-20">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4 block">{t('heroTag')}</span>
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-black font-headline text-on-surface leading-[0.9] tracking-tighter mb-8">
              {t('heroTitle1')} <br />
              <span className="text-primary">{t('heroTitle2')}</span>
            </h1>
            <p className="text-base md:text-lg text-on-surface-variant font-body max-w-md mb-10 leading-relaxed">
              {t('heroDesc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="w-full sm:w-auto premium-gradient text-white px-8 py-4 rounded-full font-bold font-headline shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                {t('startJourney')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                className="text-on-surface font-bold font-headline hover:text-primary transition-colors"
              >
                {t('viewDemo')}
              </motion.button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative z-10">
              <img 
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1000" 
                alt="Luxury Interior" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
            </div>
            {/* Floating Card */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 -left-10 bg-white p-8 rounded-2xl shadow-2xl z-20 max-w-xs ghost-border"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Real-time</p>
                  <p className="text-lg font-black text-on-surface font-headline">Insights</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Our proprietary algorithms distill your spending into actionable intelligence.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section id="features" className="bg-surface-container-low py-20 md:py-32 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-black font-headline text-on-surface mb-4">{t('featuresTitle')}</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">{t('featuresDesc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Shield, title: t('feature1Title'), desc: t('feature1Desc') },
                { icon: BarChart3, title: t('feature2Title'), desc: t('feature2Desc') },
                { icon: Globe, title: t('feature3Title'), desc: t('feature3Desc') }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10 }}
                  className="bg-surface-container-lowest p-10 rounded-3xl ghost-border hover:shadow-xl transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-8">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black font-headline text-on-surface mb-4">{feature.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-surface-container-lowest border-t border-surface-container-low">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-xl font-black text-primary tracking-tighter font-headline">{t('brand')}</span>
            <p className="text-xs text-on-surface-variant">© 2024 {t('brand')}. All rights reserved.</p>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">Terms</a>
            <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
