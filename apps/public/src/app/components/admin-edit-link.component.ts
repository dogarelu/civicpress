import { Component, Input, OnInit, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AdminSessionService } from '../services/admin-session.service';

@Component({
  selector: 'cp-admin-edit-link',
  standalone: true,
  template: `
    @if (show()) {
      <a
        [href]="'/admin/posts/' + postId + '/edit'"
        class="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Editează în Admin"
        title="Editează în Admin"
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        @if (!compact) {
          <span>Editeaza</span>
        }
      </a>
    }
  `,
})
export class AdminEditLinkComponent implements OnInit {
  @Input() postId: string | null = null;
  @Input() compact = true;

  private adminSession = inject(AdminSessionService);
  private platformId = inject(PLATFORM_ID);

  show = computed(() => !!this.postId && this.adminSession.canEditPosts());

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.adminSession.hydrate();
    }
  }
}
