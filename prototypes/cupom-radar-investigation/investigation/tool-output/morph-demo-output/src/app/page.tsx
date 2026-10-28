import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Radar de Ofertas — Protótipo de investigação',
  description: 'Protótipo local para investigar os fluxos públicos do Cupom Radar.',
  alternates: { canonical: 'http://127.0.0.1:4175/' },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* TODO: Add extracted components for / */}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          Radar de Ofertas — Protótipo de investigação — clone components go here
        </p>
      </div>
    </main>
  );
}
