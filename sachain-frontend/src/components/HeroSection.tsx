import { ArrowRight, Play } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

export function HeroSection() {
  return (
    <section className="relative py-12 lg:py-20 px-4 lg:px-8 overflow-hidden bg-hero-svg">
      {/* Background Pattern */}

      <div className="absolute inset-0 -z-10">
        <ImageWithFallback
          src="/images/background.png"
          alt="Background image"
          className="object-cover object-center opacity-30"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-light/30 to-transparent pointer-events-none" />

      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8 lg:space-y-12">
            {/* Powered by Hedera badge */}
            <div className="inline-flex items-center gap-3 bg-brand-light rounded-lg shadow-sm px-4 py-3 border border-primary/10">
              {/* Replace with your svg or icon */}
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 18 20"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    className="text-primary"
                    d="M10 1L5 16H17L10 1Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-primary">
                Powered by <span className="font-bold">HEDERA NETWORK</span>
              </p>
            </div>

            {/* Headings */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                Powering Africa’s
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                <span className="text-primary">Innovation</span>{' '}
                <span className="text-secondary">Future</span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Connect African entrepreneurs with global investors through
              blockchain-powered crowdfunding. Secure, transparent, and built on
              the HEDERA network with HBAR transactions.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
              <button className="group bg-secondary hover:bg-secondary/90 text-primary-foreground rounded-lg px-8 py-4 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 flex items-center justify-center gap-2">
                Start Investing
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 py-4 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Watch Demo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-12 border-t border-border max-w-4xl mx-auto">
              <div className="text-center space-y-2">
                <div className="text-3xl lg:text-4xl font-black text-primary">
                  54
                </div>
                <div className="text-sm lg:text-base text-muted-foreground">
                  African countries
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl lg:text-4xl font-black text-primary">
                  500K+
                </div>
                <div className="text-sm lg:text-base text-muted-foreground">
                  Startups ready
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl lg:text-4xl font-black text-primary">
                  200M+
                </div>
                <div className="text-sm lg:text-base text-muted-foreground">
                  Diaspora network
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-2xl">
              <ImageWithFallback
                src="/images/image_1.png"
                alt="Startup Innovation"
                className="rounded-2xl shadow-2xl w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>

            {/* Floating Cards */}
            <div className="absolute -left-4 lg:-left-8 top-16 transform -rotate-3">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-border shadow-lg p-4 w-48">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-light rounded-lg w-12 h-12 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      viewBox="0 0 50 50"
                    >
                      <path d="M0 0h50v50H0z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      $2.3B Gap
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Funding needed
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 lg:-right-8 bottom-16 transform rotate-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-border shadow-lg p-4 w-48">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary rounded-lg w-12 h-12 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 50 50"
                    >
                      <path d="M0 0h50v50H0z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      1M+ Ideas
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Waiting for funding
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
      </div>
    </section>
  );
}
