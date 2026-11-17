import { useEffect, useState } from 'react'

interface RotatingArtProps {
  images: readonly string[]
  intervalMs: number
  className?: string
  alt: string
}

export function RotatingArt({ images, intervalMs, className = '', alt }: RotatingArtProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [images, intervalMs])

  return (
    <div className={`art-carousel ${className}`.trim()} aria-roledescription="carousel">
      <div className="art-carousel-stage">
        {images.map((src, i) => (
          <img
            key={src}
            className={i === index ? 'art-slide active' : 'art-slide'}
            src={src}
            alt={i === index ? alt : ''}
            aria-hidden={i !== index}
          />
        ))}
      </div>
      <div className="art-carousel-dots" aria-hidden>
        {images.map((src, i) => (
          <span key={src} className={i === index ? 'dot active' : 'dot'} />
        ))}
      </div>
    </div>
  )
}
