import { ChevronLeft } from "lucide-react";

export default function TermsOfService() {
    const lastUpdated = "26 de febrero de 2026";

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-12 max-w-3xl">
                <a
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 group"
                >
                    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Volver al inicio
                </a>

                <div className="space-y-2 mb-10">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        Términos de Servicio
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Última actualización: {lastUpdated}
                    </p>
                </div>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm text-foreground/80 leading-relaxed">
                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            1. Aceptación de los términos
                        </h2>
                        <p>
                            Al acceder o utilizar Mangalovers ("la plataforma"),
                            aceptas quedar vinculado por estos Términos de
                            Servicio. Si no estás de acuerdo con alguna parte de
                            estos términos, no uses el servicio.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            2. Descripción del servicio
                        </h2>
                        <p>
                            Mangalovers es una plataforma de lectura de manga y
                            manhwa que permite a los usuarios explorar
                            catálogos, registrar su progreso de lectura,
                            gestionar favoritos y hacer seguimiento de sus
                            hábitos de lectura. El contenido disponible en la
                            plataforma es indexado desde fuentes externas y no
                            es producido ni almacenado directamente por
                            Mangalovers.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            3. Registro y cuentas
                        </h2>
                        <p>
                            Para acceder a funcionalidades como favoritos y
                            seguimiento de lectura, debes crear una cuenta
                            proporcionando un nombre, apellido, dirección de
                            correo electrónico y contraseña. Eres responsable de
                            mantener la confidencialidad de tus credenciales y
                            de todas las actividades realizadas desde tu cuenta.
                        </p>
                        <p>
                            Debes notificarnos inmediatamente ante cualquier uso
                            no autorizado de tu cuenta. Mangalovers no será
                            responsable por pérdidas derivadas del uso no
                            autorizado de tu cuenta.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            4. Uso aceptable
                        </h2>
                        <p>Al usar Mangalovers, aceptas no:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>
                                Utilizar la plataforma para fines ilegales o no
                                autorizados
                            </li>
                            <li>
                                Intentar acceder a sistemas o datos que no te
                                corresponden
                            </li>
                            <li>
                                Interferir con el funcionamiento normal del
                                servicio
                            </li>
                            <li>
                                Crear cuentas de forma automatizada o masiva
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            5. Propiedad intelectual
                        </h2>
                        <p>
                            El contenido de manga y manhwa disponible en la
                            plataforma pertenece a sus respectivos autores y
                            editores. Mangalovers no reclama propiedad sobre
                            dicho contenido. Si eres titular de derechos y
                            consideras que tu obra está siendo utilizada de
                            forma indebida, contáctanos para proceder con su
                            retiro inmediato.
                        </p>
                        <p>
                            El diseño, código y funcionalidades propias de
                            Mangalovers son propiedad de sus desarrolladores y
                            están protegidos por las leyes de propiedad
                            intelectual aplicables en Chile.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            6. Limitación de responsabilidad
                        </h2>
                        <p>
                            Mangalovers se proporciona "tal cual", sin garantías
                            de ningún tipo. No garantizamos la disponibilidad
                            continua del servicio ni la exactitud del contenido
                            indexado. En ningún caso seremos responsables por
                            daños indirectos, incidentales o consecuentes
                            derivados del uso de la plataforma.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            7. Modificaciones del servicio
                        </h2>
                        <p>
                            Nos reservamos el derecho de modificar o
                            discontinuar el servicio en cualquier momento sin
                            previo aviso. También podemos actualizar estos
                            Términos de Servicio. El uso continuado de la
                            plataforma tras la publicación de cambios implica la
                            aceptación de los nuevos términos.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            8. Terminación de cuenta
                        </h2>
                        <p>
                            Podemos suspender o eliminar tu cuenta si incumples
                            estos términos. También puedes solicitar la
                            eliminación de tu cuenta en cualquier momento, lo
                            que resultará en la eliminación de todos tus datos
                            asociados de nuestros sistemas.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            9. Ley aplicable
                        </h2>
                        <p>
                            Estos términos se rigen por las leyes de la
                            República de Chile. Cualquier disputa derivada del
                            uso de Mangalovers será sometida a la jurisdicción
                            de los tribunales competentes de Chile.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            10. Contacto
                        </h2>
                        <p>
                            Si tienes preguntas sobre estos Términos de
                            Servicio, puedes contactarnos a través de la
                            plataforma.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
