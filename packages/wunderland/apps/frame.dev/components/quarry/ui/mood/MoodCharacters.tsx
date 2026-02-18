/**
 * MoodCharacters - Animated SVG character faces for mood selection
 * @module components/quarry/ui/MoodCharacters
 *
 * Expressive character faces representing 11 different moods.
 * Each character has unique features, colors, and animations.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { MoodState } from '@/lib/codex/mood'

interface MoodCharacterProps {
  mood: MoodState
  size?: number
  animated?: boolean
  selected?: boolean
}

/**
 * Get the mood character component for a given mood
 */
export function MoodCharacter({ mood, size = 64, animated = false, selected = false }: MoodCharacterProps) {
  const CharacterComponent = MOOD_CHARACTERS[mood]
  return <CharacterComponent size={size} animated={animated} selected={selected} />
}

interface CharacterProps {
  size: number
  animated: boolean
  selected: boolean
}

// ============================================================================
// FOCUSED - Determined face with target pupils
// ============================================================================
function FocusedCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {/* Glow effect when selected */}
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#06b6d4" />
      <circle cx="32" cy="32" r="24" fill="#0e7490" />
      {/* Eyes - target style */}
      <motion.g
        animate={animated ? { scaleY: [1, 0.9, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        {/* Left eye */}
        <circle cx="22" cy="28" r="7" fill="white" />
        <circle cx="22" cy="28" r="4" fill="#0f172a" />
        <circle cx="22" cy="28" r="1.5" fill="#06b6d4" />
        {/* Right eye */}
        <circle cx="42" cy="28" r="7" fill="white" />
        <circle cx="42" cy="28" r="4" fill="#0f172a" />
        <circle cx="42" cy="28" r="1.5" fill="#06b6d4" />
      </motion.g>
      {/* Determined eyebrows */}
      <path d="M16 22 L28 24" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 22 L36 24" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Small confident smile */}
      <path d="M26 42 Q32 46 38 42" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ============================================================================
// CREATIVE - Sparkly eyes with paint splatter
// ============================================================================
function CreativeCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#ec4899"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#ec4899" />
      <circle cx="32" cy="32" r="24" fill="#be185d" />
      {/* Paint splatter on cheeks */}
      <circle cx="14" cy="34" r="4" fill="#fbbf24" opacity="0.8" />
      <circle cx="50" cy="34" r="3" fill="#06b6d4" opacity="0.8" />
      <circle cx="48" cy="38" r="2" fill="#a855f7" opacity="0.8" />
      {/* Sparkly eyes */}
      <motion.g
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        {/* Left eye - star */}
        <circle cx="22" cy="28" r="6" fill="white" />
        <motion.path
          d="M22 22 L23 26 L27 26 L24 29 L25 33 L22 30 L19 33 L20 29 L17 26 L21 26 Z"
          fill="#fbbf24"
          animate={animated ? { rotate: [0, 360] } : {}}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '22px 28px' }}
        />
        {/* Right eye - star */}
        <circle cx="42" cy="28" r="6" fill="white" />
        <motion.path
          d="M42 22 L43 26 L47 26 L44 29 L45 33 L42 30 L39 33 L40 29 L37 26 L41 26 Z"
          fill="#fbbf24"
          animate={animated ? { rotate: [0, -360] } : {}}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '42px 28px' }}
        />
      </motion.g>
      {/* Big smile */}
      <path d="M22 40 Q32 50 42 40" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Floating sparkles */}
      {animated && (
        <>
          <motion.circle
            cx="10" cy="20" r="2" fill="#fbbf24"
            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx="54" cy="18" r="1.5" fill="#a855f7"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.circle
            cx="52" cy="48" r="2" fill="#06b6d4"
            animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
        </>
      )}
    </svg>
  )
}

