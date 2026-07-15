import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { PublicSettings, MenuItem, ExchangeRate } from '@civicpress/shared';
import { ExchangeTickerComponent } from './exchange-ticker.component';

@Component({
  selector: 'cp-header-logo',
  standalone: true,
  imports: [CommonModule, RouterModule, ExchangeTickerComponent],
  template: `
    <header class="bg-white border-b border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div class="h-px w-full bg-black" aria-hidden="true"></div>

      <!-- Desktop rows -->
      <div class="hidden md:block relative">
        <!-- full-bleed red band behind the top row -->
        <div
          class="absolute inset-x-0 top-0 h-11 bg-[var(--color-primary)]"
          aria-hidden="true"
        ></div>

        <div
          class="container page-container mx-auto px-3 md:px-4 relative z-10 flex items-stretch gap-3"
        >
          <!-- Logo bridges both rows -->
          <a routerLink="/" class="relative z-30 flex shrink-0 items-center">
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
            <!-- Top row: ticker + search -->
            <div class="h-11 flex items-center text-white pr-2">
              <div class="min-w-0 flex-1">
                <cp-exchange-ticker [rates]="exchangeRates" [embedded]="true" />
              </div>
              <div class="ml-3 flex-shrink-0 flex items-center gap-2">
                @if (searchOpen) {
                  <input
                    #searchInput
                    type="search"
                    [value]="searchQuery"
                    (input)="onSearchInput($event)"
                    (keydown.escape)="closeSearch()"
                    placeholder="Caută..."
                    aria-label="Introdu termenul de căutare"
                    class="w-40 lg:w-56 rounded border border-white/40 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                }
                <button
                  type="button"
                  aria-label="Caută"
                  [attr.aria-expanded]="searchOpen"
                  (click)="toggleSearch()"
                  class="p-2 text-white/90 hover:text-white transition-colors rounded"
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
            </div>

            <!-- Bottom row: menu -->
            <div class="h-11 flex items-center border-t border-gray-200">
              <nav class="flex min-w-0 items-center justify-start">
                <ul class="flex min-w-0 items-center gap-0 overflow-visible">
                  @for (item of visibleItems; track item.id) {
                    <li
                      class="relative flex items-center"
                      (mouseenter)="openDesktopChildren(item.id)"
                      (mouseleave)="closeDesktopChildren(item.id)"
                    >
                      <a
                        [routerLink]="['/category', item.slug]"
                        routerLinkActive="is-active"
                        class="top-nav-link block px-3 py-2 text-sm font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap"
                      >
                        {{ item.name }}
                      </a>
                      @if (item.children?.length) {
                        <button
                          type="button"
                          (click)="toggleDesktopChildren($event, item.id)"
                          aria-label="Deschide subcategoriile"
                          class="top-nav-link px-1 py-2 text-gray-500 hover:text-primary"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            [class.rotate-180]="isDesktopChildrenOpen(item.id)"
                            class="transition-transform"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                            />
                          </svg>
                        </button>
                        @if (isDesktopChildrenOpen(item.id)) {
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
                  @if (overflowItems.length) {
                    <li class="relative flex-shrink-0">
                      <button
                        type="button"
                        (click)="toggleMore($event)"
                        [attr.aria-expanded]="moreOpen"
                        [class.is-active]="moreOpen"
                        class="top-nav-link flex items-center gap-1 px-3 py-2 text-sm font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap"
                      >
                        Mai multe
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                          [class.rotate-180]="moreOpen"
                          class="transition-transform"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                          />
                        </svg>
                      </button>
                      @if (moreOpen) {
                        <div class="fixed inset-0 z-30" (click)="closeMore()"></div>
                        <ul
                          class="absolute left-0 top-full z-40 mt-1 min-w-[200px] max-h-[70vh] overflow-y-auto rounded-sm border border-gray-200 bg-white py-1 shadow-lg"
                        >
                          @for (item of overflowItems; track item.id) {
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
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile -->
      <div class="container page-container mx-auto px-3 md:px-4">
        <div class="flex md:hidden h-14 items-center justify-between gap-3">
          <a routerLink="/" class="flex-shrink-0 block">
            @if (settings?.logoUrl) {
              <img
                [src]="settings!.logoUrl!"
                [alt]="settings?.siteName ?? 'Civicpress'"
                class="h-10 w-auto object-contain"
                loading="eager"
              />
            } @else {
              <span class="text-xl font-bold tracking-tight" style="color: var(--color-primary)">{{
                settings?.siteName ?? 'Civicpress'
              }}</span>
            }
          </a>

          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="Meniu"
              [attr.aria-expanded]="mobileMenuOpen"
              (click)="toggleMobileMenu()"
              class="p-2 text-gray-700 hover:text-primary transition-colors rounded"
            >
              @if (mobileMenuOpen) {
                <!-- X icon -->
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
                <!-- Hamburger icon -->
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
      </div>

      <!-- Mobile dropdown menu -->
      @if (mobileMenuOpen) {
        <div class="md:hidden border-t border-gray-200 bg-white shadow-md">
          <!-- Search row -->
          <div class="px-3 md:px-4 py-3 border-b border-gray-100">
            <div
              class="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 bg-gray-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                class="text-gray-400 flex-shrink-0"
                viewBox="0 0 16 16"
              >
                <path
                  d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"
                />
              </svg>
              <input
                #mobileSearchInput
                type="search"
                placeholder="Caută..."
                aria-label="Caută"
                class="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
              />
            </div>
          </div>
          <!-- Nav links -->
          <nav>
            <ul class="py-1">
              @for (item of allMobileItems; track item.id) {
                <li>
                  <div class="border-b border-gray-100 last:border-b-0">
                    <div class="flex items-center">
                      <a
                        [routerLink]="['/category', item.slug]"
                        routerLinkActive="mobile-nav-active"
                        (click)="closeMobileMenu()"
                        class="mobile-nav-link flex-1 block px-5 py-3 text-sm font-bold uppercase tracking-wide text-gray-700"
                        >{{ item.name }}</a
                      >
                      @if (item.children?.length) {
                        <button
                          type="button"
                          (click)="toggleMobileChildren(item.id)"
                          [attr.aria-expanded]="isMobileChildrenOpen(item.id)"
                          class="px-4 py-3 text-gray-500"
                          aria-label="Deschide subcategoriile"
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
                    @if (item.children?.length && isMobileChildrenOpen(item.id)) {
                      <ul class="pb-2">
                        @for (child of item.children; track child.id) {
                          <li>
                            <a
                              [routerLink]="['/category', child.slug]"
                              (click)="closeMobileMenu()"
                              class="mobile-nav-link block pl-9 pr-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600"
                            >
                              {{ child.name }}
                            </a>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                </li>
              }
            </ul>
          </nav>
        </div>
      }
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

      .mobile-nav-link {
        transition:
          color 150ms ease,
          background-color 150ms ease;
      }

      .mobile-nav-link:hover,
      .mobile-nav-link.mobile-nav-active {
        color: var(--color-primary, #1d4ed8);
        background-color: rgba(0, 0, 0, 0.03);
      }
    `,
  ],
})
export class HeaderLogoComponent {
  @Input() settings: PublicSettings | null = null;
  @Input() menuItems: MenuItem[] = [];
  @Input() exchangeRates: ExchangeRate[] = [];
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  moreOpen = false;
  searchOpen = false;
  searchQuery = '';
  mobileMenuOpen = false;
  desktopOpenChildrenId: string | null = null;
  mobileOpenChildrenIds = new Set<string>();

