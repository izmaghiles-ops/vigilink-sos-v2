import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Heart, ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import { SponsorView } from './views/SponsorView';
import { AlzheimerSponsorView } from './views/AlzheimerSponsorView';
import { useTranslation } from 'react-i18next';

interface Props {
  homeContent: React.ReactNode;
}

const SWIPE_THRESHOLD = 40;
const PANELS = ['sponsor', 'home', 'alzheimer'] as const;
type PanelId = typeof PANELS[number];

const PANEL_INFO: Record<PanelId, { titleKey: string; descKey: string; icon: React.ReactNode }> = {
  sponsor: {
    titleKey: 'swipe.sponsorTitle',
    descKey: 'swipe.sponsorDesc',
    icon: <Users size={28} className="text-amber-400" />,
  },
  home: {
    titleKey: 'swipe.homeTitle',
    descKey: 'swipe.homeDesc',
    icon: null,
  },
  alzheimer: {
    titleKey: 'swipe.alzheimerTitle',
    descKey: 'swipe.alzheimerDesc',
    icon: <Heart size={28} className="text-rose-400" />,
  },
};

const SwipeablePlatinumHome: React.FC<Props> = ({ homeContent }) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [direction, setDirection] = useState(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping = useRef(false);

  const goTo = useCallback((index: number, dir: number) => {
    if (index < 0 || index >= PANELS.length) return;
    setDirection(dir);
    setActiveIndex(index);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        goTo(activeIndex + 1, 1);
      } else {
        goTo(activeIndex - 1, -1);
      }
    }
  }, [activeIndex, goTo]);

  const currentPanel = PANELS[activeIndex];
  const panelMeta = PANEL_INFO[currentPanel];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div
      className="w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-center items-center gap-2 py-3 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <button
          onClick={() => goTo(activeIndex - 1, -1)}
          disabled={activeIndex === 0}
          className="p-1.5 rounded-full disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={22} />
        </button>

        {PANELS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
            className={`transition-all duration-300 rounded-full ${
              i === activeIndex
                ? 'w-8 h-2.5 bg-amber-400'
                : 'w-2.5 h-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'
            }`}
            aria-label={`Panel ${i + 1}`}
          />
        ))}

        <button
          onClick={() => goTo(activeIndex + 1, 1)}
          disabled={activeIndex === PANELS.length - 1}
          className="p-1.5 rounded-full disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={22} />
        </button>

        {currentPanel !== 'home' && (
          <button
            onClick={() => setShowInfo(true)}
            className="ml-1 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center"
            aria-label="Info"
          >
            <Info size={18} className="text-amber-400" />
          </button>
        )}
      </div>

      <div className="flex justify-center gap-6 pb-2 text-xs text-muted-foreground">
        <span className={activeIndex === 0 ? 'text-amber-400 font-bold' : ''}>
          ← {t('swipe.sponsorLabel')}
        </span>
        <span className={activeIndex === 1 ? 'text-amber-400 font-bold' : ''}>
          {t('swipe.homeLabel')}
        </span>
        <span className={activeIndex === 2 ? 'text-amber-400 font-bold' : ''}>
          {t('swipe.alzheimerLabel')} →
        </span>
      </div>

      {currentPanel !== 'home' && (
        <div className="flex items-center gap-2 px-5 pb-2">
          {panelMeta.icon}
          <h2 className="text-lg font-bold text-foreground">
            {t(panelMeta.titleKey)}
          </h2>
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPanel}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', duration: 0.25 }}
          className="w-full min-h-[200px]"
        >
          {currentPanel === 'home' && homeContent}
          {currentPanel === 'sponsor' && (
            <div className="px-1">
              <SponsorView />
            </div>
          )}
          {currentPanel === 'alzheimer' && (
            <div className="px-1">
              <AlzheimerSponsorView />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {panelMeta.icon}
                  <h3 className="text-lg font-bold text-foreground">
                    {t(panelMeta.titleKey)}
                  </h3>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {t(panelMeta.descKey)}
              </p>
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {t('swipe.navHint')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwipeablePlatinumHome;
