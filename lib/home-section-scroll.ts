export const HOME_SECTION_NAV_EVENT = "binblast:home-section-nav";

export function scrollToHomeSectionElement(sectionId: string): boolean {
  if (typeof window === "undefined" || !sectionId) return false;

  const targetElement = document.getElementById(sectionId);
  if (!targetElement) return false;

  targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${sectionId}`);
  return true;
}

/** Scroll to a homepage section, coordinating with the mobile nav lock when open. */
export function requestHomeSectionScroll(sectionId: string): void {
  if (typeof window === "undefined" || !sectionId) return;

  if (document.body.classList.contains("nav-menu-open")) {
    window.dispatchEvent(
      new CustomEvent(HOME_SECTION_NAV_EVENT, { detail: { sectionId } })
    );
    return;
  }

  scrollToHomeSectionElement(sectionId);
}
