import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentBrand } from "@/lib/brand";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if ((await currentBrand()).custom) redirect("/login");
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
