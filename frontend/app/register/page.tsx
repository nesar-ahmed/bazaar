import { AuthForm } from "@/app/components/auth-form";
import { noticeFromCode, safeNextTarget } from "@/app/components/member/notices";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create an account",
  description:
    "Open a Bazaar account: three fields, a bag that follows you between devices, and every order filed under a reference.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextTarget = safeNextTarget(params.next);
  const notice = noticeFromCode(params.notice);

  return (
    <div className="auth">
      <section className="auth__main" aria-labelledby="auth-title">
        <h1 className="auth__title" id="auth-title">Create your account</h1>
        <AuthForm mode="register" nextTarget={nextTarget} notice={notice} />
      </section>
    </div>
  );
}
