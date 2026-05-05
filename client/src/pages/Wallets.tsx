import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Wallet, Gift, Info } from "lucide-react";
import { getUserWallets, createWallet, deleteWallet } from "@/lib/db";

const COLORS = [
  { label: "Azul", value: "#3b82f6" },
  { label: "Verde", value: "#10b981" },
  { label: "Roxo", value: "#8b5cf6" },
  { label: "Laranja", value: "#f59e0b" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Cinza", value: "#6b7280" },
];

export default function Wallets() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"regular" | "benefit">("regular");
  const [color, setColor] = useState("#3b82f6");

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: getUserWallets,
  });

  const createMutation = useMutation({
    mutationFn: () => createWallet({ name: name.trim(), type, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setName("");
      setType("regular");
      setColor("#3b82f6");
      toast.success("Carteira criada!");
    },
    onError: (e) => {
      console.error("[Wallets] Erro ao criar:", e);
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWallet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Carteira removida.");
    },
  });

  const regular = wallets.filter((w) => w.type === "regular");
  const benefit = wallets.filter((w) => w.type === "benefit");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carteiras</h1>
        <p className="text-gray-500 text-sm mt-1">
          Organize seus dinheiros em carteiras separadas. Carteiras de benefício não entram na análise de renda.
        </p>
      </div>

      {/* Explicação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Carteira Regular</strong> — dinheiro real (conta corrente, poupança, dinheiro físico). Entra nas análises de renda e economia.</p>
          <p><strong>Carteira Benefício</strong> — Vale Refeição, Vale Alimentação, Auxílio HO, etc. Registra entradas e saídas separadamente, sem inflar sua renda.</p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Carteira</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vale Refeição, Nubank, HO..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as "regular" | "benefit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular (dinheiro real)</SelectItem>
                  <SelectItem value="benefit">Benefício (VR, VA, HO...)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c.value ? "border-gray-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Carteira
          </Button>
        </CardContent>
      </Card>

      {/* Lista — Regulares */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            Carteiras Regulares
          </CardTitle>
          <CardDescription>Entram na análise de renda e economia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : regular.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma carteira regular. Crie uma acima (ex: "Principal").</p>
          ) : (
            regular.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                  <span className="font-medium text-gray-900">{w.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(w.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Lista — Benefícios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-600" />
            Carteiras de Benefício
          </CardTitle>
          <CardDescription>VR, VA, HO — não afetam a análise de renda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : benefit.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma carteira de benefício cadastrada.</p>
          ) : (
            benefit.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-purple-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                  <div>
                    <span className="font-medium text-gray-900">{w.name}</span>
                    <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">benefício</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(w.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
