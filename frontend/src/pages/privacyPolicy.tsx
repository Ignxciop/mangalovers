import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
                        Política de Privacidad
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Última actualización: {lastUpdated}
                    </p>
                </div>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm text-foreground/80 leading-relaxed">
                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            1. Responsable del tratamiento
                        </h2>
                        <p>
                            Mangalovers es responsable del tratamiento de los
                            datos personales recopilados a través de esta
                            plataforma, operando bajo la legislación vigente en
                            la República de Chile, en particular la Ley N°
                            19.628 sobre Protección de la Vida Privada.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            2. Datos que recopilamos
                        </h2>
                        <p>
                            Al registrarte y usar Mangalovers, recopilamos los
                            siguientes datos:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>
                                <strong className="text-foreground">
                                    Datos de cuenta:
                                </strong>{" "}
                                nombre, apellido y dirección de correo
                                electrónico
                            </li>
                            <li>
                                <strong className="text-foreground">
                                    Credenciales:
                                </strong>{" "}
                                contraseña almacenada en formato cifrado
                                (bcrypt), nunca en texto plano
                            </li>
                            <li>
                                <strong className="text-foreground">
                                    Historial de lectura:
                                </strong>{" "}
                                capítulos leídos, progreso por serie y favoritos
                                guardados
                            </li>
                            <li>
                                <strong className="text-foreground">
                                    Datos de sesión:
                                </strong>{" "}
                                tokens de autenticación para mantener tu sesión
                                activa
                            </li>
                        </ul>
                        <p>
                            No recopilamos datos de pago, ubicación, datos
                            biométricos ni información sensible de ningún tipo.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            3. Finalidad del tratamiento
                        </h2>
                        <p>
                            Los datos recopilados se utilizan exclusivamente
                            para:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>
                                Identificarte y autenticarte en la plataforma
                            </li>
                            <li>
                                Guardar y mostrar tu progreso de lectura y
                                favoritos
                            </li>
                            <li>
                                Generar estadísticas personales de lectura
                                visibles solo para ti
                            </li>
                            <li>
                                Mantener la seguridad e integridad del servicio
                            </li>
                        </ul>
                        <p>
                            No utilizamos tus datos para publicidad, no los
                            vendemos ni los compartimos con terceros con fines
                            comerciales.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            4. Almacenamiento y seguridad
                        </h2>
                        <p>
                            Tus datos se almacenan en servidores seguros. Las
                            contraseñas se cifran con bcrypt antes de ser
                            almacenadas. Utilizamos tokens JWT con tiempo de
                            expiración para gestionar las sesiones, minimizando
                            el riesgo de accesos no autorizados.
                        </p>
                        <p>
                            A pesar de nuestras medidas de seguridad, ningún
                            sistema es completamente infalible. En caso de una
                            brecha de seguridad que afecte tus datos, te
                            notificaremos a la brevedad posible.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            5. Retención de datos
                        </h2>
                        <p>
                            Conservamos tus datos mientras tu cuenta esté
                            activa. Si solicitas la eliminación de tu cuenta,
                            procederemos a eliminar todos tus datos personales y
                            tu historial de lectura de nuestros sistemas en un
                            plazo razonable.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            6. Tus derechos
                        </h2>
                        <p>
                            De acuerdo con la legislación chilena, tienes
                            derecho a:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>
                                <strong className="text-foreground">
                                    Acceso:
                                </strong>{" "}
                                solicitar qué datos tenemos sobre ti
                            </li>
                            <li>
                                <strong className="text-foreground">
                                    Rectificación:
                                </strong>{" "}
                                corregir datos incorrectos o desactualizados
                            </li>
                            <li>
                                <strong className="text-foreground">
                                    Cancelación:
                                </strong>{" "}
                                solicitar la eliminación de tus datos
                            </li>
                            <li>
                                <strong className="text-foreground">
                                    Oposición:
                                </strong>{" "}
                                oponerte al tratamiento de tus datos en
                                determinadas circunstancias
                            </li>
                        </ul>
                        <p>
                            Para ejercer cualquiera de estos derechos,
                            contáctanos a través de la plataforma.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            7. Cookies y almacenamiento local
                        </h2>
                        <p>
                            Mangalovers puede utilizar cookies o almacenamiento
                            local del navegador para mantener tu sesión activa y
                            recordar tus preferencias de tema (claro/oscuro). No
                            utilizamos cookies de seguimiento ni de publicidad.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            8. Menores de edad
                        </h2>
                        <p>
                            Mangalovers no está dirigida a menores de 13 años.
                            Si tienes conocimiento de que un menor ha
                            proporcionado datos personales sin consentimiento de
                            sus tutores, contáctanos para proceder con la
                            eliminación de dicha información.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            9. Cambios en esta política
                        </h2>
                        <p>
                            Podemos actualizar esta Política de Privacidad
                            ocasionalmente. Te notificaremos de cambios
                            significativos mediante un aviso en la plataforma.
                            El uso continuado del servicio tras los cambios
                            implica la aceptación de la política actualizada.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-foreground">
                            10. Contacto
                        </h2>
                        <p>
                            Para cualquier consulta relacionada con el
                            tratamiento de tus datos personales, puedes
                            contactarnos a través de la plataforma.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
