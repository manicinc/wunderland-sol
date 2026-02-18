'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  diagram: string;
  className?: string;
}

function MermaidDiagramImpl({ diagram, className = '' }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current) return;
      
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#e879f9',
          primaryTextColor: '#f3f4f6',
          primaryBorderColor: '#4b5563',
          lineColor: '#a78bfa',
          secondaryColor: '#c084fc',
          tertiaryColor: '#f0abfc',
          background: '#1f2937',
          mainBkg: '#374151',
          secondBkg: '#4b5563',
          tertiaryBkg: '#1f2937',
          textColor: '#f3f4f6',
          mainContrastColor: '#f3f4f6',
          nodeBkg: '#374151',
          nodeBorder: '#a78bfa',
          clusterBkg: '#1f2937',
          clusterBorder: '#6b7280',
          defaultLinkColor: '#a78bfa',
          titleColor: '#f3f4f6',
          edgeLabelBackground: '#1f2937',
          nodeTextColor: '#f3f4f6',
          fontSize: '16px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        },
      });

      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, diagram);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
      }
    };

    renderDiagram();
  }, [diagram]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Support both default and named import styles
export const MermaidDiagram = MermaidDiagramImpl;
export default MermaidDiagramImpl;
