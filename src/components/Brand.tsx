import logoHorizontal from "@/assets/azulva-logo-horizontal.png.asset.json";
import emblem from "@/assets/azulva-emblem.png.asset.json";
import appIcon from "@/assets/azulva-app-icon.png.asset.json";

export const azulvaAssets = {
  logoHorizontal: logoHorizontal.url,
  emblem: emblem.url,
  appIcon: appIcon.url,
};

export function AzulvaLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img
      src={azulvaAssets.logoHorizontal}
      alt="Azulva"
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}

export function AzulvaEmblem({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={azulvaAssets.emblem}
      alt="Azulva emblem"
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}

export function AzulvaAppIcon({ className = "h-10 w-10 rounded-xl" }: { className?: string }) {
  return (
    <img
      src={azulvaAssets.appIcon}
      alt="Azulva app icon"
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}
