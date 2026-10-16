import type { VariantImage } from "../types";

/** Shows the selected variant's images, falling back to a placeholder. */
export function ImageGallery({ images, title }: { images: VariantImage[]; title: string }) {
  const hero = images[0];
  return (
    <div className="gallery">
      <div className="gallery-hero">
        {hero ? (
          <img src={hero.url} alt={hero.alt || title} />
        ) : (
          <div className="gallery-placeholder" aria-hidden>
            No image
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img) => (
            <img key={img.id} src={img.url} alt={img.alt || title} className="gallery-thumb" />
          ))}
        </div>
      )}
    </div>
  );
}
