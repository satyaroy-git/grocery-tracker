export const COLORS = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  primaryLight: '#81C784',
  secondary: '#FF9800',
  secondaryLight: '#FFB74D',
  accent: '#2196F3',
  danger: '#F44336',
  dangerLight: '#EF9A9A',
  dangerBg: '#FDECEA',
  warning: '#FFC107',
  warningLight: '#FFE082',
  warningBg: '#FFF8E1',
  success: '#4CAF50',
  successLight: '#A5D6A7',
  successBg: '#E8F5E9',

  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',

  text: '#212121',
  textSecondary: '#757575',
  textLight: '#BDBDBD',
  textOnPrimary: '#FFFFFF',

  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
  full: 9999, // alias for round - some screens reference BORDER_RADIUS.full
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
