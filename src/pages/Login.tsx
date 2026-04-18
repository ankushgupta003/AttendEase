import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setAuth, isLoggedIn } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import AttendEaseLogo from "@/components/branding/AttendEaseLogo";

type LoginResponse = {
  token: string;
  user: { id: string; username: string; role: string };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn()) navigate("/");
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<LoginResponse>("/auth/login", { username, password });
      setAuth({ token: res.token, user: res.user });
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-4 py-8 md:py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,#e9d8fd,transparent_40%),radial-gradient(circle_at_80%_10%,#bfdbfe,transparent_35%),radial-gradient(circle_at_50%_90%,#bbf7d0,transparent_40%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.35] [background-size:48px_48px] [background-image:linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <AttendEaseLogo className="mx-auto" />
        </div>

        <Card className="border-black/10 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Sign In</CardTitle>
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] text-white">Secure</span>
            </div>
            <p className="text-xs text-muted-foreground">Admin and HR accounts only.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Need access? Contact Admin.</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">v1.0</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
