import { FadeInOnScroll } from "./FadeInOnScroll";

interface PageHeroProps {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  /**
   * media = dark hero with background image (default)
   * ink = dark hero, text only (no image)
   */
  variant?: "media" | "ink";
}

export const PageHero = ({
  title,
  description,
  imageSrc = "/energia-solar.webp",
  imageAlt = "Painéis solares",
  variant = "media",
}: PageHeroProps) => {
  const showImage = variant === "media";

  return (
    <section className="relative flex w-full items-end bg-ink py-20 text-white md:min-h-[42vh] md:items-center md:py-28">
      {showImage && (
        <>
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/75 to-ink/45" />
        </>
      )}
      <div className="relative z-10 container mx-auto max-w-screen-xl px-4 md:px-6">
        <FadeInOnScroll>
          <h1 className="font-display max-w-3xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-200 md:text-xl">
            {description}
          </p>
        </FadeInOnScroll>
      </div>
    </section>
  );
};
