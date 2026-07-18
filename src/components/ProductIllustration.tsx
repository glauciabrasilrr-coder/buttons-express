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
  zoom?: number;
};

const illustrationMap: Record<
  ProductIllustrationType,
  IllustrationConfig
> = {
  button58: {
    src: '/assets/product-icons/button58.png?v=8',
    alt: 'Ilustração do Botton 5,8 cm',
    zoom: 1.2,
  },
  button44: {
    src: '/assets/product-icons/button44.png?v=8',
    alt: 'Ilustração do Botton 4,4 cm',
    zoom: 1.2,
  },
  button32: {
    src: '/assets/product-icons/button32.png?v=8',
    alt: 'Ilustração do Botton 3,2 cm',
    zoom: 1.2,
  },
  buttonSquare: {
    src: '/assets/product-icons/buttonSquare.png?v=9',
    alt: 'Ilustração do Botton Quadrado 5x5 cm',
    zoom: 0.92,
  },
  magnet58: {
    src: '/assets/product-icons/magnet58.png?v=8',
    alt: 'Ilustração do Ímã 5,8 cm',
    zoom: 1.2,
  },
  magnetSquare: {
    src: '/assets/product-icons/magnetSquare.png?v=8',
    alt: 'Ilustração do Ímã 5x5 cm',
    zoom: 1.2,
  },
  key58: {
    src: '/assets/product-icons/key58.png?v=8',
    alt: 'Ilustração do Chaveiro 5,8 cm',
    zoom: 1.2,
  },
  keySquare: {
    src: '/assets/product-icons/keySquare.png?v=8',
    alt: 'Ilustração do Chaveiro 5x5 cm',
    zoom: 1.2,
  },
  key44: {
    src: '/assets/product-icons/key44.png?v=8',
    alt: 'Ilustração do Chaveiro 4,4 cm',
    zoom: 1.2,
  },
  badge: {
    src: '/assets/product-icons/badge.png?v=8',
    alt: 'Ilustração do Porta Crachá Retrátil',
    zoom: 1.2,
  },
  upload: {
    src: '/assets/product-icons/upload.png?v=8',
    alt: 'Ilustração de envio de fotos',
    zoom: 1.12,
  },
  gallery: {
    src: '/assets/product-icons/gallery.png?v=8',
    alt: 'Ilustração de galeria de fotos',
    zoom: 1.12,
  },
  payment: {
    src: '/assets/product-icons/payment.png?v=8',
    alt: 'Ilustração de pagamento',
    zoom: 1.12,
  },
  production: {
    src: '/assets/product-icons/production.png?v=8',
    alt: 'Ilustração de produção',
    zoom: 1.12,
  },
  printing: {
    src: '/assets/product-icons/printing.png?v=8',
    alt: 'Ilustração de impressão',
    zoom: 1.12,
  },
  delivery: {
    src: '/assets/product-icons/delivery.png?v=8',
    alt: 'Ilustração de entrega',
    zoom: 1.12,
  },
  order: {
    src: '/assets/product-icons/order.png?v=8',
    alt: 'Ilustração de pedido',
    zoom: 1.12,
  },
  thanks: {
    src: '/assets/product-icons/thanks.png?v=8',
    alt: 'Ilustração de agradecimento',
    zoom: 1.12,
  },
  gift: {
    src: '/assets/product-icons/gift.png?v=8',
    alt: 'Ilustração de presente',
    zoom: 1.12,
  },
  favorite: {
    src: '/assets/product-icons/favorite.png?v=8',
    alt: 'Ilustração de favorito',
    zoom: 1.12,
  },
  qrcode: {
    src: '/assets/product-icons/qrcode.png?v=8',
    alt: 'Ilustração de QR Code',
    zoom: 1.12,
  },
};

function ProductIllustration({
  productType,
  className = '',
  alt,
}: ProductIllustrationProps) {
  const illustration = illustrationMap[productType];
  const zoom = illustration.zoom ?? 1;

  return (
    <div
      className={`group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] border border-[#E9E4DE] bg-[linear-gradient(180deg,#FFFFFF_0%,#FDFDFD_55%,#F7F7F7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(74,42,18,0.05)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_14px_28px_rgba(74,42,18,0.08)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.52)_32%,transparent_64%)]" />

      <div className="pointer-events-none absolute inset-x-[12%] bottom-[8%] h-[18%] rounded-full bg-black/[0.035] blur-xl" />

      <img
        src={illustration.src}
        alt={alt ?? illustration.alt}
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.09)] transition-transform duration-300 group-hover:scale-[1.025]"
        style={{
          transform: `scale(${zoom})`,
        }}
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