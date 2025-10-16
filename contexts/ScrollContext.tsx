import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScrollContextType {
  scrollY: number;
  setScrollY: (y: number) => void;
  isScrollingDown: boolean;
  setIsScrollingDown: (isDown: boolean) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);

  return (
    <ScrollContext.Provider value={{ scrollY, setScrollY, isScrollingDown, setIsScrollingDown }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};
