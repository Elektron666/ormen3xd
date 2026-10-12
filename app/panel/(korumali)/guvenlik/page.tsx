import { requirePanelUser, twoFactorRequired } from "@/lib/auth/panel";
import { PageHeader } from "@/components/panel/ui";
import { TwoFactorSetup } from "@/components/panel/TwoFactorSetup";
import { PasswordForm } from "@/components/panel/PasswordForm";

export const metadata = { title: "Güvenlik" };

export default async function SecurityPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser({ setup: true });
  const required = twoFactorRequired();
  const live = user.mode === "supabase";
  return (
    <>
      <PageHeader title="Güvenlik" eyebrow={user.email} />
      {required && !user.twoFactor && (
        <p role="alert" className="mb-6 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[14px] text-ceviz">
          Panelde iki adımlı doğrulama zorunlu. Diğer sayfalar, aşağıdan doğrulamayı açtıktan sonra açılır.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-cizgi bg-kagit p-6">
          <h2 className="font-display text-[22px]">İki adımlı doğrulama</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-antrasit-70">
            Açıkken panele girmek için şifreden sonra telefonunuzdaki doğrulama uygulamasının (Google Authenticator, Microsoft Authenticator vb.) 6 haneli kodu da gerekir.
            Şifre bir yerde ele geçse bile telefonunuz olmadan panele girilemez.
          </p>
          {live ? (
            <TwoFactorSetup enabled={!!user.twoFactor} />
          ) : (
            <p className="mt-4 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[13px] text-ceviz">Örnek veri modunda yok; Supabase bağlıyken çalışır.</p>
          )}
        </section>
        <section className="rounded-2xl border border-cizgi bg-kagit p-6">
          <h2 className="font-display text-[22px]">Şifre değiştir</h2>
          {live ? (
            <PasswordForm />
          ) : (
            <p className="mt-4 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[13px] text-ceviz">Örnek veri modunda şifre ortam değişkeninden gelir.</p>
          )}
        </section>
      </div>
    </>
  );
}
