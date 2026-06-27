import React, { useState, useEffect } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useLocation, 
  useParams 
} from 'react-router-dom';
import { 
  subscribeToAuth, 
  signUp, 
  signIn, 
  signInWithGoogle, 
  signOut, 
  getMyCatches, 
  checkIsFirebaseLive 
} from './services/firebase';
import type { Cat, UserProfile } from './services/firebase';
import { SetupModal } from './components/SetupModal';
import { SpotTab } from './components/SpotTab';
import { FeedTab } from './components/FeedTab';
import { DexTab } from './components/DexTab';
import { MapTab } from './components/MapTab';
import { ProfileTab } from './components/ProfileTab';
import { CatDetail } from './components/CatDetail';
import { XPToast } from './components/XPToast';
import { 
  Sparkles, 
  Settings, 
  BookOpen, 
  Info, 
  User, 
  Mail, 
  LockKeyhole,
  Database,
  Building,
  Camera,
  MapPin,
  Utensils,
  Trophy
} from 'lucide-react';
import { motion } from 'framer-motion';

function MainAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // App States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [myCats, setMyCats] = useState<Cat[]>([]);
  
  // Modals & Configuration
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [isLiveConnection, setIsLiveConnection] = useState<boolean>(checkIsFirebaseLive());
  const [loadingCats, setLoadingCats] = useState<boolean>(false);

  // Notifications Toast State
  const [toastConfig, setToastConfig] = useState<{ message: string; xp: number; isOpen: boolean }>({
    message: '',
    xp: 0,
    isOpen: false
  });

  // Auth Forms
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [userRole, setUserRole] = useState<'individual' | 'ngo'>('individual');
  const [orgName, setOrgName] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        loadMyCats(user.uid);
      } else {
        setMyCats([]);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isLiveConnection]);

  // Load catches
  const loadMyCats = async (uid: string) => {
    setLoadingCats(true);
    try {
      const data = await getMyCatches(uid);
      setMyCats(data.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()));
    } catch (e) {
      console.error('Failed to load catches:', e);
    } finally {
      setLoadingCats(false);
    }
  };

  const handleConfigSaved = () => {
    const live = checkIsFirebaseLive();
    setIsLiveConnection(live);
    triggerNotification(`System configured! Mode: ${live ? 'LIVE' : 'SANDBOX'}`, 0);
  };

  const triggerNotification = (message: string, xp: number = 0) => {
    setToastConfig({ message, xp, isOpen: true });
  };

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authTab === 'signin') {
        await signIn(email, password);
        triggerNotification('Successfully signed in!', 0);
        navigate('/dex');
      } else {
        if (!displayName) {
          throw new Error('Trainer name is required.');
        }
        if (userRole === 'ngo' && !orgName) {
          throw new Error('Organization name is required for NGO accounts.');
        }
        await signUp(email, password, displayName, userRole, orgName);
        triggerNotification(`Welcome, Trainer ${displayName}!`, 0);
        navigate('/dex');
      }
      setEmail('');
      setPassword('');
      setDisplayName('');
      setOrgName('');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      triggerNotification('Signed in with Google!', 0);
      navigate('/dex');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Google Auth failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      triggerNotification('Logged out successfully.', 0);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleActionComplete = (pointsEarned: number, message: string) => {
    if (currentUser) {
      loadMyCats(currentUser.uid);
      setCurrentUser(prev => prev ? { ...prev, totalXP: prev.totalXP + pointsEarned } : null);
      triggerNotification(message, pointsEarned);
    }
  };

  const handleAdoptionStatusChanged = () => {
    if (currentUser) {
      loadMyCats(currentUser.uid);
    }
    triggerNotification('Stray marked as Adopted & Safe!', 0);
  };

  // Determine active route for tab bar highlighting
  const currentTab = location.pathname.split('/')[1] || 'dex';

  // Helper route wrapper for Feed with param
  const FeedRouteWrapper = () => {
    const { id } = useParams();
    const targetCat = myCats.find(c => c.id === id) || null;
    return (
      <FeedTab
        currentUser={currentUser}
        existingCats={myCats}
        preSelectedCat={targetCat}
        onClearPreSelected={() => navigate('/feed')}
        onActionComplete={handleActionComplete}
      />
    );
  };

  // Helper route wrapper for Cat Detail overlay
  const CatDetailWrapper = () => {
    const { id } = useParams();
    const targetCat = myCats.find(c => c.id === id) || null;
    if (!targetCat) return <Navigate to="/dex" replace />;
    
    return (
      <CatDetail
        cat={targetCat}
        currentUser={currentUser}
        onClose={() => navigate(-1)}
        onFeedDirectly={(cat) => navigate(`/feed/${cat.id}`)}
        onAdoptionStatusChanged={handleAdoptionStatusChanged}
        onViewOnMap={(_cat) => {
          navigate('/map');
        }}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-base font-sans relative text-ink antialiased">
      
      {/* FLOATING ACTION NOTIFICATION TOAST */}
      <XPToast
        isOpen={toastConfig.isOpen}
        message={toastConfig.message}
        xpEarned={toastConfig.xp}
        onClose={() => setToastConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* LOGIN / AUTHSYSTEM SCREEN */}
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border-4 border-slate-900 bg-bg-elevated shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header banner */}
            <div className="bg-[#1E1B18] p-6 text-white text-center border-b-4 border-slate-900 relative overflow-hidden select-none">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#D97706]/10 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="w-14 h-14 rounded-full bg-[#3882B8] border-4 border-[#FFFDF9] mx-auto flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white/50"></div>
                <span className="text-2.5xl">🐱</span>
              </div>
              <h1 className="font-display font-black text-2xl tracking-widest mt-3.5 leading-none">CATCHDEX</h1>
              <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-black mt-1">Stray Welfare Discovery Game</p>
            </div>

            {/* Auth Tab Picker */}
            <div className="flex border-b border-slate-200 bg-[#FAF6EE] shrink-0 font-sans">
              <button
                type="button"
                onClick={() => { setAuthTab('signin'); setAuthError(null); }}
                className={`flex-1 py-3 text-[10px] font-black tracking-widest transition-colors uppercase cursor-pointer ${
                  authTab === 'signin' 
                    ? 'bg-[#FFFDF9] text-ink border-b-2 border-slate-900' 
                    : 'text-[#6E665F] hover:text-ink'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('signup'); setAuthError(null); }}
                className={`flex-1 py-3 text-[10px] font-black tracking-widest transition-colors uppercase cursor-pointer ${
                  authTab === 'signup' 
                    ? 'bg-[#FFFDF9] text-ink border-b-2 border-slate-900' 
                    : 'text-[#6E665F] hover:text-ink'
                }`}
              >
                Register Trainer
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 flex-1 text-left font-sans text-xs">
              
              {authError && (
                <div className="p-3 bg-[#B91C1C]/10 border border-[#B91C1C]/20 rounded-2xl text-[10px] text-danger font-bold flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authTab === 'signup' && (
                  <>
                    <div>
                      <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Trainer Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setUserRole('individual')}
                          className={`py-2 px-3 border rounded-xl font-bold transition select-none cursor-pointer ${
                            userRole === 'individual'
                              ? 'bg-slate-900 text-white border-transparent shadow-sm'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserRole('ngo')}
                          className={`py-2 px-3 border rounded-xl font-bold transition select-none cursor-pointer ${
                            userRole === 'ngo'
                              ? 'bg-slate-900 text-white border-transparent shadow-sm'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          NGO / Shelter
                        </button>
                      </div>
                    </div>

                    {userRole === 'ngo' && (
                      <div className="animate-fade-in">
                        <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Organization Name</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-2.5 w-4 h-4 text-[#6E665F]/60" />
                          <input
                            type="text"
                            required
                            placeholder="Whiskers Rescue Shelter"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-[#FAF6EE]/30 focus:ring-2 focus:ring-slate-300"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Trainer Handle</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-[#6E665F]/60" />
                        <input
                          type="text"
                          required
                          placeholder="AshKetchum"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-[#FAF6EE]/30 focus:ring-2 focus:ring-slate-300"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#6E665F]/60" />
                    <input
                      type="email"
                      required
                      placeholder="trainer@catchdex.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-[#FAF6EE]/30 focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Passcode</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-2.5 w-4 h-4 text-[#6E665F]/60" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-[#FAF6EE]/30 focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-md transition disabled:opacity-50 mt-2 select-none uppercase tracking-wider text-xs cursor-pointer"
                >
                  {authLoading ? 'Initializing connection...' : authTab === 'signin' ? 'Enter CatchDex Portal' : 'Initialize profile'}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[9px] font-mono font-black text-[#6E665F] uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold transition flex items-center justify-center gap-1.5 bg-[#FFFDF9] shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.39 7.6 9 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.46c-.28 1.46-1.1 2.7-2.34 3.53l3.64 2.82c2.13-1.97 3.73-4.86 3.73-8.46z" />
                  <path fill="#FBBC05" d="M5.36 10.5C5.12 11.23 5 12 5 12s.12.77.36 1.5l-3.86 3C.53 14.86 0 13.5 0 12s.53-2.86 1.5-4.5l3.86 3z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.64-2.82c-1.1.74-2.51 1.18-4.32 1.18-3 0-5.61-2.56-6.64-5.46l-3.86 3C3.39 20.35 7.35 23 12 23z" />
                </svg>
                <span className="text-xs">Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={() => signIn('guest@catchdex.com', 'guestpass')}
                className="w-full py-3.5 bg-[#D97706] hover:bg-[#D97706]/90 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 mt-1 select-none uppercase tracking-wider text-xs cursor-pointer"
              >
                🚀 Quick Start Demo Sandbox
              </button>

            </div>

            {/* Bottom Config Panel */}
            <div className="bg-[#FAF6EE] p-4 border-t border-slate-200 flex items-center justify-between font-mono text-[9px] font-bold">
              <span className="text-[#6E665F] flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-[#6E665F]/75" />
                <span>Radar: {isLiveConnection ? '🟢 LIVE' : '🟡 SANDBOX'}</span>
              </span>
              <button
                onClick={() => setIsSetupOpen(true)}
                className="text-[#6E665F] hover:text-[#D97706] flex items-center gap-1 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure credentials</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* MAIN APPLICATION CONTAINER (Optimized for mobile-first centering) */
        <div className="flex-1 flex flex-col w-full max-w-md mx-auto md:p-6 p-4">
          
          {/* Persistent Top Header Block */}
          <header className="bg-[#1E1B18] text-[#FFFDF9] rounded-3xl p-5 border border-white/5 shadow-md flex items-center justify-between shrink-0 mb-5 select-none relative overflow-hidden text-left">
            <div className="absolute top-2 left-6 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            </div>

            <div className="flex items-center gap-3">
              <div 
                onClick={() => navigate('/spot')}
                className="w-11 h-11 rounded-full bg-[#3882B8] border-2 border-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition relative overflow-hidden shrink-0"
              >
                <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white/40"></div>
                <span className="text-xl">🐱</span>
              </div>
              
              <div>
                <h1 className="font-display font-black text-lg tracking-widest leading-none text-[#FFFDF9]">CATCHDEX</h1>
                <p className="text-[8px] font-mono text-[#6E665F] uppercase tracking-widest font-black mt-1 flex flex-wrap items-center gap-1 leading-none">
                  <span>{currentUser.displayName}</span>
                  {currentUser.role === 'ngo' && (
                    <span className="bg-[#0F766E] text-white px-1.5 py-0.5 rounded font-black text-[7px]">NGO</span>
                  )}
                </p>
              </div>
            </div>

            {/* Trainer Stats right edge */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-slate-900 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0 font-mono shadow-sm">
                <Sparkles className="w-3 h-3 text-[#D97706] fill-[#D97706] animate-pulse shrink-0" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                  LVL {currentUser.level} ({currentUser.totalXP} XP)
                </span>
              </div>

              <button
                onClick={() => setIsSetupOpen(true)}
                className="p-2 bg-slate-900 hover:bg-slate-800 rounded-full transition text-[#FFFDF9] cursor-pointer"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 text-[#FFFDF9]" />
              </button>
            </div>
          </header>

          {/* ACTIVE ROUTER SWITCHBOARD */}
          <main className="flex-1 flex flex-col relative">
            <Routes>
              {/* Redirect root to /dex */}
              <Route path="/" element={<Navigate to="/dex" replace />} />
              
              {/* Tab routes */}
              <Route path="/spot" element={
                <SpotTab
                  currentUser={currentUser}
                  existingCats={myCats}
                  onActionComplete={handleActionComplete}
                  onSelectCat={(cat) => navigate(`/cat/${cat.id}`)}
                />
              } />
              
              <Route path="/feed" element={
                <FeedTab
                  currentUser={currentUser}
                  existingCats={myCats}
                  preSelectedCat={null}
                  onClearPreSelected={() => navigate('/feed')}
                  onActionComplete={handleActionComplete}
                />
              } />

              <Route path="/feed/:id" element={<FeedRouteWrapper />} />

              <Route path="/dex" element={
                <DexTab
                  cats={myCats}
                  loading={loadingCats}
                  onSelect={(cat) => navigate(`/cat/${cat.id}`)}
                  onOpenScanner={() => navigate('/spot')}
                />
              } />

              <Route path="/map" element={
                <MapTab onSelectCat={(cat) => navigate(`/cat/${cat.id}`)} />
              } />

              <Route path="/profile" element={
                <ProfileTab
                  currentUser={currentUser}
                  cats={myCats}
                  onSelectCat={(cat) => navigate(`/cat/${cat.id}`)}
                  onLogout={handleLogout}
                />
              } />

              {/* Cat detail subpage */}
              <Route path="/cat/:id" element={<CatDetailWrapper />} />

              {/* Fallback to dex */}
              <Route path="*" element={<Navigate to="/dex" replace />} />
            </Routes>
          </main>

          {/* BOTTOM NAVIGATION TAB MATRIX (5 Tabs) */}
          <nav className="fixed bottom-0 inset-x-0 bg-[#1E1B18] border-t border-white/5 text-white z-30 py-2 px-3 flex justify-around items-center select-none shadow-2xl md:absolute md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[416px] md:rounded-full md:border md:border-white/10 font-sans">
            {/* Tab 1: Spot */}
            <button
              onClick={() => navigate('/spot')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-xl transition relative cursor-pointer ${
                currentTab === 'spot' ? 'text-[#FFFDF9]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[9px] font-display font-bold uppercase tracking-wider leading-none mt-1">Spot</span>
              {currentTab === 'spot' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute -bottom-2 inset-x-2 h-1 bg-[#D97706] rounded-full active-nav-underline"
                />
              )}
            </button>

            {/* Tab 2: Feed */}
            <button
              onClick={() => navigate('/feed')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-xl transition relative cursor-pointer ${
                currentTab === 'feed' ? 'text-[#FFFDF9]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Utensils className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[9px] font-display font-bold uppercase tracking-wider leading-none mt-1">Feed</span>
              {currentTab === 'feed' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute -bottom-2 inset-x-2 h-1 bg-[#D97706] rounded-full active-nav-underline"
                />
              )}
            </button>

            {/* Tab 3: Dex */}
            <button
              onClick={() => navigate('/dex')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-xl transition relative cursor-pointer ${
                currentTab === 'dex' ? 'text-[#FFFDF9]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[9px] font-display font-bold uppercase tracking-wider leading-none mt-1">Dex</span>
              {currentTab === 'dex' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute -bottom-2 inset-x-2 h-1 bg-[#D97706] rounded-full active-nav-underline"
                />
              )}
            </button>

            {/* Tab 4: Map */}
            <button
              onClick={() => navigate('/map')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-xl transition relative cursor-pointer ${
                currentTab === 'map' ? 'text-[#FFFDF9]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[9px] font-display font-bold uppercase tracking-wider leading-none mt-1">Map</span>
              {currentTab === 'map' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute -bottom-2 inset-x-2 h-1 bg-[#D97706] rounded-full active-nav-underline"
                />
              )}
            </button>

            {/* Tab 5: Profile */}
            <button
              onClick={() => navigate('/profile')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-xl transition relative cursor-pointer ${
                currentTab === 'profile' ? 'text-[#FFFDF9]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[9px] font-display font-bold uppercase tracking-wider leading-none mt-1">Ranks</span>
              {currentTab === 'profile' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute -bottom-2 inset-x-2 h-1 bg-[#D97706] rounded-full active-nav-underline"
                />
              )}
            </button>
          </nav>

        </div>
      )}

      {/* Setup credential overlay */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigSaved={handleConfigSaved}
      />

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainAppLayout />
    </Router>
  );
}
