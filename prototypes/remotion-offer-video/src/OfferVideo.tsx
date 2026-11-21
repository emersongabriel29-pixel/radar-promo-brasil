import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type OfferVideoProps = {
  title: string;
  store: string;
  oldPrice: number;
  price: number;
  coupon?: string;
  cta?: string;
};

const money = (value: number) => value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

export const OfferVideo: React.FC<OfferVideoProps> = ({title, store, oldPrice, price, coupon, cta = 'Confira a oferta'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const intro = spring({frame, fps, config: {damping: 18, stiffness: 120}});
  const savings = Math.max(0, oldPrice - price);
  const discount = oldPrice > 0 ? Math.round((savings / oldPrice) * 100) : 0;
  const pulse = interpolate(frame % 60, [0, 30, 60], [1, 1.04, 1], {extrapolateRight: 'clamp'});
  const introOpacity = interpolate(intro, [0, 1], [0, 1]);
  const introY = interpolate(intro, [0, 1], [80, 0]);
  const introScale = interpolate(intro, [0, 1], [0.88, 1]);

  return (
    <AbsoluteFill style={{background: 'linear-gradient(145deg, #101827 0%, #172f46 55%, #0c111b 100%)', color: '#fff', fontFamily: 'Arial, sans-serif', padding: 78, justifyContent: 'space-between'}}>
      <div style={{opacity: introOpacity, transform: 'translateY(' + introY + 'px)'}}>
        <div style={{fontSize: 34, letterSpacing: 5, fontWeight: 900, color: '#ffcf38'}}>RADAR PROMO BRASIL</div>
        <div style={{fontSize: 24, opacity: 0.78, marginTop: 18}}>{store}</div>
      </div>
      <div style={{opacity: introOpacity, transform: 'scale(' + introScale + ')'}}>
        <div style={{fontSize: 56, lineHeight: 1.14, fontWeight: 800, maxWidth: 900}}>{title}</div>
        <div style={{display: 'inline-block', background: '#ffcf38', color: '#101827', padding: '18px 28px', borderRadius: 22, fontWeight: 900, fontSize: 46, marginTop: 46, transform: 'scale(' + pulse + ')'}}>
          {discount > 0 ? discount + '% OFF' : 'OFERTA'}
        </div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 28, marginTop: 38}}>
          <div style={{fontSize: 42, opacity: 0.58, textDecoration: 'line-through'}}>{money(oldPrice)}</div>
          <div style={{fontSize: 92, fontWeight: 900, color: '#61e6a4'}}>{money(price)}</div>
        </div>
        {savings > 0 && <div style={{fontSize: 34, marginTop: 16, color: '#61e6a4'}}>Você economiza {money(savings)}</div>}
        {coupon && <div style={{fontSize: 30, marginTop: 24}}>Cupom: <strong>{coupon}</strong></div>}
      </div>
      <div style={{background: '#ffcf38', color: '#101827', borderRadius: 28, padding: '30px 36px', fontSize: 34, fontWeight: 900, textAlign: 'center'}}>
        {cta} ↗
      </div>
      <div style={{fontSize: 22, opacity: 0.65, textAlign: 'center'}}>Preço e disponibilidade podem mudar. Verifique no destino.</div>
    </AbsoluteFill>
  );
};
