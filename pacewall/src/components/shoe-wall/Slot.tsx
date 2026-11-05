"use client";

import { memo, type ReactNode } from "react";
import { ShoeImage } from "./ShoeImage";
import type { RenderImageProps, RenderLinkProps, Shoe, ShoeWallLabels } from "./types";

export function isSoldOut(shoe: Shoe): boolean {
  return shoe.sizes.length > 0 && shoe.sizes.every((s) => s.stock <= 0);
}

/** Its shoe is in the detail view: the place stays empty until the shoe lands back on it. */
export function markAway(slot: HTMLElement | null | undefined, away: boolean) {
  if (!slot) return;
  if (away) slot.dataset.away = "true";
  else delete slot.dataset.away;
}

export function dropOf(shoe: Shoe): string {
  const { baseline, height, width } = shoe.photo;
  return `${((1 - baseline) * height * 100) / width}%`;
}

type Props = {
  shoe: Shoe;
  index: number;
  sizes: string;
  labels: ShoeWallLabels;
  formatPrice: (amount: number, currency: string) => string;
  renderImage?: (p: RenderImageProps) => ReactNode;
  renderLink?: (p: RenderLinkProps) => ReactNode;
  onOpen?: (shoe: Shoe, event: React.MouseEvent<HTMLAnchorElement>) => void;
  onIntent?: (shoe: Shoe, on: boolean) => void;
};

function SlotInner({ shoe, index, sizes, labels, formatPrice, renderImage, renderLink, onOpen, onIntent }: Props) {
  const soldOut = isSoldOut(shoe);
  const price = formatPrice(shoe.price, shoe.currency);
  const was = shoe.compareAtPrice ? formatPrice(shoe.compareAtPrice, shoe.currency) : null;
  const [left, right] = shoe.photo.contact;
  const face = (
    <>
      <div className="pw-stage">
        <span className="pw-downlight" aria-hidden />
        <div className="pw-fly" style={{ "--pw-drop": dropOf(shoe) } as React.CSSProperties}>
          <span className="pw-wallshadow" aria-hidden />
          <span className="pw-contact" aria-hidden style={{ insetInlineStart: `${left * 100}%`, width: `${(right - left) * 100}%` }} />
          <div className="pw-lift">
            <ShoeImage
              photo={shoe.photo}
              sizes={sizes}
              index={index}
              eager={index < 8}
              high={index < 4}
              renderImage={renderImage}
            />
          </div>
        </div>
      </div>
      <div className="pw-under">
        <div className="pw-shelf" aria-hidden />
        <div className="pw-ticket">
          <span className="pw-name">
            {shoe.isNew ? (
              <>
                <span className="pw-new-dot" aria-hidden />
                <span className="pw-visually-hidden">{labels.newShoe}: </span>
              </>
            ) : null}
            <span className="pw-name-text">{shoe.name}</span>
          </span>
          {soldOut ? (
            <span className="pw-price pw-sold-tag">{labels.soldOut}</span>
          ) : (
            <span className="pw-price">
              {was ? (
                <s>
                  <span className="pw-visually-hidden">{labels.wasPrice} </span>
                  {was}
                </s>
              ) : null}
              {price}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const linkProps: RenderLinkProps = {
    href: shoe.href,
    className: "pw-link",
    children: face,
    onClick: onOpen ? (event) => onOpen(shoe, event) : undefined,
    onPointerEnter: onIntent ? () => onIntent(shoe, true) : undefined,
    onPointerLeave: onIntent ? () => onIntent(shoe, false) : undefined,
    onFocus: onIntent ? () => onIntent(shoe, true) : undefined,
    onBlur: onIntent ? () => onIntent(shoe, false) : undefined,
  };

  return (
    <li
      className="pw-slot"
      data-id={shoe.id}
      data-slug={shoe.slug}
      data-soldout={soldOut ? "true" : undefined}
      data-tone={shoe.lightness !== undefined && shoe.lightness < 0.2 ? "dark" : undefined}
    >
      {renderLink ? renderLink(linkProps) : <a {...linkProps}>{face}</a>}
    </li>
  );
}

export const Slot = memo(SlotInner);
