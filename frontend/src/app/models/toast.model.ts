export enum ToastType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface ToastOptions {
  type: ToastType;
  message: string;
}

export interface Toast extends ToastOptions {
  id: number;
  leaving: boolean;
}
