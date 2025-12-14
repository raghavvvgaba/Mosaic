# Notes App Design System (Hybrid Neumorphism – Dark Mode)

This document contains everything your LLM needs to **replicate the design perfectly** across your entire application. It includes:
- Full design philosophy
- Color tokens & semantic variables
- Shadows & lighting rules
- Component guidelines
- Interaction patterns
- Structural layout rules
- Usage instructions for React + Tailwind

This is the **source of truth** for your design.

---

# 1. DESIGN PHILOSOPHY

This UI follows **Hybrid Neumorphism**, combining:
- Subtle soft shadows (neumorphism)
- Clear structure and high usability
- Modern dark-mode palette
- Soft glass surfaces
- Inset surfaces to show depth
- Clean typography and spacing

The goals:
1. **Soft, premium feel** without the usability problems of classic neumorphism.
2. **Clear component hierarchy** using controlled contrast.
3. **Accessible & responsive** foundation.
4. **Glassy interactive elements** to create depth.

---

# 2. COLOR SYSTEM (TOKENS)

### 🎨 Base Colors
```
Background gradient:
  - Top-left: #0d141c
  - Bottom-right: #101a24

Card surface:
  - #0b1118
```

These provide clean separation: **lighter background + deeper cards**.

### 🎨 Semantic Tokens
```
--bg: #0b0f14;
--card: #0b1118;
--muted: rgba(255,255,255,0.12);
--accent: #ffb86b;
--focus-ring: 3px solid rgba(255,184,107,0.15);
```

### 🎨 Supporting Surface Colors
Used inside cards and inset blocks:
```
rgba(255,255,255,0.02)
rgba(255,255,255,0.03)
```

---

# 3. SHADOW SYSTEM (NEUMORPHIC LIGHTING)

### Soft elevation
```
--soft-shadow:
  6px 6px 14px rgba(0,0,0,0.65),
  -4px -4px 10px rgba(255,255,255,0.02);
```

### Strong hover elevation
```
--soft-shadow-2:
 10px 12px 26px rgba(0,0,0,0.65),
 -6px -6px 18px rgba(255,255,255,0.02);
```

### Inset depth
```
--inset-shadow:
 inset 4px 4px 10px rgba(0,0,0,0.55),
 inset -3px -3px 6px rgba(255,255,255,0.02);
```

---

# 4. COMPONENT SURFACES

### Neumorphic Card
```
.neu-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005));
  box-shadow: var(--soft-shadow);
  border-radius: 16px;
}
```

### Inset Surface
```
.neu-inset {
  background: linear-gradient(180deg, rgba(255,255,255,0.012), rgba(0,0,0,0.12));
  box-shadow: var(--inset-shadow);
}
```

### Glass Surface
```
.glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 4px 6px 14px rgba(0,0,0,0.55);
}
```

---

# 5. INTERACTION & MOTION RULES

### Hover
- Cards lift upward (`translateY(-6px)`) and increase shadow.
- Scale effect for subtle interaction.

### Active
- Slightly compress (`scale(0.998)`), simulating physical press.

### Focus
```
:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 4px;
}
```

This ensures keyboard accessibility.

### Reduced Motion
If user prefers reduced motion:
```
@media (prefers-reduced-motion: reduce) {
  disable transforms and transitions
}
```

---

# 6. COMPONENT DESIGN PRINCIPLES

## 6.1 HEADER
- Left: logo block in a neumorphic square.
- Right: filter controls in a **glass capsule**.
- Menu button also glass.

## 6.2 SIDEBAR
Contains two neumorphic cards:
- “Quick Note” preview
- “Tags” section with pill chips

## 6.3 NOTE CARDS
Each note card includes:
- Title
- Short excerpt
- Favorite button (glass)
- Metadata
- Image placeholder block (inset)

## 6.4 LARGE NOTE PREVIEW
- One card spans full width
- Includes collaborators
- Inset content surface
- Two buttons (accent + glass)

## 6.5 FAB (Floating Action Button)
- Outer container: neumorphic & glass
- Inner button: bright accent gradient

---

# 7. TYPOGRAPHY & SPACING

### Typography
- Titles: `font-semibold` to `font-bold`
- Body text: `text-sm` or `text-xs` for metadata
- All text uses Tailwind’s `slate-100` or `slate-400`

### Spacing rules
- Section spacing: `p-4` to `p-6`
- Grid gaps: `gap-6`
- Card padding: `p-5` or `p-4`
- Consistent rounding: `rounded-xl` or `rounded-2xl`

---

# 8. LAYOUT STRUCTURE

### Three-column layout
- Sidebar on the left
- Notes grid (2-column responsive)
- Featured note at bottom spanning both columns

### Container widths
```
max-w-6xl mx-auto
```
Keeps layout centered and clean.

---

# 9. FULL HOMEPAGE IMPLEMENTATION (REFERENCE CODE)

Below is the full React component that uses the entire system.  
The LLM should follow **this structure + these classes** when creating new components.

```jsx
<PASTE THE ENTIRE COMPONENT FROM YOUR CANVAS HERE>
```

*(Note: The code will be automatically updated when you copy it from the canvas. This placeholder avoids duplication inside this spec file.)*

---

# 10. HOW YOUR LLM SHOULD USE THIS FILE

When generating UI:
1. Use the **color tokens** exactly.
2. Wrap structural surfaces in `.neu-card` or `.neu-inset`.
3. Use glass surfaces for **controls, filters, avatars, FAB containers**.
4. Follow the **hover, active, focus** rules for all interactive elements.
5. Maintain spacing and radii as listed.
6. Use background gradient for all main pages.

This ensures **perfect consistency** across the app.

---

# End of Design System
This is your authoritative design reference.

