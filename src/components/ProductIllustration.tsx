export type ProductIllustrationType =
  | 'button58'
  | 'button44'
  | 'button32'
  | 'buttonSquare'
  | 'magnet58'
  | 'magnetSquare'
  | 'key58'
  | 'keySquare'
  | 'key44'
  | 'badge'
  | 'upload'
  | 'gallery'
  | 'payment'
  | 'production'
  | 'printing'
  | 'delivery'
  | 'order'
  | 'thanks'
  | 'gift'
  | 'favorite'
  | 'qrcode';

type ProductIllustrationProps = {
  productType: ProductIllustrationType;
  className?: string;
  alt?: string;
};

type IllustrationConfig = {
  src: string;
  alt: string;
};

const illustrationMap: Record<ProductIllustrationType, IllustrationConfig> = {
  button58: { src: '/assets/product-icons/button58.png?v=7', alt: 'Ilustração do Botton 5,8 cm' },
  button44: { src: '/assets/product-icons/button44.png?v=7', alt: 'Ilustração do Botton 4,4 cm' },
  button32: { src: '/assets/product-icons/button32.png?v=7', alt: 'Ilustração do Botton 3,2 cm' },
  buttonSquare: { src: '/assets/product-icons/buttonSquare.png?v=7', alt: 'Ilustração do Botton Quadrado 5x5 cm' },
  magnet58: { src: '/assets/product-icons/magnet58.png?v=7', alt: 'Ilustração do Ímã 5,8 cm' },
  magnetSquare: { src: '/assets/product-icons/magnetSquare.png?v=7', alt: 'Ilustração do Ímã 5x5 cm' },
  key58: { src: '/assets/product-icons/key58.png?v=7', alt: 'Ilustração do Chaveiro 5,8 cm' },
  keySquare: { src: '/assets/product-icons/keySquare.png?v=7', alt: 'Ilustração do Chaveiro 5x5 cm' },
  key44: { src: '/assets/product-icons/key44.png?v=7', alt: 'Ilustração do Chaveiro 4,4 cm' },
  badge: { src: '/assets/product-icons/badge.png?v=7', alt: 'Ilustração do Porta Crachá Retrátil' },
  upload: { src: '/assets/product-icons/upload.png?v=7', alt: 'Ilustração de envio de fotos' },
  gallery: { src: '/assets/product-icons/gallery.png?v=7', alt: 'Ilustração de galeria de fotos' },
  payment: { src: '/assets/product-icons/payment.png?v=7', alt: 'Ilustração de pagamento' },
  production: { src: '/assets/product-icons/production.png?v=7', alt: 'Ilustração de produção' },
  printing: { src: '/assets/product-icons/printing.png?v=7', alt: 'Ilustração de impressão' },
  delivery: { src: '/assets/product-icons/delivery.png?v=7', alt: 'Ilustração de entrega' },
  order: { src: '/assets/product-icons/order.png?v=7', alt: 'Ilustração de pedido' },
  thanks: { src: '/assets/product-icons/thanks.png?v=7', alt: 'Ilustração de agradecimento' },
  gift: { src: '/assets/product-icons/gift.png?v=7', alt: 'Ilustração de presente' },
  favorite: { src: '/assets/product-icons/favorite.png?v=7', alt: 'Ilustração de favorito' },
  qrcode: { src: '/assets/product-icons/qrcode.png?v=7', alt: 'Ilustração de QR Code' },
};

function ProductIllustration({
  productType,
  className = '',
  alt,
}: ProductIllustrationProps) {
  const illustration = illustrationMap[productType];

  return (
    <div
      className={`group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] border border-[#E9E4DE] bg-[linear-gradient(180deg,#FFFFFF_0%,#FDFDFD_55%,#F7F7F7_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(74,42,18,0.05)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_14px_28px_rgba(74,42,18,0.08)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.52)_32%,transparent_64%)]" />

      <div className="pointer-events-none absolute inset-x-[12%] bottom-[8%] h-[18%] rounded-full bg-black/[0.035] blur-xl" />

      <img
        src={illustration.src}
        alt={alt ?? illustration.alt}
        className="relative z-10 h-[92%] w-[92%] object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.09)] transition-transform duration-300 group-hover:scale-[1.025]"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
          event.currentTarget.parentElement?.classList.add(
            'product-illustration-fallback',
          );
        }}
      />
    </div>
  );
}

export default ProductIllustration;