import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

interface AuthUser {
  id: string;
  email: string;
}

const TOKEN_KEY = 'bf_token';

/**
 * AuthService — passwordless (magic-link / OTP) authentication, mirroring the
 * React build's login/verify flow. When `cloudEnabled` is false the service is
 * inert: no token, no network on boot, `isAuthed` is always false. This is what
 * lets the whole auth surface be feature-flagged off for local-only builds.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly token = signal<string | null>(
    environment.cloudEnabled ? localStorage.getItem(TOKEN_KEY) : null,
  );
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthed = computed(() => !!this.token());

  /** Request a one-time login code for the given email. */
  async requestCode(email: string): Promise<void> {
    if (!environment.cloudEnabled) return;
    await firstValueFrom(this.http.post('/auth/request', { email }));
  }

  /** Exchange the emailed code for a session token. */
  async verify(email: string, code: string): Promise<void> {
    if (!environment.cloudEnabled) return;
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>('/auth/verify', { email, code }),
    );
    this.token.set(res.token);
    this.user.set(res.user);
    localStorage.setItem(TOKEN_KEY, res.token);
  }

  /** Load the current user; skipped entirely when cloud is disabled. */
  async loadMe(): Promise<void> {
    if (!environment.cloudEnabled || !this.token()) return;
    const me = await firstValueFrom(this.http.get<AuthUser>('/me'));
    this.user.set(me);
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }
}
