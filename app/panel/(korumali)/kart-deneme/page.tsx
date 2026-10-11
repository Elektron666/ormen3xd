import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { PageHeader } from "@/components/panel/ui";
import { CardTest } from "@/components/panel/CardTest";

export const metadata = { title: "Kart denemesi" };

export default async function CardTestPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  return (
    <>
      <PageHeader title="Kart denemesi" eyebrow="Ar-Ge" />
      <p className="mb-6 max-w-2xl text-[14px] leading-relaxed text-antrasit-70">
        Kalibrasyon kartının gerçek fotoğrafta ne kadar doğru ölçtüğünü buradan görürsünüz. Kartın penceresinin altına ölçüsü bilinen bir şey koyun; en kolayı kırtasiyeden{" "}
        <strong>milimetrik kâğıt</strong>. Telefonla tepeden çekin, fotoğrafı yükleyin. Sonucu kopyalayıp gönderin; Ar-Ge tablosuna gerçek ölçüm olarak yazılır. Hiçbir şey kaydedilmez.{" "}
        <Link href="/panel/kalibrasyon-karti" target="_blank" className="underline underline-offset-2">
          Kartı yazdır
        </Link>
      </p>
      <CardTest />
    </>
  );
}
