// "Kurulum durumu": turns facts about the installation into a checklist a
// non-developer can follow. Gathering the facts is in app/panel/(korumali)/durum;
// this part is pure so every rule is unit-tested.

export type CheckStatus = "ok" | "warn" | "error" | "todo";

export interface Check {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  /** What to do, in plain words (shown when not ok). */
  fix?: string;
}

export interface SetupFacts {
  supabase: { configured: boolean; reachable: boolean; error?: string };
  /** Migration file name → applied (only meaningful when Supabase is reachable). */
  migrations: Record<string, boolean>;
  bucketLimited: boolean | null;
  fabrics: { total: number; real: number; active: number };
  models: number;
  panelMode: "supabase" | "demo";
  siteUrl: string | null;
  requestHost: string | null;
  whatsapp: string | null;
  sessionSecretOk: boolean;
  production: boolean;
  /** Vercel region the server code runs in (VERCEL_REGION); null when not on Vercel. */
  region?: string | null;
  /** Days sample requests are kept (SAMPLE_RETENTION_DAYS), null = until deleted by hand. */
  retentionDays: number | null;
}

export const MIGRATIONS = [
  ["20261004000000_init.sql", "Tablolar ve güvenlik kuralları"],
  ["20261005000000_parametric_models.sql", "Seçerek oluşturulan modeller"],
  ["20261006000000_fabric_series_limits.sql", "Firma ve model başına kumaş serisi"],
  ["20261007000000_report_function.sql", "Rapor fonksiyonu"],
  ["20261008000000_storage_limits.sql", "Dosya klasörü sınırları"],
  ["20261009000000_visit_sources.sql", "Ziyaret kaynağı ve etiketler"],
  ["20261010000000_cutting_table.sql", "Kesim masası: numune adımları, lot, kumaş deseni ve yönü"],
  ["20261011000000_zone_meterage.sql", "Bölge başına metraj (kasa, kollar, oturak, sırt)"],
] as const;

