import { Helmet } from "react-helmet-async";

const SITE_URL = "https://mangalovers.josenunez.cl";

interface SEOProps {
    title?: string;
    description?: string;
    ogImage?: string;
    ogType?: string;
    canonicalPath?: string;
    noIndex?: boolean;
}

const defaultTitle = "Mangalovers - Lee manga y manhwa online gratis";
const defaultDescription =
    "Mangalovers es una plataforma para leer manga y manhwa online. Explora cientos de series, sigue tu progreso y descubre nuevos capítulos cada día.";
const defaultOgImage = "/icon-512.png";

export function SEO({
    title,
    description = defaultDescription,
    ogImage = defaultOgImage,
    ogType = "website",
    canonicalPath,
    noIndex = false,
}: SEOProps) {
    const fullTitle = title ? `${title} | Mangalovers` : defaultTitle;
    const canonicalUrl = canonicalPath
        ? `${SITE_URL}${canonicalPath}`
        : SITE_URL;
    const imageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />

            <link rel="canonical" href={canonicalUrl} />

            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonicalUrl} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrl} />

            {noIndex && <meta name="robots" content="noindex, nofollow" />}
        </Helmet>
    );
}
