import React from 'react';
import {Composition} from 'remotion';
import {OfferVideo} from './OfferVideo';

const sample = {
  title: 'Fone Bluetooth com cancelamento de ruído',
  store: 'Loja exemplo • Dados fictícios',
  oldPrice: 299.9,
  price: 179.9,
  coupon: 'RADARDEMO',
  cta: 'Ver oferta demonstrativa',
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="RadarOfferVideo" component={OfferVideo} durationInFrames={450} fps={30} width={1080} height={1920} defaultProps={sample} />
    <Composition id="RadarOfferVideoLandscape" component={OfferVideo} durationInFrames={450} fps={30} width={1920} height={1080} defaultProps={sample} />
  </>
);
