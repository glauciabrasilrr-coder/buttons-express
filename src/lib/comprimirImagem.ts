// src/lib/comprimirImagem.ts
//
// Reduz o tamanho da foto DENTRO DO NAVEGADOR DO CLIENTE, antes de
// enviar pro Supabase. Isso resolve dois problemas de uma vez:
//   1) Upload mais rápido em wifi ruim de feira (arquivo bem menor)
//   2) Menos "egress" consumido cada vez que a foto é vista/baixada
//      na produção (o que estava estourando a cota gratuita)
//
// Não precisa de nenhuma biblioteca nova — usa só recursos do navegador
// (canvas), então não tem instalação extra pra fazer.

const LARGURA_MAXIMA = 1600; // pixels — mais que suficiente pra imprimir um botton
const QUALIDADE_JPEG = 0.82; // 0 a 1 — 0.82 já fica visualmente ótimo

/**
 * Recebe o arquivo original escolhido pelo cliente e devolve uma
 * versão redimensionada/comprimida, pronta pra subir pro Storage.
 */
export async function comprimirImagem(arquivoOriginal: File): Promise<File> {
  // Se já for pequeno (ex.: cliente mandou um print, não foto de câmera),
  // não vale a pena reprocessar — evita perda de qualidade à toa.
  const UM_MEGABYTE = 1024 * 1024;
  if (arquivoOriginal.size <= UM_MEGABYTE) {
    return arquivoOriginal;
  }

  const bitmap = await criarBitmap(arquivoOriginal);

  const escala = Math.min(1, LARGURA_MAXIMA / bitmap.width);
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext('2d');
  if (!contexto) {
    // Navegador sem suporte a canvas (raríssimo) — envia o original
    // em vez de travar o pedido do cliente.
    return arquivoOriginal;
  }

  contexto.drawImage(bitmap, 0, 0, largura, altura);

  const blobComprimido = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG);
  });

  if (!blobComprimido) {
    return arquivoOriginal;
  }

  const nomeComprimido = arquivoOriginal.name.replace(/\.[^.]+$/, '') + '.jpg';

  return new File([blobComprimido], nomeComprimido, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

async function criarBitmap(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(arquivo);
  }

  // Fallback pra navegadores mais antigos sem createImageBitmap
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(arquivo);
  });
}
