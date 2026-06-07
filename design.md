# Design Specification: SmartBank CBDC Frontend

## 1. Design Direction Summary
- **Aesthetic Name:** Modern Trust / Clean Finance
- **DFII Score:** 13 (Excellent Impact, Context Fit, Feasibility, and Performance)
- **Key Inspiration:** High-end modern banking and enterprise fintech (e.g., Apple Card, modern banking apps).
- **Differentiation Anchor:** "If this were screenshotted with the logo removed, how would someone recognize it?"
  > We avoid generic SaaS dashboards by utilizing a **crisp light mode** paired with **vibrant trust blue accents**, and **monospaced typographic structural elements** for financial figures. The layout breaks traditional symmetry using a bento-grid card system for the dashboard. It fully supports an elegant dark mode switch.

## 2. Design System Snapshot

### Typography
- **Display / Structural:** `'Outfit', sans-serif` (for large balances and structural headings).
- **Body / Restrained:** `'Inter', system-ui, sans-serif` (for readability).
- **Monospace (Data/Figures):** `'JetBrains Mono', monospace` (for precise alignment of transaction amounts, hashes, and account numbers).

### Color & Theme (Tailwind CSS v4 Variables)
- **Dominant Tone (Light Mode):** Clean White & Cool Slate/Gray (Crisp, modern banking interface).
- **Dominant Tone (Dark Mode):** Deep Slate/Navy (Elegant, low-eye-strain night mode).
- **Accent Color:** Primary Blue (`oklch` equivalent of a vibrant, trustworthy royal/ocean blue) to represent security and stability.
- **Neutral System:** Slate scales (50/100 for light surfaces, 800/900 for dark surfaces, adaptive text).

### Spatial Composition (Bento Grid)
- Breaking standard symmetrical 3-column grids.
- Asymmetrical card spans (e.g., `col-span-2` for charts, `col-span-1` for quick actions).
- Deliberate negative space and soft shadows (in light mode) to elevate the feeling of a premium financial product.

### Motion Philosophy (Framer Motion)
- **Purposeful:** No random bouncing.
- **Entrance:** Strong, orchestrated stagger fade-up on page load.
- **Micro-interactions:** Subtle scale-up on interactive financial cards (`hover:scale-[1.02]`) with smooth `ease-out` transitions.
- **Data Visualization:** Smooth line-drawing animations for balance history charts.

## 3. Technology Stack
1. **Core Framework:** Next.js (App Router, SSR for landing page, React Server Components by default).
2. **Styling:** Tailwind CSS v4 (CSS-first architecture via `@theme`).
3. **Animations:** Framer Motion (for layout transitions and micro-interactions).
4. **Data Visualization:** Recharts (responsive, animated SVG charts).
5. **State Management & Fetching:** React Query / Native Fetch with Next.js caching, Context API for global auth state.
6. **Icons:** Lucide React / Iconsax.

## 4. Architecture & Key Features
- **SSR Landing Page:** Fast, SEO-optimized public landing page explaining the CBDC Tier-2 system with interactive mock-animations.
- **Auth Flow:** Secure JWT handling, communicating with the `/api/v1/auth/` Gateway endpoints.
- **Role-Based Dashboards:**
  - **Retail Customer:** Balance charts, transfer interface, loan application status.
  - **Teller:** Customer search, KYC verification interface, top-up/withdraw module.
  - **Manager:** User management (Suspend/Activate), Loan approval queue with detailed risk metrics.
- **User Guide:** A built-in interactive guide/documentation section for users to understand how to operate the system.

## 5. Differentiation Callout
> "This avoids generic UI by utilizing a strict typography hierarchy (mixing Inter with JetBrains Mono for numbers), applying an asymmetrical Bento-grid layout for the dashboard instead of a standard sidebar-plus-cards, and utilizing a crisp light-mode theme with vibrant blue accents, while fully supporting an elegant dark mode."
