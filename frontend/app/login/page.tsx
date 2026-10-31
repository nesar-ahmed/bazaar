import { AuthForm } from "@/app/components/auth-form";
import { noticeFromCode, safeNextTarget } from "@/app/components/member/notices";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  description:
    "Sign in to keep your bag across devices and read the ledger of orders filed against your Bazaar account.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextTarget = safeNextTarget(params.next);
  const notice = noticeFromCode(params.notice);

  return (
    <div className="auth">
      <section className="auth__main" aria-labelledby="auth-title">
        <h1 className="auth__title" id="auth-title">Sign in</h1>
        <AuthForm mode="login" nextTarget={nextTarget} notice={notice} />
      </section>
    </div>
  );
}
