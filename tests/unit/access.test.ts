import { describe, expect, it } from "vitest";
import { decideAccess } from "@/lib/auth/access";

describe("panel erişimi ve iki adımlı doğrulama", () => {
  const base = { email: "fatih@ornek.com", isPanelUser: true };

  it("doğrulama kapalıysa şifre yeter", () => {
    expect(decideAccess({ ...base, currentLevel: "aal1", nextLevel: "aal1" })).toEqual({ state: "tamam", user: { email: "fatih@ornek.com", mode: "supabase", twoFactor: false } });
  });

  it("açıksa kod girilene kadar panel açılmaz", () => {
    expect(decideAccess({ ...base, currentLevel: "aal1", nextLevel: "aal2" })).toEqual({ state: "ikinci-adim", email: "fatih@ornek.com" });
    expect(decideAccess({ ...base, currentLevel: "aal2", nextLevel: "aal2" })).toMatchObject({ state: "tamam", user: { twoFactor: true } });
  });

  it("panel yetkisi olmayan ya da oturumu olmayan giremez", () => {
    expect(decideAccess({ ...base, isPanelUser: false, currentLevel: "aal2", nextLevel: "aal2" })).toEqual({ state: "yok" });
    expect(decideAccess({ email: null, isPanelUser: true, currentLevel: null, nextLevel: null })).toEqual({ state: "yok" });
  });
});

describe("pilot günü: iki adımlı doğrulama zorunlu", () => {
  const base = { email: "a@ormen.com.tr", isPanelUser: true, require2fa: true };
  it("doğrulaması kurulmamış hesap yalnızca kuruluma gider", () => {
    const a = decideAccess({ ...base, currentLevel: "aal1", nextLevel: "aal1" });
    expect(a.state).toBe("kurulum");
  });
  it("doğrulaması açık hesap önce kodu girer, sonra tamam", () => {
    expect(decideAccess({ ...base, currentLevel: "aal1", nextLevel: "aal2" }).state).toBe("ikinci-adim");
    expect(decideAccess({ ...base, currentLevel: "aal2", nextLevel: "aal2" }).state).toBe("tamam");
  });
  it("zorunlu değilken doğrulamasız hesap girer", () => {
    expect(decideAccess({ ...base, require2fa: false, currentLevel: "aal1", nextLevel: "aal1" }).state).toBe("tamam");
  });
  it("panel kullanıcısı olmayan yine giremez", () => {
    expect(decideAccess({ ...base, isPanelUser: false, currentLevel: "aal1", nextLevel: "aal1" }).state).toBe("yok");
  });
});