  private get maxCategories(): number {
    const max = this.settings?.headerMaxCategories ?? 6;
    return max > 0 ? max : 6;
  }

  private get explicitDropdownItems(): MenuItem[] {
    if (!this.settings?.headerShowMoreDropdown) return [];
    const selectedIds = this.settings.headerMoreCategoryIds ?? [];
    if (!selectedIds.length) return [];
    const selectedSet = new Set(selectedIds);
    return this.menuItems.filter((item) => selectedSet.has(item.id));
  }

  private get hasExplicitDropdownSelection(): boolean {
    return this.explicitDropdownItems.length > 0;
  }

  private get cappedMenuItems(): MenuItem[] {
    return this.menuItems.slice(0, this.maxCategories);
  }

  get visibleItems(): MenuItem[] {
    if (!this.settings?.headerShowMoreDropdown) return this.cappedMenuItems;
    if (this.hasExplicitDropdownSelection) {
      const dropdownIds = new Set(this.explicitDropdownItems.map((item) => item.id));
      return this.menuItems.filter((item) => !dropdownIds.has(item.id));
    }
    return this.cappedMenuItems;
  }

  get overflowItems(): MenuItem[] {
    if (!this.settings?.headerShowMoreDropdown) return [];
    if (this.hasExplicitDropdownSelection) return this.explicitDropdownItems;
    return this.menuItems.slice(this.maxCategories);
  }

  /** All items for the mobile menu — flat list, no overflow grouping. */
  get allMobileItems(): MenuItem[] {
    return this.settings?.headerShowMoreDropdown ? this.menuItems : this.cappedMenuItems;
  }

  toggleMore(event: Event) {
    event.stopPropagation();
    this.moreOpen = !this.moreOpen;
    if (!this.moreOpen) this.desktopOpenChildrenId = null;
  }

  closeMore() {
    this.moreOpen = false;
    this.desktopOpenChildrenId = null;
  }

  toggleDesktopChildren(event: Event, id: string) {
    event.stopPropagation();
    this.desktopOpenChildrenId = this.desktopOpenChildrenId === id ? null : id;
  }

  openDesktopChildren(id: string) {
    this.desktopOpenChildrenId = id;
  }

  closeDesktopChildren(id: string) {
    if (this.desktopOpenChildrenId === id) this.desktopOpenChildrenId = null;
  }

  isDesktopChildrenOpen(id: string) {
    return this.desktopOpenChildrenId === id;
  }

  toggleSearch() {
    this.searchOpen = !this.searchOpen;
    if (this.searchOpen) {
      setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    } else {
      this.searchQuery = '';
    }
  }

  closeSearch() {
    this.searchOpen = false;
  }

  onSearchInput(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (!this.mobileMenuOpen) this.mobileOpenChildrenIds.clear();
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.mobileOpenChildrenIds.clear();
  }

  toggleMobileChildren(id: string) {
    if (this.mobileOpenChildrenIds.has(id)) {
      this.mobileOpenChildrenIds.delete(id);
    } else {
      this.mobileOpenChildrenIds.add(id);
    }
  }

  isMobileChildrenOpen(id: string) {
    return this.mobileOpenChildrenIds.has(id);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.mobileMenuOpen = false;
    this.moreOpen = false;
    this.desktopOpenChildrenId = null;
    this.mobileOpenChildrenIds.clear();
  }
}
