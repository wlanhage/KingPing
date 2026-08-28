'use client';
import { Component, type ReactNode } from 'react';

/**
 * Felgräns kring WebGL-canvasen.
 *
 * Utan den tar ett fel inuti three/R3F ner HELA finalen: en förlorad WebGL-kontext
 * får R3F att läsa `getContextAttributes()` som då är null, felet propagerar upp
 * genom React-trädet och sidan ersätts av "Application error". Kontextförlust är
 * inget udda fall — det händer vid bakgrundad flik, GPU-återställning och
 * minnesbrist på mobil.
 *
 * Vid fel renderas ingenting: SVG-väven ligger kvar längre ner i sidan och bär
 * innehållet vidare.
 */
export class CanvasBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('3D-väven kunde inte renderas, faller tillbaka på SVG-versionen:', error);
    }
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
