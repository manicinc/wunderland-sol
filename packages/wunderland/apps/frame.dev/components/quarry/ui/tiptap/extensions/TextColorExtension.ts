/**
 * Text Color Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/TextColorExtension
 *
 * Adds text color and background color marks.
 * Works with the existing TextStyle extension.
 */

import { Extension } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      /**
       * Set the text color
       */
      setTextColor: (color: string) => ReturnType
      /**
       * Unset the text color
       */
      unsetTextColor: () => ReturnType
      /**
       * Set the background color
       */
      setBackgroundColor: (color: string) => ReturnType
      /**
       * Unset the background color
       */
      unsetBackgroundColor: () => ReturnType
    }
  }
}

// Preset colors for the color picker
export const TEXT_COLORS = [
  { name: 'Default', value: null },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Brown', value: '#92400e' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Red', value: '#dc2626' },
]

export const BACKGROUND_COLORS = [
  { name: 'Default', value: null },
  { name: 'Gray', value: '#f3f4f6', darkValue: '#374151' },
  { name: 'Brown', value: '#fef3c7', darkValue: '#451a03' },
  { name: 'Orange', value: '#ffedd5', darkValue: '#431407' },
  { name: 'Yellow', value: '#fef9c3', darkValue: '#422006' },
  { name: 'Green', value: '#dcfce7', darkValue: '#14532d' },
  { name: 'Blue', value: '#dbeafe', darkValue: '#1e3a8a' },
  { name: 'Purple', value: '#f3e8ff', darkValue: '#3b0764' },
  { name: 'Pink', value: '#fce7f3', darkValue: '#500724' },
  { name: 'Red', value: '#fee2e2', darkValue: '#450a0a' },
]

export interface TextColorOptions {
  types: string[]
}

export const TextColorExtension = Extension.create<TextColorOptions>({
  name: 'textColor',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: element => element.style.color?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.color) {
                return {}
              }
              return {
                style: `color: ${attributes.color}`,
              }
            },
          },
          backgroundColor: {
            default: null,
            parseHTML: element => element.style.backgroundColor?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.backgroundColor) {
                return {}
              }
              return {
                style: `background-color: ${attributes.backgroundColor}; padding: 0 2px; border-radius: 2px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextColor: (color: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { color })
          .run()
      },
      unsetTextColor: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { color: null })
          .removeEmptyTextStyle()
          .run()
      },
      setBackgroundColor: (color: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { backgroundColor: color })
          .run()
      },
      unsetBackgroundColor: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { backgroundColor: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

export default TextColorExtension
