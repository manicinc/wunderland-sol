declare module 'he' {
  export function decode(text: string): string

  const he: {
    decode: typeof decode
  }

  export default he
}

