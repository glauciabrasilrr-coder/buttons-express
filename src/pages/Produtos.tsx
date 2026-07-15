import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductIllustration from '../components/ProductIllustration';

import {
  PRODUCTS,
  formatarMoeda,
  type ProductData,
  type ProductId,
} from '../data/products';

export type ItemPedido = {
  id: ProductId;
  title: string;
  illustration: ProductId;
  categoria: string;
  preco: number;
  quantidade: number;
};

const produtos = PRODUCTS;
const STORAGE_KEY = 'buttons-express-pedido';


function carregarPedido(): ItemPedido[] {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);

    if (!salvo) {
      return [];
    }

    const dados = JSON.parse(salvo);

    if (!Array.isArray(dados)) {
      return [];
    }

    return dados
      .map((item) => {
        const produto = produtos.find(
          (produtoAtual) => produtoAtual.id === item.id,
        );

        if (!produto) {
          return null;
        }

        return {
          ...item,
          title: produto.title,
          illustration: produto.illustration,
          categoria: produto.categoria,
          preco: produto.preco,
        };
      })
      .filter((item): item is ItemPedido => item !== null);
  } catch {
    return [];
  }
}

function Produtos() {
  const navigate = useNavigate();

  const [selecionado, setSelecionado] =
    useState<ItemPedido[]>(carregarPedido);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selecionado));
  }, [selecionado]);

  const totalItens = useMemo(
    () =>
      selecionado.reduce(
        (total, item) => total + item.quantidade,
        0,
      ),
    [selecionado],
  );

  const tiposDiferentes = selecionado.length;

  const totalPedido = useMemo(
    () =>
      selecionado.reduce(
        (total, item) =>
          total + item.preco * item.quantidade,
        0,
      ),
    [selecionado],
  );

  const categorias = useMemo(
    () => [...new Set(produtos.map((produto) => produto.categoria))],
    [],
  );

  const obterQuantidade = (id: ProductId) =>
    selecionado.find((item) => item.id === id)?.quantidade ?? 0;

  const adicionarProduto = (produto: ProductData) => {
    setSelecionado((itens) => {
      const existente = itens.find((item) => item.id === produto.id);

      if (existente) {
        return itens.map((item) =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }

      return [
        ...itens,
        {
          id: produto.id,
          title: produto.title,
          illustration: produto.illustration,
          categoria: produto.categoria,
          preco: produto.preco,
          quantidade: 1,
        },
      ];
    });
  };

  const diminuirProduto = (id: ProductId) => {
    setSelecionado((itens) =>
      itens
        .map((item) =>
          item.id === id
            ? { ...item, quantidade: item.quantidade - 1 }
            : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  };

  const removerProduto = (id: ProductId) => {
    setSelecionado((itens) =>
      itens.filter((item) => item.id !== id),
    );
  };

  const continuarParaFotos = () => {
    if (selecionado.length === 0) {
      return;
    }

    navigate('/fotos', {
      state: {
        itens: selecionado,
        totalItens,
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-1 pb-28 sm:px-4 lg:pb-8">
      <header className="mb-5 rounded-[26px] border border-[#E9DDCC] bg-[linear-gradient(135deg,#FFFCF7_0%,#FDF4E8_55%,#F7E9D7_100%)] p-5 shadow-[0_12px_28px_rgba(107,62,20,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#8A5A2B]">
              <span className="h-2 w-2 rounded-full bg-[#E7A29A]" />
              PEDIDO
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[#4A2A12] sm:text-3xl">
              Monte seu pedido
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B5A3A]">
              Escolha os produtos e ajuste a quantidade de cada um.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white bg-white/80 px-3 py-2 text-center shadow-sm">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#B59677]">
              Itens
            </div>

            <div className="mt-1 text-lg font-bold text-[#5B3518]">
              {totalItens}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-8">
          {categorias.map((categoria) => (
            <section key={categoria}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#4A2A12]">
                  {categoria}
                </h2>

                <div className="h-px flex-1 bg-[#E9DDCC]" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {produtos
                  .filter(
                    (produto) => produto.categoria === categoria,
                  )
                  .map((produto) => {
                    const quantidade = obterQuantidade(produto.id);
                    const selecionadoNoPedido = quantidade > 0;

                    return (
                      <article
                        key={produto.id}
                        className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_8px_20px_rgba(107,62,20,0.05)] transition ${
                          selecionadoNoPedido
                            ? 'border-[#8F5528] ring-1 ring-[#8F5528]/15'
                            : 'border-[#E9DDCC]'
                        }`}
                      >
                        <div className="w-full">
                          <div className="flex h-44 items-center justify-center bg-[linear-gradient(145deg,#FCF6EF,#F6E8D8)] p-2 sm:h-48">
                            <div className="w-32 sm:w-36 md:w-40">
                              <ProductIllustration
                                productType={produto.illustration}
                                alt={produto.title}
                              />
                            </div>
                          </div>

                          <div className="px-3 pb-2 pt-3 text-center">
                            <h3 className="min-h-[42px] text-sm font-bold leading-5 text-[#4A2A12]">
                              {produto.title}
                            </h3>

                            <div className="mt-1 text-base font-extrabold text-[#8F5528]">
                              {formatarMoeda(produto.preco)}
                            </div>
                          </div>
                        </div>

                        <div className="px-3 pb-3">
                          {selecionadoNoPedido ? (
                            <div className="rounded-2xl bg-[#FFF8F0] p-2">
                              <div className="mb-2 text-center text-xs font-semibold text-[#8A5A2B]">
                                No pedido: {quantidade}
                              </div>

                              <div className="mb-2 text-center text-xs font-bold text-[#4A2A12]">
                                Subtotal: {formatarMoeda(
                                  produto.preco * quantidade,
                                )}
                              </div>

                              <div className="grid grid-cols-[38px_1fr_38px] items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    diminuirProduto(produto.id)
                                  }
                                  className="flex h-9 items-center justify-center rounded-full border border-[#E4CDB1] bg-white text-xl font-semibold text-[#6B3E14]"
                                  aria-label={`Diminuir ${produto.title}`}
                                >
                                  −
                                </button>

                                <div className="text-center text-lg font-bold text-[#4A2A12]">
                                  {quantidade}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    adicionarProduto(produto)
                                  }
                                  className="flex h-9 items-center justify-center rounded-full bg-[#8F5528] text-xl font-semibold text-white"
                                  aria-label={`Aumentar ${produto.title}`}
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removerProduto(produto.id)
                                }
                                className="mt-2 w-full text-xs font-medium text-[#9A6F50] underline decoration-[#D9B99A] underline-offset-4"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                adicionarProduto(produto)
                              }
                              className="h-10 w-full rounded-full border border-[#8F5528] bg-white text-sm font-semibold text-[#6B3E14] transition hover:bg-[#FFF4E8]"
                            >
                              Adicionar
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
          ))}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-5 rounded-[28px] border border-[#E9DDCC] bg-[linear-gradient(145deg,#FFFDF9,#FDF3E7)] p-5 shadow-[0_12px_28px_rgba(107,62,20,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#B59677]">
                  Carrinho
                </div>

                <h2 className="mt-1 text-lg font-bold text-[#4A2A12]">
                  Seu pedido
                </h2>
              </div>

              <div className="rounded-full border border-[#E9DDCC] bg-white px-3 py-1 text-sm font-semibold text-[#8A5A2B]">
                {totalItens} itens
              </div>
            </div>

            {selecionado.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#E5CFB4] bg-white/75 p-5 text-center">
                <div className="mx-auto w-14">
                  <ProductIllustration productType="order" />
                </div>

                <p className="mt-3 font-semibold text-[#4A2A12]">
                  Seu pedido está vazio
                </p>

                <p className="mt-1 text-sm leading-6 text-[#9A8067]">
                  Adicione um produto para começar.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {selecionado.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#F0E1CF] bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 shrink-0">
                        <ProductIllustration
                          productType={item.illustration}
                          alt={item.title}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#4A2A12]">
                          {item.title}
                        </div>

                        <div className="mt-1 text-xs text-[#9A8067]">
                          {item.quantidade}{' '}
                          {item.quantidade === 1
                            ? 'unidade'
                            : 'unidades'}{' '}
                          · {formatarMoeda(item.preco)}
                        </div>

                        <div className="mt-1 text-xs font-bold text-[#8F5528]">
                          {formatarMoeda(
                            item.preco * item.quantidade,
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => diminuirProduto(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E9DDCC] bg-white text-[#6B3E14]"
                        >
                          −
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const produto = produtos.find(
                              (produtoAtual) =>
                                produtoAtual.id === item.id,
                            );

                            if (produto) {
                              adicionarProduto(produto);
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8F5528] text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#B59677]">
                  Unidades
                </div>

                <div className="mt-1 text-xl font-bold text-[#4A2A12]">
                  {totalItens}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#B59677]">
                  Produtos
                </div>

                <div className="mt-1 text-xl font-bold text-[#4A2A12]">
                  {tiposDiferentes}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[#E2C59F] bg-[#FFF8F0] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B59677]">
                Total do pedido
              </div>

              <div className="mt-1 text-2xl font-extrabold text-[#6B3E14]">
                {formatarMoeda(totalPedido)}
              </div>
            </div>

            <button
              type="button"
              disabled={selecionado.length === 0}
              onClick={continuarParaFotos}
              className={`mt-5 h-12 w-full rounded-full text-sm font-bold transition ${
                selecionado.length > 0
                  ? 'bg-[#8F5528] text-white hover:bg-[#6B3E14]'
                  : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
              }`}
            >
              CONTINUAR PARA AS FOTOS
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8D8C5] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(107,62,20,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-[#9A8067]">
              {tiposDiferentes}{' '}
              {tiposDiferentes === 1 ? 'produto' : 'produtos'}
            </div>

            <div className="font-bold text-[#4A2A12]">
              {totalItens}{' '}
              {totalItens === 1 ? 'item no pedido' : 'itens no pedido'}
            </div>

            <div className="mt-0.5 text-sm font-extrabold text-[#8F5528]">
              {formatarMoeda(totalPedido)}
            </div>
          </div>

          <button
            type="button"
            disabled={selecionado.length === 0}
            onClick={continuarParaFotos}
            className={`h-12 shrink-0 rounded-full px-5 text-sm font-bold ${
              selecionado.length > 0
                ? 'bg-[#8F5528] text-white'
                : 'cursor-not-allowed bg-[#EEE3D5] text-[#B39A80]'
            }`}
          >
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default Produtos;