export function evaluateSetup(f: SetupFacts): Check[] {
  const checks: Check[] = [];
  const README = "README, “Supabase kurulumu”";

  if (!f.supabase.configured) {
    checks.push({
      id: "supabase",
      title: "Supabase bağlantısı",
      status: f.production ? "error" : "warn",
      detail: "Supabase anahtarları girilmemiş; site örnek veriyle çalışıyor, panelde eklenenler sunucu yeniden başlayınca kaybolur.",
      fix: `Supabase projesini açıp üç anahtarı Vercel’e girin ve yeniden yayınlayın (${README}, 1–5. adımlar).`,
    });
  } else if (!f.supabase.reachable) {
    checks.push({
      id: "supabase",
      title: "Supabase bağlantısı",
      status: "error",
      detail: `Anahtarlar girilmiş ama Supabase’e ulaşılamıyor${f.supabase.error ? ` (${f.supabase.error})` : ""}.`,
      fix: "Vercel’deki NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY değerlerini Supabase → Project Settings → API sayfasıyla karşılaştırın; boşluk ya da eksik karakter olmasın.",
    });
  } else {
    checks.push({ id: "supabase", title: "Supabase bağlantısı", status: "ok", detail: "Bağlı; kumaşlar, talepler ve rapor kalıcı olarak saklanıyor." });
    const missing = MIGRATIONS.filter(([file]) => !f.migrations[file]);
    checks.push(
      missing.length === 0
        ? { id: "migrations", title: "Tablo dosyaları", status: "ok", detail: `${MIGRATIONS.length} dosyanın hepsi çalıştırılmış.` }
        : {
            id: "migrations",
            title: "Tablo dosyaları",
            status: "error",
            detail: `Çalıştırılmamış: ${missing.map(([file, label]) => `${label} (${file})`).join(", ")}.`,
            fix: `Supabase → SQL Editor’de eksik dosyaları ad sırasıyla çalıştırın (${README}, 2. adım). Daha önce çalıştırılanları tekrar çalıştırmayın.`,
          },
    );
    if (f.bucketLimited === false && f.migrations["20261004000000_init.sql"]) {
      checks.push({
        id: "bucket",
        title: "Dosya klasörü sınırları",
        status: "warn",
        detail: "Dosya klasöründe boyut ve tür sınırı yok.",
        fix: "20261008000000_storage_limits.sql dosyasını SQL Editor’de çalıştırın.",
      });
    }
  }

  checks.push(
    f.fabrics.total === 0
      ? {
          id: "fabrics",
          title: "Kumaşlar",
          status: "error",
          detail: "Katalogda hiç kumaş yok; site açılmaz.",
          fix: `supabase/seed.sql dosyasını SQL Editor’de çalıştırın ya da panelden kumaş ekleyin (${README}, 3. adım).`,
        }
      : f.fabrics.real === 0
        ? {
            id: "fabrics",
            title: "Kumaşlar",
            status: "todo",
            detail: `${f.fabrics.active} kumaş yayında ama hepsi örnek (yer tutucu) görsellerle.`,
            fix: "İlk gerçek kumaşları çekip panelden yükleyin (KUMAS-CEKIM-REHBERI.md); yer tutucuları sonra gizleyin.",
          }
        : { id: "fabrics", title: "Kumaşlar", status: "ok", detail: `${f.fabrics.real} gerçek kumaş, toplam ${f.fabrics.active} kumaş yayında.` },
  );

  if (f.models === 0)
    checks.push({ id: "models", title: "Modeller", status: "error", detail: "Vitrinde açık model yok; site açılmaz.", fix: "Panel → Modeller’den bir modeli yayına alın ya da seed.sql’i çalıştırın." });

  if (f.panelMode === "demo" && f.production)
    checks.push({
      id: "panel",
      title: "Panel girişi",
      status: f.sessionSecretOk ? "warn" : "error",
      detail: "Panel deneme kullanıcısıyla çalışıyor.",
      fix: "Supabase bağlanınca panel kullanıcısını Supabase’de açın (README, 6. adım); deneme kullanıcısı kendiliğinden devre dışı kalır.",
    });

  const host = f.requestHost?.toLowerCase() ?? null;
  if (!f.siteUrl)
    checks.push({
      id: "site-url",
      title: "Alan adı (QR kodları)",
      status: "warn",
      detail: "NEXT_PUBLIC_SITE_URL girilmemiş; QR kodları ve paylaşım önizlemeleri geçici adresi kullanıyor.",
      fix: "Alan adını bağlayıp NEXT_PUBLIC_SITE_URL’i girin (README, “Alan adı ve QR kodları”). Bundan önce QR bastırmayın.",
    });
  else if (host && !f.siteUrl.toLowerCase().includes(host) && !/localhost|127\.0\.0\.1/.test(host))
    checks.push({
      id: "site-url",
      title: "Alan adı (QR kodları)",
      status: "warn",
      detail: `NEXT_PUBLIC_SITE_URL ${f.siteUrl}, ama panel ${host} adresinden açılmış.`,
      fix: "Doğru adres hangisiyse NEXT_PUBLIC_SITE_URL’i ona eşitleyin; QR kodları bu değeri kullanır.",
    });
  else checks.push({ id: "site-url", title: "Alan adı (QR kodları)", status: "ok", detail: `QR kodları ${f.siteUrl} adresini gösteriyor.` });

  checks.push(
    f.whatsapp
      ? { id: "whatsapp", title: "ORMEN WhatsApp numarası", status: "ok", detail: `Ana sayfadan gelen numune talepleri ${f.whatsapp} numarasına da iletilebiliyor.` }
      : {
          id: "whatsapp",
          title: "ORMEN WhatsApp numarası",
          status: "warn",
          detail: "Girilmemiş; ana sayfada numune talebinden sonra “WhatsApp’tan da gönder” düğmesi çıkmıyor (talepler yine panele düşüyor).",
          fix: "Vercel’de NEXT_PUBLIC_ORMEN_WHATSAPP değişkenine ORMEN’in numarasını girip yeniden yayınlayın.",
        },
  );

  checks.push(
    f.retentionDays
      ? { id: "retention", title: "Talep saklama süresi", status: "ok", detail: `Numune talepleri ${f.retentionDays} gün sonra kendiliğinden siliniyor.` }
      : {
          id: "retention",
          title: "Talep saklama süresi",
          status: "todo",
          detail: "Talepler elle silinene kadar saklanıyor.",
          fix: "Saklama süresini avukatla belirleyin, Vercel’de SAMPLE_RETENTION_DAYS (gün, ör. 730) olarak girin ve aynı süreyi KVKK metnine yazın.",
        },
  );

  // the database is in Frankfurt; server code elsewhere sends every query (and the
  // customer's phone) across the ocean: slower pages and a needless transfer abroad
  if (f.region)
    checks.push(
      f.region === "fra1"
        ? { id: "region", title: "Sunucu bölgesi", status: "ok", detail: "Sunucu Frankfurt’ta (fra1), veritabanıyla aynı yerde." }
        : {
            id: "region",
            title: "Sunucu bölgesi",
            status: "warn",
            detail: `Sunucu ${f.region} bölgesinde çalışıyor, veritabanı Frankfurt’ta. Her sayfa okyanusu iki kez geçiyor ve müşteri telefonu gereksiz yere başka bir ülkeden geçiyor.`,
            fix: "Depodaki vercel.json Frankfurt’u (fra1) seçiyor; son yayını Redeploy edin. Düzelmezse Vercel → Settings → Functions → Function Region’da Frankfurt’u seçin.",
          },
    );

  // things only a person can confirm
  checks.push(
    { id: "kvkk", title: "KVKK aydınlatma metni", status: "todo", detail: "/kvkk sayfasındaki metin taslak.", fix: "Hukuk danışmanına onaylatın." },
    { id: "ar", title: "Telefonda AR denemesi", status: "todo", detail: "Gerçek iPhone ve Android’de denenmedi.", fix: "README, “Telefonda AR denemesi” (5 dakika)." },
    { id: "firewall", title: "Form koruması", status: "todo", detail: "Buradan kontrol edilemiyor.", fix: "Vercel → Firewall’da hız sınırı kuralı (README, kurulum sırası 5. adım)." },
  );
  return checks;
}

/** Overall state for the page header: the worst automatic check. */
export function overall(checks: Check[]): CheckStatus {
  const order: CheckStatus[] = ["error", "warn", "todo", "ok"];
  return order.find((s) => checks.some((c) => c.status === s && !["kvkk", "ar", "firewall", "retention"].includes(c.id))) ?? "ok";
}
