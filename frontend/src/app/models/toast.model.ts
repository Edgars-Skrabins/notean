export enum ToastType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastOptions {
  type: ToastType;
  message: string;
  action?: ToastAction;
}

export interface Toast extends ToastOptions {
  id: number;
  leaving: boolean;
}
