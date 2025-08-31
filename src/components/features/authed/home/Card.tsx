'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiVisaLine } from 'react-icons/ri';
import clsx from 'clsx';

type CardProps = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  className?: string;
  masked?: boolean;
};

export default function Card({
  cardholderName,
  cardNumber,
  expiry,
  cvc,
  className,
}: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [shimmerActive, setShimmerActive] = useState(false);

  const digits = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber]);
  const grouped = useMemo(
    () => digits.replace(/(.{4})/g, '$1 ').trim(),
    [digits]
  );

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      setShimmerActive(true);
      t = setTimeout(() => setShimmerActive(false), 800);
    };
    const id = setInterval(tick, 6000);
    return () => {
      clearInterval(id);
      if (t) clearTimeout(t);
    };
  }, []);

  const toggle = useCallback(() => setIsFlipped((v) => !v), []);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  return (
    <div className={clsx('inline-flex flex-col items-center', className)}>
      <div
        className={clsx(
          'group relative w-[393px] aspect-[1.6/1] cursor-pointer select-none',
          'transition will-change-transform hover:[transform:translateY(-1px)] active:[transform:translateY(0)]'
        )}
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={isFlipped ? 'Show front of card' : 'Show back of card'}
        onClick={toggle}
        onKeyDown={onKeyDown}
        style={{ perspective: 1000 }}
      >
        <div
          className="relative size-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT: chrome only */}
          <CardFace shimmerActive={shimmerActive}>
            <FrontChrome />
          </CardFace>

          {/* BACK: reveals info */}
          <CardFace back shimmerActive={shimmerActive}>
            <BackChrome />
            <BackContent
              cardholderName={cardholderName}
              number={grouped}
              expiry={expiry}
              cvc={cvc}
            />
          </CardFace>
        </div>
      </div>
    </div>
  );
}

function CardFace({
  back = false,
  shimmerActive = false,
  children,
}: {
  back?: boolean;
  shimmerActive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden border border-white/10 text-frog-foreground shadow-[0_18px_45px_rgba(0,0,0,.35)]"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div className="absolute inset-0 card-aurora-cobalt aurora" aria-hidden />

      <div
        className={clsx('shimmer-sweep', shimmerActive && 'is-active')}
        aria-hidden
      />

      <div className="pointer-events-none absolute -top-10 -left-12 size-44 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 h-full p-4">{children}</div>
    </div>
  );
}

function FrontChrome() {
  return (
    <>
      <div className="absolute left-4 top-4 z-10">
        <RiVisaLine className="text-white/95" size={40} aria-hidden />
      </div>

      <div className="absolute right-4 top-4 z-10">
        <Image
          src="/frog.png"
          alt=""
          width={42}
          height={42}
          className="opacity-95"
          aria-hidden
          priority
        />
      </div>

      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <span className="block h-8 w-12 rounded-lg border border-white/30 bg-[linear-gradient(135deg,#d7d7d7_0%,#afafaf_40%,#f5f5f5_60%,#9c9c9c_100%)] opacity-90" />
      </div>
    </>
  );
}

function BackChrome() {
  return (
    <>
      <div className="absolute left-4 top-4 z-10">
        <RiVisaLine className="text-white/95" size={40} aria-hidden />
      </div>
      <div className="absolute right-4 top-4 z-10">
        <Image
          src="/frog.png"
          alt=""
          width={42}
          height={42}
          className="opacity-95"
          aria-hidden
          priority
        />
      </div>
    </>
  );
}

function BackContent({
  cardholderName,
  number,
  expiry,
  cvc,
}: {
  cardholderName: string;
  number: string;
  expiry: string;
  cvc: string;
}) {
  const groups = number.split(' ');

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1" />
      <div className="relative inset-x-1">
        <div className="band-wrap band-skew band-angle">
          <div className="band-content px-3 py-2">
            <div className="flex items-baseline gap-3 font-mono tabular-nums tracking-[0.18em]">
              {groups.map((g, i) => (
                <span key={i} className="whitespace-nowrap text-[22px]">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="font-display font-semibold text-[18px] leading-5 truncate">
            {cardholderName}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-frog-muted text-[11.5px]">Expiry</div>
            <div className="text-[14px] mt-0.5">{expiry}</div>
          </div>
          <div>
            <div className="text-frog-muted text-[11.5px]">CVC</div>
            <div className="text-[14px] mt-0.5">{cvc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
