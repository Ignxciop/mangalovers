import axios from "axios";
import logger from "../config/logger.js";

const BLOCKED_DOMAINS = ["img1mw.xyz", "img1mw.xyz"];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Dest": "image",
  "Sec-Ch-Ua": '"Chromium";v="125", "Not.A/Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

export function needsProxy(url) {
  try {
    const hostname = new URL(url).hostname;
    return BLOCKED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

export function proxyUrl(url) {
  if (!needsProxy(url)) return url;
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}

export async function fetchProxiedImage(imageUrl) {
  const referer = new URL(imageUrl);
  const domain = referer.hostname;

  const response = await axios.get(imageUrl, {
    responseType: "stream",
    headers: {
      ...BROWSER_HEADERS,
      Referer: `https://${domain}/`,
    },
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: (status) => status < 500,
  });

  return response;
}
