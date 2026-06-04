import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'info', durationMs = 4000) {
    const id = this.nextId++;
    this._toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(msg: string) {
    this.show(msg, 'success');
  }
  error(msg: string) {
    this.show(msg, 'error');
  }
  info(msg: string) {
    this.show(msg, 'info');
  }

  dismiss(id: number) {
    this._toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
