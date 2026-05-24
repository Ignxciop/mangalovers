import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

const SITE_URL = process.env.SITE_URL || "https://mangalovers.josenunez.cl";

const routes = [
    {
        path: "mangas",
        title: "Catálogo de Manga y Manhwa | Mangalovers",
        description:
            "Explora cientos de mangas, manhwas y manhuas en Mangalovers. Filtra por género, estado y tipo para encontrar tu próxima lectura.",
        canonical: `${SITE_URL}/mangas`,
    },
    {
        path: "terminos",
        title: "Términos de Servicio | Mangalovers",
        description:
            "Términos de Servicio de Mangalovers. Conoce las condiciones de uso de la plataforma.",
        canonical: `${SITE_URL}/terminos`,
    },
    {
        path: "privacidad",
        title: "Política de Privacidad | Mangalovers",
        description:
            "Política de Privacidad de Mangalovers. Conoce cómo manejamos tus datos personales.",
        canonical: `${SITE_URL}/privacidad`,
    },
];

const html = readFileSync(join(dist, "index.html"), "utf-8");

for (const route of routes) {
    const dir = join(dist, route.path);
    mkdirSync(dir, { recursive: true });

    let out = html;

    out = out.replace(
        /<title>.*?<\/title>/,
        `<title>${route.title}</title>`,
    );
    out = out.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${route.description}" />`,
    );

    if (!out.includes('rel="canonical"')) {
        out = out.replace(
            "</head>",
            `  <link rel="canonical" href="${route.canonical}" />\n</head>`,
        );
    } else {
        out = out.replace(
            /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
            `<link rel="canonical" href="${route.canonical}" />`,
        );
    }

    out = out.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:title" content="${route.title}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:description" content="${route.description}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:url" content="${route.canonical}" />`,
    );

    writeFileSync(join(dir, "index.html"), out, "utf-8");
    console.log(`  ✓ prerendered /${route.path}`);
}

console.log(`\nPrerendered ${routes.length} static routes`);
