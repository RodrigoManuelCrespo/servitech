import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">ServiTech</h1>
          <p className="text-sm text-muted-foreground">Ingresá con tu cuenta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
