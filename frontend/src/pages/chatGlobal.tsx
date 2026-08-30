import { SEO } from "@/components/seo";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useChatSocket } from "@/hooks/useChatSocket";
import { fetchChatMessages } from "@/api/chat";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Send, MessageSquare } from "lucide-react";

export default function ChatGlobalPage() {
    const user = useAuthStore((s) => s.user);
    const messages = useChatStore((s) => s.messages);
    const setMessages = useChatStore((s) => s.setMessages);
    const { sendMessage } = useChatSocket();
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchChatMessages()
            .then((data) => setMessages([...data.messages].reverse(), data.nextCursor))
            .catch(() => toast.error("Error al cargar el chat"))
            .finally(() => setLoading(false));
    }, [setMessages]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        const content = draft.trim();
        if (!content || sending) return;

        setSending(true);
        const result = await sendMessage(content);
        setSending(false);

        if (result.ok) {
            setDraft("");
        } else if (result.error === "INVALID_CONTENT") {
            toast.error("Mensaje inválido (máximo 300 caracteres)");
        } else {
            toast.error("No se pudo enviar el mensaje");
        }
    };

    const avatarUrl = (avatar: string | null | undefined) =>
        avatar
            ? `${import.meta.env.VITE_API_URL?.replace("/api", "") ?? ""}/uploads/avatars/${avatar}`
            : undefined;

    return (
        <>
            <SEO
                title="Chat global"
                description="Chatea en tiempo real con la comunidad de Mangalovers."
                canonicalPath="/chat"
            />
            <div className="bg-background min-h-full">
                <main className="w-full px-4 lg:px-6 py-8">
                    <div className="mx-auto max-w-2xl flex flex-col h-[calc(100dvh-7rem)] gap-3">
                        <div className="flex items-center gap-3 px-1.5">
                            <div className="flex items-center justify-center size-9 rounded-xl shrink-0 bg-gradient-to-br from-brand to-brand-cyan text-white shadow-sm">
                                <MessageSquare className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-foreground truncate">
                                    Chat global
                                </h1>
                                <p className="text-xs text-muted-foreground truncate">
                                    Conversa en tiempo real con la comunidad
                                </p>
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card/60 flex flex-col gap-3 p-4"
                            aria-live="polite"
                        >
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 animate-pulse">
                                        <div className="size-8 rounded-full bg-muted shrink-0" />
                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                            <div className="h-3 w-24 rounded bg-muted" />
                                            <div className="h-3 w-3/4 rounded bg-muted" />
                                        </div>
                                    </div>
                                ))
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 flex-1 text-center">
                                    <MessageSquare className="size-7 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        Aún no hay mensajes. ¡Sé la primera persona en saludar!
                                    </p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const mine = message.user?.id === user?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex items-start gap-3 max-w-[85%] animate-fade-in-up",
                                                mine && "self-end flex-row-reverse",
                                            )}
                                        >
                                            <Avatar className="size-8 rounded-lg shrink-0">
                                                <AvatarImage
                                                    src={avatarUrl(message.user?.avatarUrl)}
                                                    alt={message.user?.alias ?? "Usuario"}
                                                    className="rounded-lg object-cover"
                                                />
                                                <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
                                                    {message.user?.alias?.[0]?.toUpperCase() ?? "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div
                                                className={cn(
                                                    "flex flex-col gap-0.5 min-w-0",
                                                    mine && "items-end",
                                                )}
                                            >
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="text-xs font-semibold text-foreground truncate">
                                                        {mine ? "Tú" : (message.user?.alias ?? "Usuario")}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                                        {timeAgo(message.createdAt)}
                                                    </span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        "rounded-2xl px-3 py-2 text-sm leading-relaxed break-words max-w-full",
                                                        mine
                                                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                                                            : "bg-muted text-foreground rounded-bl-sm border border-border",
                                                    )}
                                                >
                                                    {message.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                maxLength={300}
                                placeholder="Escribe un mensaje..."
                                aria-label="Mensaje"
                                className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-2 py-1.5"
                            />
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={!draft.trim() || sending}
                                aria-label="Enviar mensaje"
                                className="shrink-0 gap-1.5"
                            >
                                <Send className="size-3.5" />
                                <span className="hidden sm:inline">Enviar</span>
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}