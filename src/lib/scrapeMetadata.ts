import * as cheerio from 'cheerio'

export async function scrapeMetadata(url: string): Promise<{ faviconUrl: string | null; ogImageUrl: string | null }> {
  try {
    const html = await fetch(url, { signal: AbortSignal.timeout(5000) }).then(r => r.text())
    const $ = cheerio.load(html)
    const base = new URL(url).origin

    const resolve = (href: string | undefined): string | null => {
      if (!href) return null
      try {
        return href.startsWith('http') ? href : new URL(href, base).href
      } catch {
        return null
      }
    }

    const ogImageUrl = resolve(
      $('meta[property="og:image"]').attr('content') ??
      $('meta[name="twitter:image"]').attr('content')
    )

    const faviconUrl = resolve(
      $('link[rel="icon"]').attr('href') ??
      $('link[rel~="shortcut"][rel~="icon"]').attr('href') ??
      $('link[rel="apple-touch-icon"]').attr('href') ??
      '/favicon.ico'
    )

    return { faviconUrl, ogImageUrl }
  } catch {
    return { faviconUrl: null, ogImageUrl: null }
  }
}
