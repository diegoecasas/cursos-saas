import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16 flex flex-col items-center">
      <SignUp />
    </div>
  );
}
