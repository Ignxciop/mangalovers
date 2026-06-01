import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/api/announcements";
import type { Announcement, CreateAnnouncementPayload, UpdateAnnouncementPayload } from "@/types/announcement";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Trash2,
  Save,
  Edit3,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MangaPagination } from "@/components/MangaPagination";
import { AdminHeader } from "@/components/AdminHeader";
import { SEO } from "@/components/seo";

function toUTC4Display(iso: string): string {
  const ms = new Date(iso).getTime() - 4 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 16);
}

function fromUTC4ToUTC(value: string): string {
  return new Date(value + ":00-04:00").toISOString();
}

interface FormState {
  title: string;
  body: string;
  active: boolean;
  publishAt: string;
  expiresAt: string;
}

const emptyForm: FormState = {
  title: "",
  body: "",
  active: true,
  publishAt: toUTC4Display(new Date().toISOString()),
  expiresAt: toUTC4Display(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
};

export default function AdminAnnouncements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Announcement[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [viewingItem, setViewingItem] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const page = parseInt(searchParams.get("page") ?? "1");
  const searchValue = searchParams.get("search") ?? "";

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchValue) params.search = searchValue;
      const res = await getAnnouncements(params);
      setItems(res.data);
      setMeta(res.meta);
    } catch {
      toast.error("Error al cargar anuncios");
    } finally {
      setLoading(false);
    }
  }, [page, searchValue]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      body: item.body,
      active: item.active,
      publishAt: toUTC4Display(item.publishAt),
      expiresAt: toUTC4Display(item.expiresAt),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("El título y el cuerpo son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload: UpdateAnnouncementPayload = {
          title: form.title,
          body: form.body,
          active: form.active,
          publishAt: fromUTC4ToUTC(form.publishAt),
          expiresAt: fromUTC4ToUTC(form.expiresAt),
        };
        await updateAnnouncement(editingId, payload);
        toast.success("Anuncio actualizado");
      } else {
        const payload: CreateAnnouncementPayload = {
          title: form.title,
          body: form.body,
          active: form.active,
          publishAt: fromUTC4ToUTC(form.publishAt),
          expiresAt: fromUTC4ToUTC(form.expiresAt),
        };
        await createAnnouncement(payload);
        toast.success("Anuncio creado");
      }
      setDialogOpen(false);
      fetchItems();
    } catch {
      toast.error("Error al guardar el anuncio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este anuncio?")) return;
    try {
      await deleteAnnouncement(id);
      toast.success("Anuncio eliminado");
      fetchItems();
    } catch {
      toast.error("Error al eliminar el anuncio");
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    try {
      await updateAnnouncement(item.id, { active: !item.active });
      toast.success(item.active ? "Anuncio desactivado" : "Anuncio activado");
      fetchItems();
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Anuncios - Admin" />
      <AdminHeader
        icon={Megaphone}
        title="Anuncios"
        search={{
          placeholder: "Buscar anuncios...",
          value: searchText,
          onChange: setSearchText,
          onEnter: (v) => updateFilter("search", v),
          onClear: () => {
            setSearchText("");
            updateFilter("search", "");
          },
          inputRef: inputRef as React.RefObject<HTMLInputElement | null>,
        }}
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={fetchItems} variant="ghost" className="shrink-0">
            <RefreshCw className="size-4" />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </AdminHeader>

      <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Megaphone className="size-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No hay anuncios aún</p>
            <Button size="sm" onClick={openCreate}>Crear primer anuncio</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card transition-all hover:border-brand/20 cursor-pointer"
                onClick={() => setViewingItem(item)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                    <Badge variant={item.active ? "default" : "secondary"} className="text-[10px] h-4 px-1.5 shrink-0">
                      {item.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {item.body}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(item.publishAt).toLocaleDateString("es-ES")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      hasta {new Date(item.expiresAt).toLocaleDateString("es-ES")}
                    </span>
                    {item._count && (
                      <span>{item._count.seenBy} vistas</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => handleToggleActive(item)}
                    title={item.active ? "Desactivar" : "Activar"}
                  >
                    {item.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => openEdit(item)}
                    title="Editar"
                  >
                    <Edit3 className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <MangaPagination
              page={meta.page}
              totalPages={meta.totalPages}
              setPage={(p) => updateFilter("page", String(p))}
            />
          </div>
        )}
      </main>

      <Dialog open={viewingItem !== null} onOpenChange={(v) => { if (!v) setViewingItem(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center size-10 rounded-xl bg-brand/15 text-brand shrink-0">
                <Megaphone className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">{viewingItem?.title}</DialogTitle>
                <DialogDescription className="sr-only">Detalles del anuncio</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {viewingItem && (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {viewingItem.body}
                </ReactMarkdown>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {new Date(viewingItem.publishAt).toLocaleDateString("es-ES")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  hasta {new Date(viewingItem.expiresAt).toLocaleDateString("es-ES")}
                </span>
                <Badge variant={viewingItem.active ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                  {viewingItem.active ? "Activo" : "Inactivo"}
                </Badge>
                {viewingItem._count && (
                  <span>{viewingItem._count.seenBy} vistas</span>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar anuncio" : "Nuevo anuncio"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Modifica los campos del anuncio" : "Crea un nuevo anuncio para los usuarios"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título del anuncio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Cuerpo (Markdown)</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Escribe el contenido del anuncio en Markdown..."
                className="min-h-[120px] max-h-[300px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v === true })}
              />
              <Label htmlFor="active" className="cursor-pointer">Activo</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publishAt">Publicar desde</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expirar</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
