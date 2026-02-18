/**
 * CoverPhotoPicker - Unified Cover Photo Selection Component
 * @module components/quarry/ui/creation/CoverPhotoPicker
 *
 * Provides a tabbed interface for selecting cover images:
 * - Generated SVG patterns (10 patterns with color customization)
 * - Focus backgrounds (416+ images from catalog)
 * - Custom upload (drag-drop or file picker)
 */

'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Check,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Palette,
} from 'lucide-react'
import {
  generateCollectionCoverDataUrl,
  COVER_PATTERNS,
  type CoverPattern,
  type CoverConfig,
} from '@/lib/collections/coverGenerator'

// ============================================================================
// TYPES
// ============================================================================

export interface CoverSelection {
  type: 'generated' | 'background' | 'custom'
  /** Data URL for generated/custom, path for background */
  url: string
  /** Pattern info for generated covers */
  pattern?: CoverPattern
  /** Color for generated covers */
  primaryColor?: string
  /** Background ID for catalog images */
  backgroundId?: string
  /** Category for catalog images */
  category?: string
}

export interface CoverPhotoPickerProps {
  /** Current selection */
  value?: CoverSelection | null
  /** Selection change handler */
  onChange: (selection: CoverSelection | null) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Suggested category for AI-based recommendations */
  suggestedCategory?: string
  /** Custom class name */
  className?: string
  /** Preview aspect ratio */
  aspectRatio?: 'wide' | 'square' | 'portrait'
}

type TabType = 'generated' | 'backgrounds' | 'upload'

interface BackgroundImage {
  id: string
  url: string
  thumbnail: string
  category: string
  color: string
  alt: string
}

interface BackgroundCategory {
  id: string
  name: string
  count: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESET_COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#64748b', name: 'Slate' },
  { hex: '#1e293b', name: 'Dark' },
]

const BACKGROUND_CATEGORIES: BackgroundCategory[] = [
  { id: 'all', name: 'All', count: 416 },
  { id: 'nature', name: 'Nature', count: 80 },
  { id: 'abstract', name: 'Abstract', count: 60 },
  { id: 'minimal', name: 'Minimal', count: 45 },
  { id: 'space', name: 'Space', count: 35 },
  { id: 'ocean', name: 'Ocean', count: 40 },
  { id: 'forest', name: 'Forest', count: 50 },
  { id: 'mountains', name: 'Mountains', count: 40 },
  { id: 'sunset', name: 'Sunset', count: 30 },
  { id: 'city', name: 'City', count: 36 },
]

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  isDark: boolean
}

