import { cn } from "@/lib/utils";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

const BRAND_LOGO_SRC = BRAND_LOGO_PATH;

interface BrandLogoProps {
  className?: string;
  imageWrapperClassName?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

const BrandLogo = ({
  className,
  imageWrapperClassName,
  imageClassName,
  textClassName,
  showText = true,
}: BrandLogoProps) => {
  return (
    <div className={cn("flex items-center gap-2.5 shrink-0", className)}>
      <span
        className={cn(
          "relative block h-10 w-10 rounded-lg",
          imageWrapperClassName
        )}
      >
        <img
          src={BRAND_LOGO_SRC}
          alt={`${BRAND_NAME} logo`}
          loading="eager"
          decoding="async"
          className={cn(
            "h-full w-[42px] relative bottom-[6px] right-[12px] object-contain object-center scale-[1.8]",
            imageClassName
          )}
        />
      </span>
      {showText ? (
        <span
          className={cn(
            "text-xl font-bold leading-none ml-[-30px] tracking-tight text-foreground",
            textClassName
          )}
        >
          {BRAND_NAME}
        </span>
      ) : null}
    </div>
  );
};

export default BrandLogo;

