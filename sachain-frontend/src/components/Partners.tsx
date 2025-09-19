import Image from 'next/image';



export function Partners() {
  return (
    <section className="py-6 lg:py-8 px-4 lg:px-8 bg-brand-surface/50">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
          {/* Title */}
          <div className="flex-shrink-0">
            <h2 className="text-xl lg:text-4xl font-black text-foreground text-center">
              Partners
            </h2>
          </div>
          
          {/* Partners Image */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-lg p-4 lg:p-6 shadow-md border border-border">
               <Image
          src="/images/partner.png"
          alt="Trusted Partners - Orange Digital Center and Hedera Network"
          width={500}
          height={80}
          className="object-contain"
        />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}