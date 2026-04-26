import type { ReactNode } from 'react';
import { useResponsiveLeadDetail } from '../hooks/useResponsiveLeadDetail';

interface ResponsiveDetailPanelProps {
  leadId: string | null;
  onClose: () => void;
  children: ReactNode;
}

export default function ResponsiveDetailPanel({ leadId, onClose, children }: ResponsiveDetailPanelProps) {
  const { isMobile, detailType } = useResponsiveLeadDetail();

  if (!leadId) return null;

  // Modal para desktop (≥900px)
  if (detailType === 'modal') {
    return (
      <div
        className="modal-overlay open"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(0, 0, 0, 0.55)'
        }}
      >
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 600,
            width: '90vw',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(10, 11, 16, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Sidebar para mobile (<900px)
  return (
    <>
      <div
        className="detail-overlay open"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(0, 0, 0, 0.55)'
        }}
      />
      <div
        className="detail-panel open"
        style={{
          width: '100%',
          maxWidth: '100%',
          background: 'rgba(10, 11, 16, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
        }}
      >
        {children}
      </div>
    </>
  );
}