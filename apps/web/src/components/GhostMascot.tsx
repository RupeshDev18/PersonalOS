'use client';

import React, { useEffect, useState, useRef } from 'react';

interface GhostMascotProps {
  size?: 'sm' | 'md' | 'lg';
  mood?: 'happy' | 'thinking' | 'alert';
  className?: string;
  label?: string;
}

export default function GhostMascot({
  size = 'md',
  mood = 'happy',
  className = '',
  label,
}: GhostMascotProps) {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Natural blinking interval
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3800 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Pupil cursor tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - mascotCenterX;
      const deltaY = e.clientY - mascotCenterY;

      // Clamp movement within eye socket
      const maxDistance = size === 'sm' ? 2 : size === 'lg' ? 5 : 3.5;
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.hypot(deltaX, deltaY) / 40, maxDistance);

      setEyeOffset({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size]);

  // Size dimensions
  const dimensions = {
    sm: { width: 32, height: 36, eyeW: 6, eyeH: 8, pupil: 3.5 },
    md: { width: 48, height: 54, eyeW: 9, eyeH: 12, pupil: 5 },
    lg: { width: 72, height: 82, eyeW: 14, eyeH: 18, pupil: 7.5 },
  }[size];

  return (
    <div ref={mascotRef} className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className="animate-float relative">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 100 115"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          {/* Ghost Body (Solid white/ghost tint, crisp clean line) */}
          <path
            d="M50 8C27.9 8 10 25.9 10 48V95C10 98 13.5 100 16.2 98.2L28 90.3L39.8 98.2C42.4 100 46 98.4 46 95.3V93H54V95.3C54 98.4 57.6 100 60.2 98.2L72 90.3L83.8 98.2C86.5 100 90 98 90 95V48C90 25.9 72.1 8 50 8Z"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="3.5"
          />

          {/* Cute Cheek Blushes (Playful coral dots) */}
          <ellipse cx="26" cy="62" rx="6" ry="3.5" fill="#FDA4AF" />
          <ellipse cx="74" cy="62" rx="6" ry="3.5" fill="#FDA4AF" />

          {/* Little Ghost Smile */}
          {mood === 'happy' && (
            <path
              d="M44 64C44 67.5 46.7 70 50 70C53.3 70 56 67.5 56 64"
              stroke="#1E293B"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {mood === 'thinking' && (
            <circle cx="50" cy="66" r="3" fill="#1E293B" />
          )}

          {/* Eye Left */}
          <g transform="translate(32, 42)">
            {/* Eye Background */}
            <ellipse
              cx="0"
              cy="0"
              rx="9"
              ry={isBlinking ? 1 : 12}
              fill="#0F172A"
              className="transition-all duration-75"
            />
            {/* Pupil (follows cursor) */}
            {!isBlinking && (
              <>
                <circle
                  cx={eyeOffset.x}
                  cy={eyeOffset.y}
                  r="4.5"
                  fill="#38BDF8"
                />
                {/* Eye sparkle reflection */}
                <circle
                  cx={eyeOffset.x - 2}
                  cy={eyeOffset.y - 2}
                  r="1.8"
                  fill="#FFFFFF"
                />
              </>
            )}
          </g>

          {/* Eye Right */}
          <g transform="translate(68, 42)">
            {/* Eye Background */}
            <ellipse
              cx="0"
              cy="0"
              rx="9"
              ry={isBlinking ? 1 : 12}
              fill="#0F172A"
              className="transition-all duration-75"
            />
            {/* Pupil (follows cursor) */}
            {!isBlinking && (
              <>
                <circle
                  cx={eyeOffset.x}
                  cy={eyeOffset.y}
                  r="4.5"
                  fill="#38BDF8"
                />
                {/* Eye sparkle reflection */}
                <circle
                  cx={eyeOffset.x - 2}
                  cy={eyeOffset.y - 2}
                  r="1.8"
                  fill="#FFFFFF"
                />
              </>
            )}
          </g>
        </svg>

        {/* Small floating indicator badge when thinking */}
        {mood === 'thinking' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-amber rounded-full animate-ping" />
        )}
      </div>

      {label && (
        <span className="mt-1 text-[11px] font-semibold tracking-wide text-slate-300 font-button">
          {label}
        </span>
      )}
    </div>
  );
}
