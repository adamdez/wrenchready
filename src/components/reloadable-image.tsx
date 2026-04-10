"use client";

import Image, { type ImageProps } from "next/image";
import { useReloadableAsset } from "@/hooks/use-reloadable-asset";

type ReloadableImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: string;
  fallbackSrc?: string;
  maxRetries?: number;
};

function ReloadableImageInner({
  src,
  fallbackSrc,
  maxRetries = 2,
  alt = "",
  ...rest
}: ReloadableImageProps) {
  const { src: effectiveSrc, onError } = useReloadableAsset(src, {
    maxRetries,
    fallbackSrc,
  });

  return (
    <Image key={effectiveSrc} {...rest} alt={alt} src={effectiveSrc} onError={onError} />
  );
}

/** next/image with retry + optional fallback for flaky loads. */
export function ReloadableImage(props: ReloadableImageProps) {
  return <ReloadableImageInner key={props.src} {...props} />;
}
