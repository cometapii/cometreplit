"use client"

import { useEffect } from "react"

export function NoCache() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const metaTags = [
        { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate, max-age=0' },
        { httpEquiv: 'Pragma', content: 'no-cache' },
        { httpEquiv: 'Expires', content: '0' },
      ]

      metaTags.forEach(({ httpEquiv, content }) => {
        const existing = document.querySelector(`meta[http-equiv="${httpEquiv}"]`)
        if (existing) {
          existing.setAttribute('content', content)
        } else {
          const meta = document.createElement('meta')
          meta.httpEquiv = httpEquiv
          meta.content = content
          document.head.appendChild(meta)
        }
      })
    }
  }, [])

  return null
}
