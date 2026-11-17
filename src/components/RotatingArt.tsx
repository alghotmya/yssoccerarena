import { useEffect, useState } from 'react'

interface RotatingArtProps {
  images: readonly string[]
  intervalMs: number
  className: string
  alt: string
}

export function RotatingArt({ images, intervalMs, className, alt }: RotatingArtProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [images, intervalMs])

  return <img key={index} className={className} src={images[index]} alt={alt} />
}
