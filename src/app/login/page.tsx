import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <h1 className="sr-only">ServiTech</h1>
          <Image
            src="/logo.png"
            alt="ServiTech"
            width={288}
            height={61}
            priority
            unoptimized
            className="mx-auto h-auto w-72"
          />
          <p className="text-sm text-muted-foreground">Ingresá con tu cuenta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
