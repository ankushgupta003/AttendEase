import { BellRinging, CaretDown, UserCircle, CalendarBlank } from '@phosphor-icons/react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { clearAuth, getAuthUser } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  title: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

function getYearOptions() {
  const now = new Date();
  return [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
}

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AppHeader({ title, selectedMonth, onMonthChange }: AppHeaderProps) {
  const years = getYearOptions();
  const [selectedYear, selectedMonthNum] = selectedMonth.split("-").map(Number);
  const currentMonthLabel = (() => {
    const date = new Date(selectedYear, (selectedMonthNum ?? 1) - 1, 1);
    if (Number.isNaN(date.getTime())) return selectedMonth;
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  })();
  const navigate = useNavigate();
  const user = getAuthUser();
  const displayName = user?.username ? user.username.toUpperCase() : "User";
  const role = user?.role ? user.role.toUpperCase() : "";

  return (
    <header className="sticky top-0 z-30 flex h-[62px] items-center border-b border-border/70 bg-white/75 px-4 md:px-6 gap-3 backdrop-blur">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="text-[11px] text-muted-foreground hidden sm:block">Attendance & payroll command center</p>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs h-9 rounded-full px-3">
              <CalendarBlank className="h-4 w-4 text-muted-foreground" weight="duotone" />
              <span>{currentMonthLabel}</span>
              <CaretDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2 border-b border-border">
              <div className="flex gap-2">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      const month = String(selectedMonthNum || 1).padStart(2, "0");
                      onMonthChange(`${y}-${month}`);
                    }}
                    className={`flex-1 rounded-full px-2 py-1 text-xs border ${y === selectedYear ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-muted/60"}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {monthLabels.map((label, idx) => {
                const monthValue = String(idx + 1).padStart(2, "0");
                const value = `${selectedYear}-${monthValue}`;
                const isActive = selectedMonth === value;
                return (
                  <button
                    key={label}
                    onClick={() => onMonthChange(value)}
                    className={`rounded-full px-2 py-1 text-xs border ${isActive ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/60"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <BellRinging className="h-4 w-4 text-muted-foreground" weight="duotone" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9 px-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" weight="duotone" />
              </div>
              <span className="text-xs font-semibold hidden sm:block">{displayName}</span>
              {role && <span className="text-[10px] text-muted-foreground hidden sm:block">{role}</span>}
              <CaretDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                clearAuth();
                navigate("/login");
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
