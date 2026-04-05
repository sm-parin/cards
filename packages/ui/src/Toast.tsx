import type { Toast as ToastType, ToastVariant } from '@cards/hooks';
import { colors, zIndex } from '@cards/theme';

interface ToastListProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

const VARIANT_COLORS: Record<ToastVariant, { bg: string; text: string; border: string }> = {
  success: { bg: colors.successMuted, text: colors.success, border: colors.success },
  error:   { bg: colors.dangerMuted,  text: colors.danger,  border: colors.danger  },
  warning: { bg: colors.warningMuted, text: colors.warning, border: colors.warning },
  info:    { bg: colors.infoMuted,    text: colors.info,    border: colors.info    },
};

export function ToastList({ toasts, onDismiss }: ToastListProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position:      'fixed',
      bottom:        '24px',
      left:          '50%',
      transform:     'translateX(-50%)',
      display:       'flex',
      flexDirection: 'column',
      gap:           '8px',
      zIndex:        zIndex.toast,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const vc = VARIANT_COLORS[toast.variant];
        return (
          <div
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            style={{
              background:   vc.bg,
              color:        vc.text,
              border:       `1px solid ${vc.border}`,
              borderRadius: '8px',
              padding:      '10px 16px',
              fontSize:     '14px',
              fontWeight:   500,
              cursor:       'pointer',
              pointerEvents:'all',
              whiteSpace:   'nowrap',
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
