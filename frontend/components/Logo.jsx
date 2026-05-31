'use client';

import React from "react";

/**
 * CreatorLens logo — renders the brand image assets from /public.
 *
 *  - /logo.png          → the icon mark (square)
 *  - /logo-wordmark.png → the full horizontal lockup (icon + "CreatorLens")
 *
 * Props:
 *  - size: mark height in px (default 30)
 *  - withWordmark: use the full lockup image instead of just the icon
 *  - wordmarkSize: (kept for API compatibility; lockup scales by height)
 *  - style: extra wrapper styles
 */
export default function Logo({ size = 30, withWordmark = false, style = {} }) {
  if (withWordmark) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-wordmark.png"
        alt="CreatorLens"
        style={{ height: Math.round(size * 1.05), width: "auto", display: "block", objectFit: "contain", ...style }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="CreatorLens logo"
      style={{ width: size, height: size, display: "block", objectFit: "contain", borderRadius: Math.round(size * 0.28), ...style }}
    />
  );
}