function TabButton({ active, onClick, icon: Icon, label, isDark }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
        transition-all duration-200
        ${active
          ? isDark
            ? 'bg-zinc-700 text-white'
            : 'bg-zinc-900 text-white'
          : isDark
            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  isDark: boolean
}

function ColorPicker({ value, onChange, isDark }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Color
        </span>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`
            text-xs px-2 py-1 rounded-md transition-colors
            ${isDark
              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
            }
          `}
        >
          <Palette className="w-3 h-3 inline mr-1" />
          Custom
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.hex}
            onClick={() => onChange(color.hex)}
            title={color.name}
            className={`
              w-7 h-7 rounded-lg transition-all duration-150 relative
              ${value === color.hex
                ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110'
                : 'hover:scale-105'
              }
            `}
            style={{ backgroundColor: color.hex }}
          >
            {value === color.hex && (
              <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow-lg" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#6366f1"
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-mono
                  ${isDark
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : 'bg-white text-zinc-900 border-zinc-200'
                  }
                  border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                `}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface PatternGridProps {
  selectedPattern: CoverPattern | null
  color: string
  onSelect: (pattern: CoverPattern) => void
  isDark: boolean
}

function PatternGrid({ selectedPattern, color, onSelect, isDark }: PatternGridProps) {
  const [hoveredPattern, setHoveredPattern] = useState<CoverPattern | null>(null)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {COVER_PATTERNS.map((pattern) => {
        const isSelected = selectedPattern === pattern.id
        const isHovered = hoveredPattern === pattern.id
        const coverUrl = generateCollectionCoverDataUrl({
          pattern: pattern.id,
          primaryColor: color,
          seed: 42,
        }, 200, 100)

        return (
          <motion.button
            key={pattern.id}
            onClick={() => onSelect(pattern.id)}
            onMouseEnter={() => setHoveredPattern(pattern.id)}
            onMouseLeave={() => setHoveredPattern(null)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative group rounded-xl overflow-hidden
              transition-all duration-200
              ${isSelected
                ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-900'
                : 'hover:ring-1 hover:ring-zinc-600'
              }
            `}
          >
            <div
              className="aspect-[2/1] bg-cover bg-center"
              style={{ backgroundImage: `url("${coverUrl}")` }}
            />
            
            {/* Overlay with pattern name */}
            <div
              className={`
                absolute inset-0 flex items-end p-2
                bg-gradient-to-t from-black/60 to-transparent
                transition-opacity duration-200
                ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
              `}
            >
              <span className="text-xs font-medium text-white truncate">
                {pattern.name}
              </span>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

interface BackgroundGridProps {
  images: BackgroundImage[]
  selectedId: string | null
  onSelect: (image: BackgroundImage) => void
  loading: boolean
  isDark: boolean
}

function BackgroundGrid({ images, selectedId, onSelect, loading, isDark }: BackgroundGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        No images found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {images.map((image) => {
        const isSelected = selectedId === image.id

        return (
          <motion.button
            key={image.id}
            onClick={() => onSelect(image)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative aspect-[3/2] rounded-lg overflow-hidden
              transition-all duration-200
              ${isSelected
                ? 'ring-2 ring-cyan-500 ring-offset-1 ring-offset-zinc-900'
                : 'hover:ring-1 hover:ring-zinc-600'
              }
            `}
          >
            <img
              src={image.thumbnail}
              alt={image.alt}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            
            {isSelected && (
              <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

interface UploadZoneProps {
  onUpload: (file: File) => void
  currentImage: string | null
  onClear: () => void
  isDark: boolean
}

function UploadZone({ onUpload, currentImage, onClear, isDark }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setIsLoading(true)
      onUpload(file)
      setIsLoading(false)
    }
  }, [onUpload])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsLoading(true)
      onUpload(file)
      setIsLoading(false)
    }
  }, [onUpload])

  if (currentImage) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden aspect-[2/1]">
          <img
            src={currentImage}
            alt="Uploaded cover"
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClear}
            className={`
              absolute top-2 right-2 p-2 rounded-lg
              bg-black/50 text-white hover:bg-black/70
              transition-colors
            `}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => inputRef.current?.click()}
          className={`
            w-full py-2 rounded-lg text-sm font-medium
            transition-colors
            ${isDark
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }
          `}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Replace Image
        </button>
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center gap-4
        p-8 rounded-xl border-2 border-dashed cursor-pointer
        transition-all duration-200
        ${isDragging
          ? isDark
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-cyan-500 bg-cyan-50'
          : isDark
            ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
        }
      `}
    >
      {isLoading ? (
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      ) : (
        <>
          <div
            className={`
              p-4 rounded-2xl
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
            `}
          >
            <Upload className={`w-8 h-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          </div>
          <div className="text-center">
            <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
              Drop an image here, or click to browse
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              PNG, JPG, GIF, WebP up to 10MB
            </p>
          </div>
        </>
      )}
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CoverPhotoPicker({
  value,
  onChange,
  isDark = false,
  suggestedCategory,
  className = '',
  aspectRatio = 'wide',
}: CoverPhotoPickerProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('generated')
  const [selectedColor, setSelectedColor] = useState(value?.primaryColor || '#6366f1')
  const [selectedPattern, setSelectedPattern] = useState<CoverPattern | null>(
    value?.pattern || null
  )
  const [backgroundSearch, setBackgroundSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(suggestedCategory || 'all')
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([])
  const [backgroundsLoading, setBackgroundsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    value?.type === 'custom' ? value.url : null
  )

  // Load backgrounds when tab changes or category changes
  useEffect(() => {
    if (activeTab === 'backgrounds') {
      loadBackgrounds()
    }
  }, [activeTab, selectedCategory])

  const loadBackgrounds = useCallback(async () => {
    setBackgroundsLoading(true)
    try {
      const res = await fetch('/media/backgrounds/catalog.json')
      const catalog = await res.json()
      
      const images: BackgroundImage[] = []
      const categories = catalog.categories || {}
      
      Object.entries(categories).forEach(([categoryId, categoryData]: [string, any]) => {
        if (selectedCategory === 'all' || selectedCategory === categoryId) {
          categoryData.images?.forEach((img: any) => {
            images.push({
              id: img.id,
              url: img.url,
              thumbnail: img.thumbnail,
              category: categoryId,
              color: img.color,
              alt: img.alt,
            })
          })
        }
      })

      // Apply search filter
      const filtered = backgroundSearch
        ? images.filter(img => 
            img.alt.toLowerCase().includes(backgroundSearch.toLowerCase()) ||
            img.category.toLowerCase().includes(backgroundSearch.toLowerCase())
          )
        : images

      setBackgrounds(filtered.slice(0, 48)) // Limit to 48 for performance
    } catch (err) {
      console.error('[CoverPhotoPicker] Failed to load backgrounds:', err)
    } finally {
      setBackgroundsLoading(false)
    }
  }, [selectedCategory, backgroundSearch])

  // Handlers
  const handlePatternSelect = useCallback((pattern: CoverPattern) => {
    setSelectedPattern(pattern)
    const url = generateCollectionCoverDataUrl({
      pattern,
      primaryColor: selectedColor,
      seed: 42,
    }, 800, 400)

    onChange({
      type: 'generated',
      url,
      pattern,
      primaryColor: selectedColor,
    })
  }, [selectedColor, onChange])

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color)
    if (selectedPattern) {
      const url = generateCollectionCoverDataUrl({
        pattern: selectedPattern,
        primaryColor: color,
        seed: 42,
      }, 800, 400)

      onChange({
        type: 'generated',
        url,
        pattern: selectedPattern,
        primaryColor: color,
      })
    }
  }, [selectedPattern, onChange])

  const handleBackgroundSelect = useCallback((image: BackgroundImage) => {
    onChange({
      type: 'background',
      url: image.url,
      backgroundId: image.id,
      category: image.category,
    })
  }, [onChange])

  const handleUpload = useCallback(async (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setUploadedImage(dataUrl)
      onChange({
        type: 'custom',
        url: dataUrl,
      })
    }
    reader.readAsDataURL(file)
  }, [onChange])

  const handleClearUpload = useCallback(() => {
    setUploadedImage(null)
    onChange(null)
  }, [onChange])

  // Aspect ratio class
  const aspectClass = useMemo(() => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case 'portrait':
        return 'aspect-[3/4]'
      default:
        return 'aspect-[2/1]'
    }
  }, [aspectRatio])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview */}
      {value && (
        <div className={`relative rounded-xl overflow-hidden ${aspectClass}`}>
          <img
            src={value.url}
            alt="Cover preview"
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => onChange(null)}
            className={`
              absolute top-2 right-2 p-1.5 rounded-lg
              bg-black/50 text-white hover:bg-black/70
              transition-colors
            `}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <TabButton
          active={activeTab === 'generated'}
          onClick={() => setActiveTab('generated')}
          icon={Sparkles}
          label="Generated"
          isDark={isDark}
        />
        <TabButton
          active={activeTab === 'backgrounds'}
          onClick={() => setActiveTab('backgrounds')}
          icon={ImageIcon}
          label="Backgrounds"
          isDark={isDark}
        />
        <TabButton
          active={activeTab === 'upload'}
          onClick={() => setActiveTab('upload')}
          icon={Upload}
          label="Upload"
          isDark={isDark}
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'generated' && (
            <div className="space-y-4">
              <ColorPicker
                value={selectedColor}
                onChange={handleColorChange}
                isDark={isDark}
              />
              <PatternGrid
                selectedPattern={selectedPattern}
                color={selectedColor}
                onSelect={handlePatternSelect}
                isDark={isDark}
              />
            </div>
          )}

          {activeTab === 'backgrounds' && (
            <div className="space-y-4">
              {/* Search and Categories */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className={`
                    absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                    ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                  `} />
                  <input
                    type="text"
                    value={backgroundSearch}
                    onChange={(e) => setBackgroundSearch(e.target.value)}
                    placeholder="Search backgrounds..."
                    className={`
                      w-full pl-9 pr-4 py-2 rounded-lg text-sm
                      ${isDark
                        ? 'bg-zinc-800 text-zinc-200 placeholder:text-zinc-500 border-zinc-700'
                        : 'bg-white text-zinc-900 placeholder:text-zinc-400 border-zinc-200'
                      }
                      border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                    `}
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`
                    px-3 py-2 rounded-lg text-sm
                    ${isDark
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-white text-zinc-900 border-zinc-200'
                    }
                    border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                  `}
                >
                  {BACKGROUND_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Background Grid */}
              <div className="max-h-64 overflow-y-auto pr-1">
                <BackgroundGrid
                  images={backgrounds}
                  selectedId={value?.backgroundId || null}
                  onSelect={handleBackgroundSelect}
                  loading={backgroundsLoading}
                  isDark={isDark}
                />
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <UploadZone
              onUpload={handleUpload}
              currentImage={uploadedImage}
              onClear={handleClearUpload}
              isDark={isDark}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Named exports
export { CoverPhotoPicker }

