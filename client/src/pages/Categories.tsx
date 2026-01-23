import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

// firebase
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export default function CategoriesPage() {
  const { user } = useFirebaseAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [items, setItems] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      return;
    }

    const ref = collection(db, "users", user.uid, "categories");
    const q = query(ref, orderBy("name"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Category[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name ?? "",
            type: (data.type ?? "income") as "income" | "expense",
          };
        });
        setItems(list);
      },
      (err) => {
        console.error(err);
        toast.error("Erro ao carregar categorias.");
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const income = useMemo(
    () => items.filter((c) => c.type === "income"),
    [items]
  );
  const expense = useMemo(
    () => items.filter((c) => c.type === "expense"),
    [items]
  );

  const handleAdd = async () => {
    if (!user?.uid) {
      toast.error("Usuário não autenticado.");
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    setSaving(true);
    try {
      const ref = collection(db, "users", user.uid, "categories");
      await addDoc(ref, {
        name: trimmed,
        type,
        createdAt: serverTimestamp(),
      });

      setName("");
      setType("income");
      toast.success("Categoria criada!");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!user?.uid) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "categories", id));
      toast.success("Categoria removida!");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível remover.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Salário"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "income" | "expense")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={saving || !user?.uid}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Adicionar categoria"}
          </Button>

          {!user?.uid && (
            <p className="text-sm text-gray-500">
              Você precisa estar logado para cadastrar categorias.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {income.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma categoria de entrada.
              </p>
            ) : (
              income.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(c.id)}
                    disabled={!user?.uid}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expense.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma categoria de gasto.
              </p>
            ) : (
              expense.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(c.id)}
                    disabled={!user?.uid}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
