import { useState, useEffect } from 'react';

/**
 * Hook para determinar o tipo de visualização de detalhes do lead baseado no tamanho da tela
 * Desktop (≥900px): Modal centralizado
 * Mobile (<900px): Sidebar
 */
export const useResponsiveLeadDetail = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!isInitialized) setIsInitialized(true);
    };

    // Verificar inicialmente
    checkMobile();

    // Adicionar listener para resize
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isInitialized]);

  return {
    isMobile,
    isInitialized,
    // Desktop: modal, Mobile: sidebar
    detailType: isMobile ? 'sidebar' : 'modal' as 'modal' | 'sidebar',
    // Breakpoint usado (pode ser útil para outros componentes)
    breakpoint: 900
  };
};