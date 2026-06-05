import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">加载中...</p>}>
      <LoginForm />
    </Suspense>
  );
}
