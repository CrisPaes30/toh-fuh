import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, Plus } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

// Firestore
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export default function AddIncome() {
  const { user } = useFirebaseAuth();
  const [, setLocation] = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  // 🔥 Carrega categorias do Firestore: users/{uid}/categories
  useEffect(() => {
    if (!user?.uid) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    setCategoriesLoading(true);

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

        setCategories(list);
        setCategoriesLoading(false);
      },
      (err) => {
        console.error(err);
        setCategories([]);
        setCategoriesLoading(false);
        toast.error("Erro ao carregar categorias.");
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error("Usuário não autenticado.");
      return;
    }

    if (!formData.categoryId || !formData.amount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const amountNumber = Number(formData.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 🔥 Salva transação no Firestore: users/{uid}/transactions
      const ref = collection(db, "users", user.uid, "transactions");

      await addDoc(ref, {
        type: "income",
        categoryId: formData.categoryId, // agora é o docId (string)
        amount: Math.round(amountNumber * 100), // centavos
        description: formData.description ?? "",
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: serverTimestamp(),
      });

      toast.success("Entrada registrada com sucesso!");
      setFormData({
        categoryId: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });

      setTimeout(() => setLocation("/"), 800);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar a entrada.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Registrar Entrada
          </CardTitle>
          <CardDescription>
            Adicione uma nova entrada (salário, investimentos, etc.)
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>

                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>

                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>
                        Carregando categorias...
                      </SelectItem>
                    ) : incomeCategories.length > 0 ? (
                      incomeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>
                        Nenhuma categoria disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Ex: Salário do mês de janeiro"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || !user?.uid}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Entrada
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
