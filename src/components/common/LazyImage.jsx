import { useState, useEffect, useRef } from 'react'

/**
 * LazyImage — Delays image fetching until the element enters the viewport.
 * Uses IntersectionObserver for true step-by-step loading on scroll.
 */
export default function LazyImage({
  src,
  alt = '',
  className = '',
  width = '100%',
  height = '180px',
  style = {},
  ...props
}) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // If IntersectionObserver is not supported, fallback to immediate render
    if (!('IntersectionObserver' in window)) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '100px', // start loading slightly before coming into view
        threshold: 0.01,
      },
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`lazy-img-container ${className}`}
      style={{
        position: 'relative',
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#eef2f5',
        overflow: 'hidden',
        ...style,
      }}
    >
      {isInView ? (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'lazy-img--loaded' : 'lazy-img--loading'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isLoaded ? 1 : 0.4,
            display: 'block',
          }}
          {...props}
        />
      ) : (
        <div
          className="lazy-img-skeleton"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f3f5 25%, #e6eaed 50%, #f0f3f5 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-pulse 1.5s infinite',
          }}
        />
      )}
    </div>
  )
}
