import { Button } from "@/components/ui/button";
import {
  BarChart3,
  LogOut,
  Menu,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Target,
  AlertCircle,
  FileText,
  Tags,
  List,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useFirebaseAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const navigate = (href: string) => {
    setLocation(href);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const NavItem = ({
    href,
    icon,
    label,
    hoverClass,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    hoverClass: string;
  }) => {
    const isActive = location === href;

    return (
      <button
        type="button"
        onClick={() => navigate(href)}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors
          ${isActive ? "bg-gray-100 text-gray-900" : `text-gray-700 ${hoverClass}`}
        `}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <button type="button" onClick={() => navigate("/")} className="w-full">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">To Fuhh</h1>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <NavItem
              href="/"
              hoverClass="hover:bg-blue-50"
              label="Dashboard"
              icon={<BarChart3 className="h-5 w-5" />}
            />

            {/* Transações */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Transações
            </div>

            <NavItem
              href="/add-income"
              hoverClass="hover:bg-green-50"
              label="Adicionar Entrada"
              icon={
                <>
                  <Plus className="h-5 w-5" />
                  <TrendingUp className="h-4 w-4" />
                </>
              }
            />

            <NavItem
              href="/add-expense"
              hoverClass="hover:bg-red-50"
              label="Adicionar Gasto"
              icon={
                <>
                  <Plus className="h-5 w-5" />
                  <TrendingDown className="h-4 w-4" />
                </>
              }
            />

            <NavItem
              href="/transactions/all"
              hoverClass="hover:bg-gray-50"
              label="Ver Lançamentos"
              icon={<List className="h-5 w-5" />}
            />

            {/* Análises */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
              Análises
            </div>

            <NavItem
              href="/analytics"
              hoverClass="hover:bg-blue-50"
              label="Gráficos e Relatórios"
              icon={<BarChart3 className="h-5 w-5" />}
            />

            {/* Ferramentas */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
              Ferramentas
            </div>

            <NavItem
              href="/goals"
              hoverClass="hover:bg-purple-50"
              label="Metas Financeiras"
              icon={<Target className="h-5 w-5" />}
            />

            <NavItem
              href="/alerts"
              hoverClass="hover:bg-orange-50"
              label="Alertas e Limites"
              icon={<AlertCircle className="h-5 w-5" />}
            />

            <NavItem
              href="/reports"
              hoverClass="hover:bg-indigo-50"
              label="Exportar Relatórios"
              icon={<FileText className="h-5 w-5" />}
            />

            {/* ✅ NOVO: Categorias */}
            <NavItem
              href="/categories"
              hoverClass="hover:bg-indigo-50"
              label="Categorias"
              icon={<Tags className="h-5 w-5" />}
            />
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 p-4 space-y-4">
            <div className="px-4 py-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Usuário</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
                {user?.displayName || user?.email || "Usuário"}
              </p>
            </div>

            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">To Fuhh</h1>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Abrir/fechar menu"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
