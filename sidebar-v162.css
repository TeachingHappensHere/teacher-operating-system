
/* Version 16.2 — Navigation & Collapsible Sidebar */
:root {
  --v162-sidebar-expanded: var(--sidebar, 270px);
  --v162-sidebar-collapsed: 82px;
}

#sidebar {
  overflow: hidden !important;
}

#sidebar .brand {
  flex: 0 0 auto;
}

#mainNav {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 3px;
}

/* Visible, easy-to-grab navigation scrollbar */
#mainNav {
  scrollbar-width: auto;
  scrollbar-color: rgba(157,32,58,.52) rgba(255,255,255,.34);
}

#mainNav::-webkit-scrollbar {
  width: 12px;
}

#mainNav::-webkit-scrollbar-track {
  margin: 4px 0;
  border-radius: 999px;
  background: rgba(255,255,255,.38);
}

#mainNav::-webkit-scrollbar-thumb {
  min-height: 48px;
  border: 3px solid transparent;
  border-radius: 999px;
  background: rgba(157,32,58,.50);
  background-clip: padding-box;
}

#mainNav::-webkit-scrollbar-thumb:hover {
  background: rgba(157,32,58,.74);
  background-clip: padding-box;
}

.v162-sidebar-controls {
  display: grid;
  grid-template-columns: minmax(0,1fr) 42px;
  gap: 7px;
  flex: 0 0 auto;
  padding: 0 6px;
}

.v162-sidebar-controls button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255,255,255,.70);
  color: var(--accent-dark);
  font-weight: 800;
}

.v162-sidebar-controls button:hover {
  background: #fff;
}

.v162-sidebar-controls button span {
  line-height: 1;
}

.v162-sidebar-controls button strong {
  font-size: 11px;
}

.sidebar-reminder,
#customizeButton {
  flex: 0 0 auto;
}

/* Desktop collapsed icon rail */
@media (min-width: 761px) {
  body.v162-sidebar-collapsed .app-shell {
    grid-template-columns: var(--v162-sidebar-collapsed) minmax(0,1fr);
  }

  body.v162-sidebar-collapsed #sidebar {
    width: var(--v162-sidebar-collapsed);
    padding-inline: 8px;
  }

  body.v162-sidebar-collapsed #sidebar .brand {
    justify-content: center;
    padding-inline: 0;
  }

  body.v162-sidebar-collapsed #sidebar .brand > div:last-child,
  body.v162-sidebar-collapsed #sidebar .sidebar-reminder,
  body.v162-sidebar-collapsed #sidebar #customizeButton,
  body.v162-sidebar-collapsed .v162-sidebar-controls button strong,
  body.v162-sidebar-collapsed .v110-nav-heading > span,
  body.v162-sidebar-collapsed .v110-nav-heading > b,
  body.v162-sidebar-collapsed .v110-route > strong,
  body.v162-sidebar-collapsed .v110-route.active::after {
    display: none !important;
  }

  body.v162-sidebar-collapsed #sidebar .brand-mark {
    font-size: 28px;
  }

  body.v162-sidebar-collapsed .v162-sidebar-controls {
    grid-template-columns: 1fr;
    padding: 0;
  }

  body.v162-sidebar-collapsed .v162-sidebar-controls button {
    width: 46px;
    min-height: 40px;
    margin: 0 auto;
    padding: 7px;
  }

  body.v162-sidebar-collapsed #mainNav {
    padding-right: 0;
  }

  body.v162-sidebar-collapsed #mainNav::-webkit-scrollbar {
    width: 7px;
  }

  body.v162-sidebar-collapsed .v110-navigation {
    padding-inline: 0;
  }

  body.v162-sidebar-collapsed .v110-nav-group {
    overflow: visible;
    border: 0;
    background: transparent;
  }

  body.v162-sidebar-collapsed .v110-nav-heading {
    justify-content: center;
    min-height: 8px;
    padding: 3px 0;
    background: transparent;
  }

  body.v162-sidebar-collapsed .v110-nav-heading::before {
    content: "";
    width: 26px;
    height: 1px;
    background: rgba(113,102,109,.25);
  }

  body.v162-sidebar-collapsed .v110-nav-body {
    display: grid !important;
    padding: 2px 0 6px;
  }

  body.v162-sidebar-collapsed .v110-route {
    display: flex !important;
    justify-content: center;
    width: 48px;
    min-height: 43px !important;
    margin: 0 auto;
    padding: 5px !important;
  }

  body.v162-sidebar-collapsed .v110-route > span {
    width: 31px;
    height: 31px;
    font-size: 16px;
  }

  /* Temporarily expand an unpinned sidebar on hover/focus */
  body.v162-sidebar-collapsed.v162-sidebar-peek .app-shell {
    grid-template-columns: var(--v162-sidebar-expanded) minmax(0,1fr);
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek #sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 120;
    width: var(--v162-sidebar-expanded);
    padding: 18px 14px;
    box-shadow: 18px 0 36px rgba(91,43,58,.16);
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek #sidebar .brand {
    justify-content: flex-start;
    padding: 0 8px 12px;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek #sidebar .brand > div:last-child,
  body.v162-sidebar-collapsed.v162-sidebar-peek #sidebar .sidebar-reminder,
  body.v162-sidebar-collapsed.v162-sidebar-peek #sidebar #customizeButton,
  body.v162-sidebar-collapsed.v162-sidebar-peek .v162-sidebar-controls button strong,
  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-nav-heading > span,
  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-nav-heading > b,
  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-route > strong {
    display: revert !important;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v162-sidebar-controls {
    grid-template-columns: minmax(0,1fr) 42px;
    padding: 0 6px;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v162-sidebar-controls button {
    width: auto;
    min-height: 38px;
    margin: 0;
    padding: 7px 9px;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-navigation {
    padding: 3px 6px 14px;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-nav-group {
    overflow: hidden;
    border: 1px solid rgba(116,75,86,.12);
    background: rgba(255,255,255,.36);
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-nav-heading {
    justify-content: space-between;
    min-height: 36px;
    padding: 9px 11px;
    background: rgba(255,255,255,.60);
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-nav-heading::before {
    display: none;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-nav-body[hidden] {
    display: none !important;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-route {
    display: grid !important;
    grid-template-columns: 27px minmax(0,1fr);
    justify-content: initial;
    width: 100%;
    min-height: 37px !important;
    margin: 0;
    padding: 7px 9px !important;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-route > span {
    width: 25px;
    height: 25px;
    font-size: 14px;
  }

  body.v162-sidebar-collapsed.v162-sidebar-peek .v110-route.active::after {
    display: block !important;
  }
}

/* Mobile keeps the existing slide-out drawer behavior */
@media (max-width: 760px) {
  .v162-sidebar-controls {
    grid-template-columns: 1fr;
  }

  #v162SidebarPin {
    display: none;
  }

  .v162-sidebar-controls button strong {
    display: inline;
  }

  #mainNav {
    scrollbar-gutter: auto;
  }
}

@media print {
  .v162-sidebar-controls {
    display: none !important;
  }
}
