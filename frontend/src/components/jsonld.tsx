import { Helmet } from "react-helmet-async";

interface JsonLdProps {
    schema: Record<string, unknown>;
}

export function JsonLd({ schema }: JsonLdProps) {
    return (
        <Helmet>
            <script type="application/ld+json">
                {JSON.stringify(schema)}
            </script>
        </Helmet>
    );
}