// ============================================================================
// CURIOUS - Wide eyes with raised eyebrow
// ============================================================================
function CuriousCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#f59e0b" />
      <circle cx="32" cy="32" r="24" fill="#d97706" />
      {/* Wide curious eyes */}
      <motion.g
        animate={animated ? { x: [0, 2, -2, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {/* Left eye */}
        <circle cx="22" cy="28" r="8" fill="white" />
        <circle cx="23" cy="28" r="4" fill="#0f172a" />
        <circle cx="24" cy="26" r="1.5" fill="white" />
        {/* Right eye - slightly wider */}
        <circle cx="42" cy="26" r="9" fill="white" />
        <circle cx="43" cy="26" r="5" fill="#0f172a" />
        <circle cx="44" cy="24" r="2" fill="white" />
      </motion.g>
      {/* Raised eyebrow on right */}
      <path d="M16 22 L28 22" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 18 L50 20" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Thoughtful mouth */}
      <circle cx="32" cy="44" r="4" fill="#0f172a" />
      {/* Question mark thought */}
      {animated && (
        <motion.text
          x="52" y="16" fontSize="12" fill="#0f172a" fontWeight="bold"
          animate={{ y: [16, 12, 16], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ?
        </motion.text>
      )}
    </svg>
  )
}

// ============================================================================
// RELAXED - Closed happy eyes, gentle smile
// ============================================================================
function RelaxedCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#22c55e" />
      <circle cx="32" cy="32" r="24" fill="#16a34a" />
      {/* Closed happy eyes - arcs */}
      <motion.g
        animate={animated ? { y: [0, 1, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ transformOrigin: '32px 32px' }}
      >
        <path d="M16 28 Q22 22 28 28" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M36 28 Q42 22 48 28" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
      </motion.g>
      {/* Rosy cheeks */}
      <circle cx="14" cy="36" r="4" fill="#fecdd3" opacity="0.6" />
      <circle cx="50" cy="36" r="4" fill="#fecdd3" opacity="0.6" />
      {/* Gentle smile */}
      <path d="M24 42 Q32 50 40 42" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Zen aura */}
      {animated && (
        <motion.circle
          cx="32" cy="32" r={32}
          fill="none"
          stroke="#bbf7d0"
          strokeWidth="1"
          opacity="0.5"
          style={{ transformOrigin: '32px 32px' }}
          animate={{ scale: [1, 1.125, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      )}
    </svg>
  )
}

// ============================================================================
// ENERGETIC - Lightning eyes, big grin
// ============================================================================
function EnergeticCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#eab308"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#eab308" />
      <circle cx="32" cy="32" r="24" fill="#ca8a04" />
      {/* Lightning bolt eyes */}
      <motion.g
        animate={animated ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        {/* Left eye */}
        <circle cx="22" cy="28" r="7" fill="white" />
        <path d="M22 22 L19 28 L23 28 L20 34" stroke="#eab308" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Right eye */}
        <circle cx="42" cy="28" r="7" fill="white" />
        <path d="M42 22 L39 28 L43 28 L40 34" stroke="#eab308" strokeWidth="3" strokeLinecap="round" fill="none" />
      </motion.g>
      {/* Big excited grin */}
      <path d="M20 40 Q32 54 44 40" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="#fef3c7" />
      {/* Motion lines */}
      {animated && (
        <>
          <motion.path
            d="M8 24 L4 24" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"
            animate={{ x: [-2, 2, -2], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
          <motion.path
            d="M60 24 L56 24" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"
            animate={{ x: [2, -2, 2], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.3, repeat: Infinity, delay: 0.15 }}
          />
          <motion.path
            d="M8 32 L4 32" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"
            animate={{ x: [-2, 2, -2], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.3, repeat: Infinity, delay: 0.1 }}
          />
          <motion.path
            d="M60 32 L56 32" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"
            animate={{ x: [2, -2, 2], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.3, repeat: Infinity, delay: 0.2 }}
          />
        </>
      )}
    </svg>
  )
}

// ============================================================================
// REFLECTIVE - Thoughtful expression with thought bubble
// ============================================================================
function ReflectiveCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#a855f7"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#a855f7" />
      <circle cx="32" cy="32" r="24" fill="#7e22ce" />
      {/* Thoughtful eyes looking up */}
      <motion.g
        animate={animated ? { y: [0, -1, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {/* Left eye */}
        <circle cx="22" cy="28" r="6" fill="white" />
        <circle cx="22" cy="26" r="3" fill="#0f172a" />
        {/* Right eye */}
        <circle cx="42" cy="28" r="6" fill="white" />
        <circle cx="42" cy="26" r="3" fill="#0f172a" />
      </motion.g>
      {/* Subtle eyebrows */}
      <path d="M16 22 L28 22" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 22 L48 22" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      {/* Thoughtful mouth */}
      <path d="M28 44 L36 44" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Thought bubble */}
      <motion.g
        animate={animated ? { y: [0, -2, 0], opacity: [0.6, 1, 0.6] } : { opacity: 0.6 }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <circle cx="52" cy="12" r="6" fill="white" stroke="#7e22ce" strokeWidth="1" />
        <circle cx="48" cy="20" r="2" fill="white" stroke="#7e22ce" strokeWidth="0.5" />
        <circle cx="46" cy="24" r="1" fill="white" stroke="#7e22ce" strokeWidth="0.5" />
      </motion.g>
    </svg>
  )
}

// ============================================================================
// ANXIOUS - Worried eyes with sweat drop
// ============================================================================
function AnxiousCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#f97316" />
      <circle cx="32" cy="32" r="24" fill="#ea580c" />
      {/* Worried eyes */}
      <motion.g
        animate={animated ? { x: [-1, 1, -1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        {/* Left eye */}
        <circle cx="22" cy="28" r="6" fill="white" />
        <circle cx="22" cy="29" r="3" fill="#0f172a" />
        <circle cx="23" cy="28" r="1" fill="white" />
        {/* Right eye */}
        <circle cx="42" cy="28" r="6" fill="white" />
        <circle cx="42" cy="29" r="3" fill="#0f172a" />
        <circle cx="43" cy="28" r="1" fill="white" />
      </motion.g>
      {/* Worried eyebrows */}
      <path d="M16 24 L28 20" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 24 L36 20" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Wavy worried mouth */}
      <path d="M24 44 Q28 42 32 44 Q36 46 40 44" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Sweat drop */}
      <motion.path
        d="M52 22 Q54 26 52 28 Q50 26 52 22"
        fill="#7dd3fc"
        animate={animated ? { y: [0, 4, 0], opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  )
}

// ============================================================================
// GRATEFUL - Heart eyes, warm smile
// ============================================================================
function GratefulCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#f43f5e" />
      <circle cx="32" cy="32" r="24" fill="#e11d48" />
      {/* Heart eyes */}
      <motion.g
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        {/* Left heart eye */}
        <path d="M22 24 C18 20 14 24 22 32 C30 24 26 20 22 24" fill="#fecdd3" />
        {/* Right heart eye */}
        <path d="M42 24 C38 20 34 24 42 32 C50 24 46 20 42 24" fill="#fecdd3" />
      </motion.g>
      {/* Rosy cheeks */}
      <circle cx="14" cy="38" r="4" fill="#fda4af" opacity="0.5" />
      <circle cx="50" cy="38" r="4" fill="#fda4af" opacity="0.5" />
      {/* Warm smile */}
      <path d="M24 42 Q32 50 40 42" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Floating hearts */}
      {animated && (
        <>
          <motion.path
            d="M8 18 C6 16 4 18 8 22 C12 18 10 16 8 18"
            fill="#fda4af"
            animate={{ y: [0, -8], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.path
            d="M56 20 C54 18 52 20 56 24 C60 20 58 18 56 20"
            fill="#fda4af"
            animate={{ y: [0, -6], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
    </svg>
  )
}

// ============================================================================
// TIRED - Droopy eyes, yawn, zzz
// ============================================================================
function TiredCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#64748b" />
      <circle cx="32" cy="32" r="24" fill="#475569" />
      {/* Droopy half-closed eyes */}
      <motion.g
        animate={animated ? { scaleY: [1, 0.7, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        {/* Left eye */}
        <ellipse cx="22" cy="28" rx="6" ry="4" fill="white" />
        <circle cx="22" cy="29" r="2" fill="#0f172a" />
        {/* Right eye */}
        <ellipse cx="42" cy="28" rx="6" ry="4" fill="white" />
        <circle cx="42" cy="29" r="2" fill="#0f172a" />
        {/* Heavy eyelids */}
        <path d="M16 26 L28 26" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
        <path d="M36 26 L48 26" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      </motion.g>
      {/* Yawn mouth */}
      <ellipse cx="32" cy="44" rx="6" ry="8" fill="#1e293b" />
      {/* ZZZ */}
      <motion.g
        animate={animated ? { y: [0, -4], opacity: [1, 0] } : { opacity: 0.7 }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <text x="48" y="14" fontSize="8" fill="#94a3b8" fontWeight="bold">Z</text>
        <text x="52" y="10" fontSize="6" fill="#94a3b8" fontWeight="bold">z</text>
        <text x="55" y="7" fontSize="4" fill="#94a3b8" fontWeight="bold">z</text>
      </motion.g>
    </svg>
  )
}

// ============================================================================
// PEACEFUL - Serene closed eyes, lotus glow
// ============================================================================
function PeacefulCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Soft glow aura */}
      <motion.circle
        cx="32" cy="32" r={32}
        fill="none"
        stroke="#5eead4"
        strokeWidth="1"
        opacity="0.3"
        style={{ transformOrigin: '32px 32px' }}
        animate={animated ? { scale: [1, 1.125, 1], opacity: [0.3, 0.1, 0.3] } : { scale: 1, opacity: 0.3 }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#14b8a6" />
      <circle cx="32" cy="32" r="24" fill="#0d9488" />
      {/* Serene closed eyes */}
      <motion.g
        animate={animated ? { y: [0, 0.5, 0] } : {}}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <path d="M16 28 Q22 24 28 28" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M36 28 Q42 24 48 28" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </motion.g>
      {/* Soft rosy cheeks */}
      <circle cx="14" cy="36" r="4" fill="#99f6e4" opacity="0.4" />
      <circle cx="50" cy="36" r="4" fill="#99f6e4" opacity="0.4" />
      {/* Peaceful smile */}
      <path d="M26 42 Q32 46 38 42" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Lotus decoration */}
      <motion.g
        animate={animated ? { scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] } : { opacity: 0.6 }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ transformOrigin: '32px 8px' }}
      >
        <ellipse cx="32" cy="8" rx="4" ry="2" fill="#fda4af" />
        <ellipse cx="28" cy="10" rx="3" ry="2" fill="#fda4af" transform="rotate(-30 28 10)" />
        <ellipse cx="36" cy="10" rx="3" ry="2" fill="#fda4af" transform="rotate(30 36 10)" />
      </motion.g>
    </svg>
  )
}

// ============================================================================
// EXCITED - Star eyes, huge grin, confetti
// ============================================================================
function ExcitedCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base */}
      <circle cx="32" cy="32" r="28" fill="#8b5cf6" />
      <circle cx="32" cy="32" r="24" fill="#7c3aed" />
      {/* Star eyes */}
      <motion.g
        animate={animated ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        {/* Left star */}
        <path d="M22 22 L23.5 27 L28 27 L24.5 30 L26 35 L22 32 L18 35 L19.5 30 L16 27 L20.5 27 Z" fill="#fef3c7" />
        {/* Right star */}
        <path d="M42 22 L43.5 27 L48 27 L44.5 30 L46 35 L42 32 L38 35 L39.5 30 L36 27 L40.5 27 Z" fill="#fef3c7" />
      </motion.g>
      {/* Huge excited grin */}
      <path d="M18 40 Q32 56 46 40" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="#fef3c7" />
      {/* Confetti */}
      {animated && (
        <>
          <motion.rect
            x="8" y="12" width="4" height="4" rx="1" fill="#f43f5e"
            animate={{ y: [12, 20], rotate: [0, 180], opacity: [1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.rect
            x="52" y="14" width="3" height="3" rx="0.5" fill="#06b6d4"
            animate={{ y: [14, 22], rotate: [0, -180], opacity: [1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.circle
            cx="12" cy="50" r="2" fill="#fbbf24"
            animate={{ y: [0, -8], opacity: [1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          />
          <motion.circle
            cx="54" cy="48" r="2.5" fill="#22c55e"
            animate={{ y: [0, -10], opacity: [1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
          />
        </>
      )}
    </svg>
  )
}

// ============================================================================
// NEUTRAL - Simple expressionless face
// ============================================================================
function NeutralCharacter({ size, animated, selected }: CharacterProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
      {/* Glow effect when selected */}
      {selected && (
        <motion.circle
          cx="32" cy="32" r="30"
          fill="none"
          stroke="#71717a"
          strokeWidth="2"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {/* Face base - gray */}
      <circle cx="32" cy="32" r="28" fill="#f4f4f5" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="#d4d4d8" strokeWidth="2" />
      {/* Simple dot eyes */}
      <motion.g
        animate={animated ? { y: [0, 1, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <circle cx="22" cy="28" r="3" fill="#52525b" />
        <circle cx="42" cy="28" r="3" fill="#52525b" />
      </motion.g>
      {/* Straight line mouth */}
      <motion.line
        x1="24" y1="42" x2="40" y2="42"
        stroke="#52525b" strokeWidth="2.5" strokeLinecap="round"
        animate={animated ? { scaleX: [1, 0.95, 1] } : {}}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ transformOrigin: '32px 42px' }}
      />
    </svg>
  )
}

// ============================================================================
// MOOD CHARACTER MAP
// ============================================================================

const MOOD_CHARACTERS: Record<MoodState, React.FC<CharacterProps>> = {
  focused: FocusedCharacter,
  creative: CreativeCharacter,
  curious: CuriousCharacter,
  relaxed: RelaxedCharacter,
  energetic: EnergeticCharacter,
  reflective: ReflectiveCharacter,
  anxious: AnxiousCharacter,
  grateful: GratefulCharacter,
  tired: TiredCharacter,
  peaceful: PeacefulCharacter,
  excited: ExcitedCharacter,
  neutral: NeutralCharacter,
}

export default MoodCharacter
