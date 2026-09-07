import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16 flex flex-col items-center">
      <SignIn />
    </div>
  );
}
