export type ProductId =
  | 'button58'
  | 'button44'
  | 'button32'
  | 'buttonSquare'
  | 'magnet58'
  | 'magnetSquare'
  | 'key58'
  | 'keySquare'
  | 'key44'
  | 'badge';

export type ProductData = {
  id: ProductId;
  title: string;
  illustration: ProductId;
  categoria: string;
  preco: number;
};

export const PRODUCTS: ProductData[] = [
  {
    id: 'button58',
    title: 'Botton 5,8 cm',
    illustration: 'button58',
    categoria: 'Bottons',
    preco: 10,
  },
  {
    id: 'button44',
    title: 'Botton 4,4 cm',
    illustration: 'button44',
    categoria: 'Bottons',
    preco: 8,
  },
  {
    id: 'button32',
    title: 'Botton 3,2 cm',
    illustration: 'button32',
    categoria: 'Bottons',
    preco: 5,
  },
  {
    id: 'buttonSquare',
    title: 'Botton Quadrado 5x5 cm',
    illustration: 'buttonSquare',
    categoria: 'Bottons',
    preco: 11,
  },
  {
    id: 'magnet58',
    title: 'Ímã 5,8 cm',
    illustration: 'magnet58',
    categoria: 'Ímãs',
    preco: 12,
  },
  {
    id: 'magnetSquare',
    title: 'Ímã 5x5 cm',
    illustration: 'magnetSquare',
    categoria: 'Ímãs',
    preco: 12,
  },
  {
    id: 'key58',
    title: 'Chaveiro 5,8 cm',
    illustration: 'key58',
    categoria: 'Chaveiros',
    preco: 15,
  },
  {
    id: 'keySquare',
    title: 'Chaveiro 5x5 cm',
    illustration: 'keySquare',
    categoria: 'Chaveiros',
    preco: 15,
  },
  {
    id: 'key44',
    title: 'Chaveiro 4,4 cm',
    illustration: 'key44',
    categoria: 'Chaveiros',
    preco: 12,
  },
  {
    id: 'badge',
    title: 'Porta Crachá Retrátil',
    illustration: 'badge',
    categoria: 'Porta-crachá',
    preco: 20,
  },
];

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}