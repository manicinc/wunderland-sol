'use client'

/**
 * Background Picker
 * @module components/quarry/ui/meditate/BackgroundPicker
 * 
 * Modal/popover for selecting background images in Focus mode.
 * Displays thumbnail grid from the media catalog with category filters.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { X, Search, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import {
    getCategories,
    getImagesByCategory,
    getAllImages,
    setUserSelectedImages,
    getUserSelectedImages,
    type CatalogImage,
    type ImageCategory,
} from '@/lib/meditate/backgroundCatalog'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface BackgroundPickerProps {
    isOpen: boolean
    onClose: () => void
    theme: ThemeName
    soundscape: SoundscapeType
    onBackgroundChange?: (imageId: string) => void
    className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function BackgroundPicker({
    isOpen,
    onClose,
    theme,
    soundscape,
    onBackgroundChange,
    className,
}: BackgroundPickerProps) {
    const isDark = isDarkTheme(theme)
    const [images, setImages] = useState<CatalogImage[]>([])
    const [categories, setCategories] = useState<{ category: ImageCategory; count: number }[]>([])
    const [selectedCategory, setSelectedCategory] = useState<ImageCategory | 'all'>('all')
    const [selectedImages, setSelectedImages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Load images and categories
    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [cats, imgs] = await Promise.all([
                    getCategories(),
                    selectedCategory === 'all' ? getAllImages() : getImagesByCategory(selectedCategory),
                ])
                setCategories(cats)
                setImages(imgs)

                // Load user's selected images
                const userSelected = getUserSelectedImages(soundscape)
                setSelectedImages(userSelected)
            } catch (error) {
                console.error('Failed to load backgrounds:', error)
            }
            setLoading(false)
        }

        if (isOpen) {
            load()
        }
    }, [isOpen, selectedCategory, soundscape])

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Filter by search
    const filteredImages = images.filter(img =>
        searchQuery === '' ||
        img.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        img.alt.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Toggle image selection
    const toggleImage = (imageId: string) => {
        setSelectedImages(prev => {
            const newSelection = prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]

            // Save selection
            setUserSelectedImages(soundscape, newSelection)

            // Notify parent
            if (onBackgroundChange && newSelection.length > 0) {
                onBackgroundChange(newSelection[newSelection.length - 1])
            }

            return newSelection
        })
    }

    // Select all in category
    const selectAll = () => {
        const allIds = filteredImages.map(img => img.id)
        setSelectedImages(allIds)
        setUserSelectedImages(soundscape, allIds)
    }

    // Clear selection
    const clearSelection = () => {
        setSelectedImages([])
        setUserSelectedImages(soundscape, [])
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                        'relative w-full max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden',
                        'shadow-2xl',
                        isDark ? 'bg-zinc-900' : 'bg-white',
                        className
                    )}
                >
                    {/* Header */}
                    <div className={cn(
                        'flex items-center justify-between px-6 py-4 border-b',
                        isDark ? 'border-zinc-700' : 'border-zinc-200'
                    )}>
                        <div>
                            <h2 className={cn(
                                'text-lg font-semibold',
                                isDark ? 'text-white' : 'text-zinc-900'
                            )}>
                                Choose Backgrounds
                            </h2>
                            <p className={cn(
                                'text-sm',
                                isDark ? 'text-zinc-400' : 'text-zinc-500'
                            )}>
                                Select images for your focus session slideshow
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={cn(
                                'p-2 rounded-lg transition-colors',
                                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search and filters */}
                    <div className={cn(
                        'flex items-center gap-4 px-6 py-3 border-b',
                        isDark ? 'border-zinc-700' : 'border-zinc-200'
                    )}>
                        {/* Search */}
                        <div className={cn(
                            'flex items-center gap-2 flex-1 px-3 py-2 rounded-lg',
                            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                        )}>
                            <Search className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                            <input
                                type="text"
                                placeholder="Search backgrounds..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={cn(
                                    'flex-1 bg-transparent text-sm outline-none',
                                    isDark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
                                )}
                            />
                        </div>

                        {/* Category filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as ImageCategory | 'all')}
                            className={cn(
                                'px-3 py-2 rounded-lg text-sm outline-none cursor-pointer',
                                isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'
                            )}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(({ category, count }) => (
                                <option key={category} value={category}>
                                    {category} ({count})
                                </option>
                            ))}
                        </select>

                        {/* Actions */}
                        <button
                            onClick={selectAll}
                            className={cn(
                                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            )}
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearSelection}
                            className={cn(
                                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            )}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Image grid */}
                    <div className="overflow-y-auto max-h-[calc(80vh-180px)] p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className={cn('w-6 h-6 animate-spin', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                            </div>
                        ) : filteredImages.length === 0 ? (
                            <div className={cn('text-center py-12', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                                No images found
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {filteredImages.map((image) => {
                                    const isSelected = selectedImages.includes(image.id)
                                    return (
                                        <button
                                            key={image.id}
                                            onClick={() => toggleImage(image.id)}
                                            className={cn(
                                                'relative aspect-video rounded-lg overflow-hidden group',
                                                'ring-2 transition-all duration-200',
                                                isSelected
                                                    ? 'ring-emerald-500 ring-offset-2'
                                                    : isDark
                                                        ? 'ring-transparent hover:ring-zinc-600'
                                                        : 'ring-transparent hover:ring-zinc-300',
                                                isDark ? 'ring-offset-zinc-900' : 'ring-offset-white'
                                            )}
                                        >
                                            <Image
                                                src={image.thumbnail || image.url}
                                                alt={image.alt}
                                                fill
                                                className="object-cover"
                                                sizes="200px"
                                            />
                                            {/* Selected overlay */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                            {/* Hover overlay */}
                                            <div className={cn(
                                                'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity',
                                                'bg-gradient-to-t from-black/60 to-transparent'
                                            )}>
                                                <span className="absolute bottom-2 left-2 right-2 text-white text-xs truncate">
                                                    {image.alt}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={cn(
                        'flex items-center justify-between px-6 py-4 border-t',
                        isDark ? 'border-zinc-700' : 'border-zinc-200'
                    )}>
                        <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                            {selectedImages.length} of {filteredImages.length} selected
                        </span>
                        <button
                            onClick={onClose}
                            className={cn(
                                'px-4 py-2 rounded-lg font-medium transition-colors',
                                'bg-emerald-500 text-white hover:bg-emerald-600'
                            )}
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
