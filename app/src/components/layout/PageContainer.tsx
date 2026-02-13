const SIZE_CLASSES = {
  narrow: 'max-w-3xl',
  medium: 'max-w-5xl',
  wide: 'max-w-6xl',
} as const;

interface PageContainerProps {
  children: React.ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function PageContainer({ children, size = 'medium', className = '' }: PageContainerProps) {
  return (
    <div className={`${SIZE_CLASSES[size]} mx-auto px-4 sm:px-6 py-8 sm:py-12 ${className}`}>
      {children}
    </div>
  );
}
