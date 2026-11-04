import { Component, HostListener, Input, inject } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import type { PublicSettings, MenuItem, PublicTickerBar } from '@civicpress/shared';
import { TickerBarComponent } from './ticker-bar.component';
import { SocialLinksComponent } from './social-links.component';

@Component({
  selector: 'cp-header-logo',
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet, RouterModule, TickerBarComponent, SocialLinksComponent],
  template: `
    <header class="bg-white border-b border-gray-400 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div class="h-px w-full bg-black" aria-hidden="true"></div>

      <!-- Desktop rows -->
      <div class="hidden md:block">
        @if (aboveBar) {
          <div
            class="h-11"
            [style.background-color]="aboveBar.bgColor"
            [style.color]="aboveBar.textColor"
          >
            <div
              class="container page-container mx-auto px-3 md:px-4 h-full flex items-center gap-3"
            >
              <ng-container *ngTemplateOutlet="headerBarInner; context: { $implicit: aboveBar }" />
            </div>
          </div>
        }

        <div class="relative">
          <div
            class="absolute inset-x-0 top-0 h-11"
            [style.background-color]="
              logoTopBar?.bgColor || 'var(--ticker-bg, var(--color-primary))'
            "
            aria-hidden="true"
          ></div>
          <div
            class="absolute inset-x-0 top-11 h-11"
            [style.background-color]="logoBottomBar?.bgColor || '#ffffff'"
            aria-hidden="true"
          ></div>

          <div
            class="container page-container mx-auto px-3 md:px-4 relative z-10 flex items-stretch gap-3"
          >
            <a
              routerLink="/"
              (click)="onHomeIconClick($event)"
              class="relative z-30 flex shrink-0 items-center"
            >
              @if (settings?.logoUrl) {
                <img
                  [src]="settings!.logoUrl!"
                  [alt]="settings?.siteName ?? 'Civicpress'"
                  class="h-[79px] w-auto max-w-none object-contain"
                  loading="eager"
                />
              } @else {
                <span
                  class="text-3xl font-bold tracking-tight px-2 text-center"
                  style="color: var(--color-primary)"
                  >{{ settings?.siteName ?? 'Civicpress' }}</span
                >
              }
            </a>

            <div class="min-w-0 flex-1 flex flex-col">
              <div
                class="h-11 flex items-center gap-3 pr-2"
                [style.color]="logoTopBar?.textColor || 'var(--ticker-text, #fff)'"
              >
                @if (logoTopBar) {
                  <ng-container
                    *ngTemplateOutlet="headerBarInner; context: { $implicit: logoTopBar }"
                  />
                }
              </div>
              <div
                class="h-11 flex items-center gap-3 pr-2 border-t border-black/10"
                [style.color]="logoBottomBar?.textColor || '#374151'"
              >
                @if (logoBottomBar) {
                  <ng-container
                    *ngTemplateOutlet="headerBarInner; context: { $implicit: logoBottomBar }"
                  />
                }
              </div>
            </div>
          </div>
        </div>

        @if (belowBar) {
          <div
            class="h-11"
            [style.background-color]="belowBar.bgColor"
            [style.color]="belowBar.textColor"
          >
            <div
              class="container page-container mx-auto px-3 md:px-4 h-full flex items-center gap-3"
            >
              <ng-container *ngTemplateOutlet="headerBarInner; context: { $implicit: belowBar }" />
            </div>
          </div>
        }
      </div>

      <ng-template #headerBarInner let-bar>
        <div class="min-w-0 flex-1 h-full flex items-center">
          @if (bar.kind === 'ticker') {
            <cp-ticker-bar class="block w-full h-full min-w-0" [bar]="bar" />
          } @else {
            <nav class="flex min-w-0 flex-1 items-center justify-start h-full">
              <ul class="flex min-w-0 items-center gap-0 overflow-visible">
                @for (item of visibleItemsFor(bar); track item.id) {
                  <li
                    class="relative flex items-center"
                    (mouseenter)="openDesktopChildren(bar.id, item.id)"
                    (mouseleave)="closeDesktopChildren(bar.id, item.id)"
                  >
                    <a
                      [routerLink]="['/category', item.slug]"
                      routerLinkActive="is-active"
                      class="top-nav-link block px-3 py-2 uppercase tracking-wide whitespace-nowrap"
                      [style.color]="bar.textColor"
                      [style.font-size.px]="bar.fontSize"
                      [style.font-weight]="bar.fontWeight"
                    >
                      {{ item.name }}
                    </a>
                    @if (item.children?.length) {
                      <button
                        type="button"
                        (click)="toggleDesktopChildren($event, bar.id, item.id)"
                        aria-label="Deschide subcategoriile"
                        class="top-nav-link px-1 py-2"
                        [style.color]="bar.textColor"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                          [class.rotate-180]="isDesktopChildrenOpen(bar.id, item.id)"
                          class="transition-transform"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                          />
                        </svg>
                      </button>
                      @if (isDesktopChildrenOpen(bar.id, item.id)) {
                        <ul
                          class="absolute left-0 top-full z-40 mt-1 min-w-[220px] rounded-sm border border-gray-200 bg-white py-1 shadow-lg"
                        >
                          @for (child of item.children; track child.id) {
                            <li>
                              <a
                                [routerLink]="['/category', child.slug]"
                                class="top-nav-dropdown-link block px-4 py-2 text-sm font-medium text-gray-700 whitespace-nowrap"
                              >
                                {{ child.name }}
                              </a>
                            </li>
                          }
                        </ul>
                      }
                    }
                  </li>
                }
                @if (overflowItemsFor(bar).length) {
                  <li class="relative flex-shrink-0">
                    <button
                      type="button"
                      (click)="toggleMore($event, bar.id)"
                      [attr.aria-expanded]="isMoreOpen(bar.id)"
                      [class.is-active]="isMoreOpen(bar.id)"
                      class="top-nav-link flex items-center gap-1 px-3 py-2 uppercase tracking-wide whitespace-nowrap"
                      [style.color]="bar.textColor"
                      [style.font-size.px]="bar.fontSize"
                      [style.font-weight]="bar.fontWeight"
                    >
                      Mai multe
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        [class.rotate-180]="isMoreOpen(bar.id)"
                        class="transition-transform"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        />
                      </svg>
                    </button>
                    @if (isMoreOpen(bar.id)) {
                      <div class="fixed inset-0 z-30" (click)="closeMore()"></div>
                      <ul
                        class="absolute left-0 top-full z-40 mt-1 min-w-[200px] max-h-[70vh] overflow-y-auto rounded-sm border border-gray-200 bg-white py-1 shadow-lg"
                      >
                        @for (item of overflowItemsFor(bar); track item.id) {
                          <li>
                            <a
                              [routerLink]="['/category', item.slug]"
                              (click)="closeMore()"
                              routerLinkActive="is-active"
                              class="top-nav-dropdown-link block px-4 py-2 text-sm font-medium text-gray-700 whitespace-nowrap"
                            >
                              {{ item.name }}
                            </a>
                            @if (item.children?.length) {
                              <ul class="pb-1">
                                @for (child of item.children; track child.id) {
                                  <li>
                                    <a
                                      [routerLink]="['/category', child.slug]"
                                      (click)="closeMore()"
                                      class="top-nav-dropdown-link block pl-8 pr-4 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap"
                                    >
                                      {{ child.name }}
                                    </a>
                                  </li>
                                }
                              </ul>
                            }
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ul>
            </nav>
          }
        </div>
        @if (bar.showSearch) {
          <div class="flex-shrink-0 flex items-center gap-2">
            @if (searchOpen && searchBarId === bar.id) {
              <form (submit)="submitSearch($event)" class="contents">
                <input
                  type="search"
                  [attr.data-header-search]="bar.id"
                  [value]="searchQuery"
                  (input)="onSearchInput($event)"
                  (keydown.escape)="closeSearch()"
                  placeholder="Caută..."
                  aria-label="Introdu termenul de căutare"
                  class="w-40 lg:w-56 rounded border border-white/40 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </form>
            }
            <button
              type="button"
              aria-label="Caută"
              [attr.aria-expanded]="searchOpen && searchBarId === bar.id"
              (click)="toggleSearch(bar.id)"
              class="p-2 opacity-90 hover:opacity-100 transition-opacity rounded"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"
                />
              </svg>
            </button>
          </div>
        }
        @if (showSocialOn(bar)) {
          <cp-social-links
            class="flex-shrink-0"
            [settings]="settings"
            variant="header"
            placement="header"
            [inheritColor]="true"
          />
        }
      </ng-template>

      <!-- Mobile -->
      <div class="md:hidden">
        <div class="bg-[var(--color-primary)] text-white">
          <div
            class="container page-container mx-auto px-3 flex h-12 items-center justify-between gap-3"
          >
            <a
              routerLink="/"
              (click)="onHomeIconClick($event); closeMobileMenu(); closeMobileRowChildren()"
              class="flex-shrink-0 block min-w-0"
            >
              @if (mobileLogoUrl) {
                <img
                  [src]="mobileLogoUrl"
                  [alt]="settings?.siteName ?? 'Civicpress'"
                  class="h-8 w-auto max-w-[220px] object-contain"
                  loading="eager"
                />
              } @else {
                <span class="text-lg font-bold tracking-tight text-white">{{
                  settings?.siteName ?? 'Civicpress'
                }}</span>
              }
            </a>

            <button
              type="button"
              [attr.aria-label]="mobileMenuOpen ? 'Închide meniul' : 'Deschide meniul'"
              [attr.aria-expanded]="mobileMenuOpen"
              (click)="toggleMobileMenu()"
              class="p-2 text-white/90 hover:text-white transition-colors rounded"
            >
              @if (mobileMenuOpen) {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"
                  />
                </svg>
              } @else {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
                  />
                </svg>
              }
            </button>
          </div>
        </div>

        @if (mobileRowItems.length) {
          <div class="border-t border-gray-400 relative">
            <nav class="overflow-x-auto scrollbar-none" aria-label="Rând categorii">
              <ul class="flex items-center gap-0 px-2 min-w-min">
                @for (item of mobileRowItems; track item.id) {
                  <li class="relative flex items-center flex-shrink-0">
                    <a
                      [routerLink]="['/category', item.slug]"
                      routerLinkActive="is-active"
                      (click)="closeMobileRowChildren()"
                      class="top-nav-link block px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap"
                    >
                      {{ item.name }}
                    </a>
                    @if (item.children?.length) {
                      <button
                        type="button"
                        (click)="toggleMobileRowChildren($event, item.id)"
                        [attr.aria-expanded]="isMobileRowChildrenOpen(item.id)"
                        aria-label="Deschide subcategoriile"
                        class="top-nav-link px-1 py-2.5 text-gray-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="11"
                          height="11"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                          [class.rotate-180]="isMobileRowChildrenOpen(item.id)"
                          class="transition-transform"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                          />
                        </svg>
                      </button>
                    }
                  </li>
                }
              </ul>
            </nav>

            @if (mobileRowOpenChildrenId; as openId) {
              <div class="fixed inset-0 z-30" (click)="closeMobileRowChildren()"></div>
              @for (item of mobileRowItems; track item.id) {
                @if (item.id === openId && item.children?.length) {
                  <ul
                    class="absolute left-2 right-2 top-full z-40 mt-0 max-h-[60vh] overflow-y-auto rounded-sm border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    @for (child of item.children; track child.id) {
                      <li>
                        <a
                          [routerLink]="['/category', child.slug]"
                          (click)="closeMobileRowChildren()"
                          class="top-nav-dropdown-link block px-4 py-2.5 text-sm font-medium text-gray-700"
                        >
                          {{ child.name }}
                        </a>
                      </li>
                    }
                  </ul>
                }
              }
            }
          </div>
        }

        @if (mobileMenuOpen) {
          <nav class="border-t border-black/10 bg-white" aria-label="Meniu categorii">
            <form
              (submit)="submitMobileSearch($event)"
              class="relative border-b border-gray-400 p-3"
            >
              <input
                type="search"
                [value]="mobileSearchQuery"
                (input)="onMobileSearchInput($event)"
                placeholder="Caută..."
                aria-label="Introdu termenul de căutare"
                class="w-full rounded border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-800 placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                aria-label="Caută"
                class="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"
                  />
                </svg>
              </button>
            </form>

            <ul class="max-h-[70vh] overflow-y-auto py-1">
              @for (item of mobileMenuItems; track item.id) {
                <li class="border-b border-gray-100 last:border-b-0">
                  <div class="flex items-center">
                    <a
                      [routerLink]="['/category', item.slug]"
                      routerLinkActive="is-active"
                      (click)="closeMobileMenu()"
                      class="top-nav-link min-w-0 flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wide text-gray-700"
                    >
                      {{ item.name }}
                    </a>
                    @if (item.children?.length) {
                      <button
                        type="button"
                        (click)="toggleMobileChildren($event, item.id)"
                        [attr.aria-expanded]="isMobileChildrenOpen(item.id)"
                        aria-label="Deschide subcategoriile"
                        class="px-4 py-3 text-gray-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                          [class.rotate-180]="isMobileChildrenOpen(item.id)"
                          class="transition-transform"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                          />
                        </svg>
                      </button>
                    }
                  </div>
                  @if (isMobileChildrenOpen(item.id) && item.children?.length) {
                    <ul class="bg-gray-50 pb-1">
                      @for (child of item.children; track child.id) {
                        <li>
                          <a
                            [routerLink]="['/category', child.slug]"
                            (click)="closeMobileMenu()"
                            class="top-nav-dropdown-link block px-8 py-2.5 text-sm font-medium text-gray-700"
                          >
                            {{ child.name }}
                          </a>
                        </li>
                      }
                    </ul>
                  }
                </li>
              }
            </ul>
            <cp-social-links [settings]="settings" variant="mobile" placement="mobile" />
          </nav>
        }
      </div>
    </header>
  `,
  styles: [
    `
      .top-nav-link {
        position: relative;
        border-radius: 0.125rem;
        transition:
          color 180ms ease,
          transform 120ms ease;
      }

      .top-nav-link::after {
        content: '';
        position: absolute;
        left: 0.75rem;
        right: 0.75rem;
        bottom: 0.2rem;
        height: 2px;
        border-radius: 2px;
        background-color: var(--color-primary, #1d4ed8);
        transform: scaleX(0);
        transform-origin: center;
        transition: transform 180ms ease;
      }

      .top-nav-link:hover {
        color: var(--color-primary, #1d4ed8);
      }

      .top-nav-link:hover::after,
      .top-nav-link.is-active::after {
        transform: scaleX(1);
      }

      .top-nav-link.is-active {
        color: var(--color-primary, #1d4ed8);
      }

      .top-nav-link:active {
        transform: translateY(1px);
      }

      .top-nav-dropdown-link {
        border-left: 2px solid transparent;
        transition:
          color 180ms ease,
          border-color 180ms ease,
          background-color 180ms ease;
      }

      .top-nav-dropdown-link:hover,
      .top-nav-dropdown-link.is-active {
        color: var(--color-primary, #1d4ed8);
        border-left-color: var(--color-primary, #1d4ed8);
        background-color: rgba(0, 0, 0, 0.04);
      }

      .top-nav-dropdown-link:active {
        transform: translateY(1px);
      }

      .scrollbar-none {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class HeaderLogoComponent {
  private router = inject(Router);

  @Input() settings: PublicSettings | null = null;
  @Input() menuItems: MenuItem[] = [];
  @Input() mobileMenuItems: MenuItem[] = [];
  @Input() mobileRowItems: MenuItem[] = [];
  @Input() tickerBars: PublicTickerBar[] = [];

  moreOpenBarId: string | null = null;
  searchOpen = false;
  searchBarId: string | null = null;
  searchQuery = '';
  mobileMenuOpen = false;
  mobileSearchQuery = '';
  desktopOpenKey: string | null = null;
  mobileOpenChildrenId: string | null = null;
  mobileRowOpenChildrenId: string | null = null;

  get mobileLogoUrl(): string | null {
    return this.settings?.mobileLogoUrl || this.settings?.logoUrl || null;
  }

  get aboveBar(): PublicTickerBar | null {
    return this.barBySlot('above');
  }

  get logoTopBar(): PublicTickerBar | null {
    return this.barBySlot('logo-top');
  }

  get logoBottomBar(): PublicTickerBar | null {
    return this.barBySlot('logo-bottom');
  }

  get belowBar(): PublicTickerBar | null {
    return this.barBySlot('below');
  }

  private barBySlot(slot: PublicTickerBar['slot']): PublicTickerBar | null {
    const found = this.tickerBars.find((bar) => bar.slot === slot);
    if (found) return found;
    const hasSlots = this.tickerBars.some((bar) => !!bar.slot);
    if (hasSlots) return null;
    return slot === 'logo-top' ? (this.tickerBars[0] ?? null) : null;
  }

  showSocialOn(bar: PublicTickerBar): boolean {
    return bar.showSocial && this.settings?.showSocialInHeader !== false;
  }

  visibleItemsFor(bar: PublicTickerBar): MenuItem[] {
    const items = bar.menuItems ?? [];
    const max = bar.headerMaxCategories > 0 ? bar.headerMaxCategories : 6;
    if (!bar.headerShowMoreDropdown) return items.slice(0, max);
    const explicit = this.explicitOverflowFor(bar);
    if (explicit.length) {
      const dropdownIds = new Set(explicit.map((item) => item.id));
      return items.filter((item) => !dropdownIds.has(item.id));
    }
    return items.slice(0, max);
  }

  overflowItemsFor(bar: PublicTickerBar): MenuItem[] {
    if (!bar.headerShowMoreDropdown) return [];
    const explicit = this.explicitOverflowFor(bar);
    if (explicit.length) return explicit;
    const items = bar.menuItems ?? [];
    const max = bar.headerMaxCategories > 0 ? bar.headerMaxCategories : 6;
    return items.slice(max);
  }

  private explicitOverflowFor(bar: PublicTickerBar): MenuItem[] {
    const selectedIds = bar.headerMoreCategoryIds ?? [];
    if (!selectedIds.length) return [];
    const selectedSet = new Set(selectedIds);
    return (bar.menuItems ?? []).filter((item) => selectedSet.has(item.id));
  }

  toggleMore(event: Event, barId: string) {
    event.stopPropagation();
    this.moreOpenBarId = this.moreOpenBarId === barId ? null : barId;
    if (!this.moreOpenBarId) this.desktopOpenKey = null;
  }

  isMoreOpen(barId: string) {
    return this.moreOpenBarId === barId;
  }

  closeMore() {
    this.moreOpenBarId = null;
    this.desktopOpenKey = null;
  }

  private childKey(barId: string, itemId: string) {
    return `${barId}:${itemId}`;
  }

  toggleDesktopChildren(event: Event, barId: string, itemId: string) {
    event.stopPropagation();
    const key = this.childKey(barId, itemId);
    this.desktopOpenKey = this.desktopOpenKey === key ? null : key;
  }

  openDesktopChildren(barId: string, itemId: string) {
    this.desktopOpenKey = this.childKey(barId, itemId);
  }

  closeDesktopChildren(barId: string, itemId: string) {
    if (this.desktopOpenKey === this.childKey(barId, itemId)) this.desktopOpenKey = null;
  }

  isDesktopChildrenOpen(barId: string, itemId: string) {
    return this.desktopOpenKey === this.childKey(barId, itemId);
  }

  toggleSearch(barId: string) {
    if (this.searchOpen && this.searchBarId === barId) {
      if (this.searchQuery.trim()) {
        this.navigateToSearch(this.searchQuery);
        this.searchQuery = '';
      }
      this.searchOpen = false;
      this.searchBarId = null;
      return;
    }
    this.searchOpen = true;
    this.searchBarId = barId;
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`[data-header-search="${barId}"]`);
      input?.focus();
    }, 0);
  }

  closeSearch() {
    this.searchOpen = false;
    this.searchBarId = null;
  }

  onSearchInput(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  submitSearch(event: Event) {
    event.preventDefault();
    this.navigateToSearch(this.searchQuery);
    this.searchOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.closeMobileRowChildren();
    } else {
      this.closeMobileChildren();
      this.mobileSearchQuery = '';
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.closeMobileChildren();
    this.mobileSearchQuery = '';
  }

  onMobileSearchInput(event: Event) {
    this.mobileSearchQuery = (event.target as HTMLInputElement).value;
  }

  submitMobileSearch(event: Event) {
    event.preventDefault();
    this.navigateToSearch(this.mobileSearchQuery);
    this.closeMobileMenu();
  }

  private navigateToSearch(rawQuery: string) {
    const q = rawQuery.trim();
    if (!q) return;
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  toggleMobileChildren(event: Event, id: string) {
    event.stopPropagation();
    this.mobileOpenChildrenId = this.mobileOpenChildrenId === id ? null : id;
  }

  closeMobileChildren() {
    this.mobileOpenChildrenId = null;
  }

  isMobileChildrenOpen(id: string) {
    return this.mobileOpenChildrenId === id;
  }

  toggleMobileRowChildren(event: Event, id: string) {
    event.stopPropagation();
    this.closeMobileChildren();
    this.mobileRowOpenChildrenId = this.mobileRowOpenChildrenId === id ? null : id;
  }

  closeMobileRowChildren() {
    this.mobileRowOpenChildrenId = null;
  }

  isMobileRowChildrenOpen(id: string) {
    return this.mobileRowOpenChildrenId === id;
  }

  onHomeIconClick(event: Event) {
    if (!this.isOnHomePage()) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.reload();
  }

  private isOnHomePage(): boolean {
    const browserPath = window.location.pathname.replace(/\/+$/, '') || '/';
    if (browserPath === '/') return true;
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/' || path === '';
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMore();
    this.closeSearch();
    this.closeMobileMenu();
    this.closeMobileRowChildren();
  }
}
